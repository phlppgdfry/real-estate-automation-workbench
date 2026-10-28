import { randomUUID } from 'node:crypto';
import type { Store } from './store';
import { DomainError } from '../src/domain';
export type RunBudget = {
  dailyTokens: number;
  reservationTokens: number;
  totalTokenPriceCapMicrosPerMillion?: number;
  dailyCostCapMicros?: number;
};
export const defaultBudget: RunBudget = { dailyTokens: 150000, reservationTokens: 25000 };
export class RunLedger {
  constructor(
    private store: Store,
    private budget: RunBudget = defaultBudget,
  ) {
    if (
      (budget.totalTokenPriceCapMicrosPerMillion !== undefined &&
        (!Number.isSafeInteger(budget.totalTokenPriceCapMicrosPerMillion) ||
          budget.totalTokenPriceCapMicrosPerMillion < 1)) ||
      (budget.dailyCostCapMicros !== undefined &&
        (!Number.isSafeInteger(budget.dailyCostCapMicros) ||
          budget.dailyCostCapMicros < 1 ||
          !budget.totalTokenPriceCapMicrosPerMillion))
    )
      throw Error('INVALID_COST_BUDGET');
    if (
      !Number.isSafeInteger(budget.dailyTokens) ||
      !Number.isSafeInteger(budget.reservationTokens) ||
      budget.reservationTokens < 1 ||
      budget.dailyTokens < budget.reservationTokens
    )
      throw Error('INVALID_RUN_BUDGET');
  }
  start(tool: string, actor: string, leadId: string | null, model: string, now: string) {
    return this.store.transaction(() => {
      const usage = this.usage(now);
      const spent = usage.chargedTokens;
      if (
        this.budget.dailyCostCapMicros &&
        usage.budgetedCostMicros !== null &&
        usage.budgetedCostMicros + this.costCeiling(this.budget.reservationTokens)! >
          this.budget.dailyCostCapMicros
      )
        throw new DomainError('BUDGET', 'Geconfigureerd kostenplafond bereikt.');
      if (spent + this.budget.reservationTokens > this.budget.dailyTokens)
        throw new DomainError('BUDGET', 'Dagbudget bereikt; geen nieuwe modelrun gestart.');
      const id = randomUUID();
      this.store.db
        .prepare(
          'INSERT INTO ai_runs(id,tool,lead_id,actor,state,started_at,model,prompt_version,reserved_tokens) VALUES(?,?,?,?,?,?,?,?,?)',
        )
        .run(
          id,
          tool,
          leadId,
          actor,
          'running',
          now,
          model,
          'connected-v3',
          this.budget.reservationTokens,
        );
      return id;
    });
  }
  finish(
    id: string,
    state: 'succeeded' | 'failed' | 'paused',
    now: string,
    result?: unknown,
    errorCode?: string,
    from: 'running' | 'paused' = 'running',
  ) {
    const previous = this.store.db
      .prepare('SELECT started_at,state FROM ai_runs WHERE id=?')
      .get(id) as { started_at: string; state: string } | undefined;
    if (!previous || previous.state !== from)
      throw new DomainError('RUN_STATE', 'Run is al afgerond.');
    const meta = (result as { run?: { totalTokens?: number; workflowRunId?: string } } | undefined)
      ?.run;
    const tokens =
      Number.isSafeInteger(meta?.totalTokens) && meta!.totalTokens! >= 0
        ? meta!.totalTokens!
        : null;
    // A configured maximum rate bounds cost; it is never presented as a provider invoice.
    this.store.db
      .prepare(
        'UPDATE ai_runs SET state=?,finished_at=?,elapsed_ms=?,total_tokens=?,estimated_cost_micros=?,error_code=?,result=?,provider_run_id=COALESCE(?,provider_run_id) WHERE id=? AND state=?',
      )
      .run(
        state,
        now,
        Math.max(0, Date.parse(now) - Date.parse(previous.started_at)),
        tokens,
        tokens === null ? null : this.costCeiling(tokens),
        errorCode ?? null,
        result ? JSON.stringify(result) : null,
        meta?.workflowRunId ?? null,
        id,
        from,
      );
  }
  usage(now: string) {
    const rows = this.store.db
      .prepare(
        'SELECT state,total_tokens,reserved_tokens,elapsed_ms FROM ai_runs WHERE started_at>=?',
      )
      .all(now.slice(0, 10) + 'T00:00:00.000Z') as {
      state: string;
      total_tokens: number | null;
      reserved_tokens: number;
      elapsed_ms: number | null;
    }[];
    return {
      dailyLimit: this.budget.dailyTokens,
      chargedTokens: rows.reduce((n, r) => n + (r.total_tokens ?? r.reserved_tokens), 0),
      actualTokens: rows.reduce((n, r) => n + (r.total_tokens ?? 0), 0),
      unreportedUsageRuns: rows.filter((r) => r.total_tokens === null).length,
      runs: rows.length,
      failed: rows.filter((r) => r.state === 'failed').length,
      averageMs: rows.length
        ? Math.round(rows.reduce((n, r) => n + (r.elapsed_ms ?? 0), 0) / rows.length)
        : 0,
      budgetedCostMicros: this.costCeiling(
        rows.reduce((n, r) => n + (r.total_tokens ?? r.reserved_tokens), 0),
      ),
      costStatus: this.budget.totalTokenPriceCapMicrosPerMillion
        ? 'upper-bound-using-configured-total-token-price-cap-not-an-invoice'
        : 'unknown-until-provider-usage-and-price-configured',
    };
  }
  private costCeiling(tokens: number): number | null {
    if (!this.budget.totalTokenPriceCapMicrosPerMillion) return null;
    const value =
      (BigInt(tokens) * BigInt(this.budget.totalTokenPriceCapMicrosPerMillion) + 999999n) /
      1000000n;
    if (value > BigInt(Number.MAX_SAFE_INTEGER)) throw Error('COST_OVERFLOW');
    return Number(value);
  }
  list(leadId?: string) {
    return this.store.db
      .prepare(
        'SELECT id,tool,lead_id,state,started_at,finished_at,elapsed_ms,model,prompt_version,total_tokens,estimated_cost_micros,error_code,provider_run_id FROM ai_runs WHERE (? IS NULL OR lead_id=?) ORDER BY started_at DESC LIMIT 100',
      )
      .all(leadId ?? null, leadId ?? null);
  }
  recover(now: string) {
    this.store.db
      .prepare(
        "UPDATE ai_runs SET state='failed',finished_at=?,error_code='PROCESS_INTERRUPTED' WHERE state='running' AND started_at<?",
      )
      .run(now, new Date(Date.parse(now) - 120000).toISOString());
  }
}
