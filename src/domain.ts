import { z } from 'zod';

export const IntakeSchema = z
  .object({
    eventId: z.string().regex(/^[a-zA-Z0-9_-]{3,80}$/),
    name: z.string().trim().min(2).max(100),
    email: z.email().max(200),
    message: z.string().trim().min(10).max(4000),
    channel: z.enum(['website', 'email', 'portal']),
  })
  .strict();
export type Intake = z.infer<typeof IntakeSchema>;
export const ExtractionSchema = z
  .object({
    intent: z.enum(['visit', 'valuation', 'search', 'unknown']),
    reference: z.string().nullable(),
    evidence: z.string().max(300),
  })
  .strict();
export type Extraction = z.infer<typeof ExtractionSchema>;
export const ListingSchema = z
  .object({
    id: z.string().regex(/^DD-\d{3}$/),
    title: z.string().min(1),
    city: z.string().min(1),
    price: z.number().positive(),
    status: z.enum(['available', 'sold']),
    checkedAt: z.iso.datetime(),
  })
  .strict();
export type Listing = z.infer<typeof ListingSchema>;
export type Status = 'review' | 'manual' | 'queued' | 'synced' | 'dead';
export type Audit = { at: string; action: string; detail: string };
export type Lead = Intake & {
  id: string;
  version: number;
  receivedAt: string;
  status: Status;
  extraction: Extraction;
  reasons: string[];
  draft: string;
  approvedBy?: string;
  approvedAt?: string;
  attempts: number;
  nextAttemptAt?: string;
  audit: Audit[];
};
export const LeadSchema = IntakeSchema.extend({
  id: z.string(),
  version: z.number().int().positive(),
  receivedAt: z.iso.datetime(),
  status: z.enum(['review', 'manual', 'queued', 'synced', 'dead']),
  extraction: ExtractionSchema,
  reasons: z.array(z.string()),
  draft: z.string(),
  approvedBy: z.string().optional(),
  approvedAt: z.iso.datetime().optional(),
  attempts: z.number().int().nonnegative(),
  nextAttemptAt: z.iso.datetime().optional(),
  audit: z.array(
    z.object({ at: z.iso.datetime(), action: z.string(), detail: z.string() }).strict(),
  ),
});
export const intentLabels = {
  visit: 'Bezoekaanvraag',
  valuation: 'Schatting',
  search: 'Zoekprofiel',
  unknown: 'Onvolledige aanvraag',
};
export const statusLabels: Record<Status, string> = {
  review: 'Te beoordelen',
  manual: 'Handmatig',
  queued: 'CRM-wachtrij',
  synced: 'Afgehandeld',
  dead: 'Interventie nodig',
};
export class DomainError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
const money = (n: number) =>
  new Intl.NumberFormat('nl-BE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n);
export function extractRules(message: string): Extraction {
  const visit = /bezoek|bezichtig|visit|viewing/i.exec(message);
  const valuation = /schatting|verkopen|valuation|sell my/i.exec(message);
  const search = /\bzoek\b|op zoek|looking for|search/i.exec(message);
  if (ambiguousRequest(message))
    return {
      intent: 'unknown',
      reference: message.match(/\bDD-\d{3}\b/i)?.[0].toUpperCase() ?? null,
      evidence: '',
    };
  const matched = visit || valuation || search;
  return {
    intent: visit ? 'visit' : valuation ? 'valuation' : search ? 'search' : 'unknown',
    reference: message.match(/\bDD-\d{3}\b/i)?.[0].toUpperCase() ?? null,
    evidence: matched?.[0] ?? '',
  };
}
function ambiguousRequest(message: string): boolean {
  const negated =
    /(?:\bniet\b|\bgeen\b|\bnot\b|don't)[\s\S]{0,30}(?:bezoek|bezichtig|visit|viewing)|(?:bezoek|bezichtig|visit|viewing)[\s\S]{0,32}(?:\bniet\b|\bnot\b)/i.test(
      message,
    );
  const intentCount = [
    /bezoek|bezichtig|visit|viewing/i,
    /schatting|verkopen|valuation|sell my/i,
    /\bzoek\b|op zoek|looking for|search/i,
  ].filter((pattern) => pattern.test(message)).length;
  const references = new Set(
    (message.match(/\bDD-\d{3}\b/gi) ?? []).map((ref) => ref.toUpperCase()),
  );
  return negated || intentCount > 1 || references.size > 1;
}
export function validateExtraction(raw: unknown, message: string): Extraction {
  const e = ExtractionSchema.parse(raw);
  if (
    (e.intent !== 'unknown' && !e.evidence.trim()) ||
    (e.evidence && !message.includes(e.evidence))
  )
    throw new DomainError('EVIDENCE', 'Analyse bevat geen controleerbaar broncitaat.');
  if (
    e.reference &&
    (!/^DD-\d{3}$/.test(e.reference) || !message.toUpperCase().includes(e.reference))
  )
    throw new DomainError('REFERENCE', 'Pandreferentie staat niet in de aanvraag.');
  return e;
}
export function assess(
  input: Intake,
  extraction: Extraction,
  listings: Listing[],
  now: string,
): { reasons: string[]; draft: string } {
  const reasons: string[] = [];
  const rules = extractRules(input.message);
  // A heuristic is an additional stop signal, never a promise to detect every injection.
  if (
    /ignore|negeer|system prompt|systeeminstruct|api.?key|geheim|<script|javascript:|export.*klant/i.test(
      input.message,
    )
  )
    reasons.push('Verdachte instructie in brontekst; menselijke beoordeling vereist.');
  if (extraction.intent === 'unknown') reasons.push('Doel van de aanvraag is onduidelijk.');
  if (ambiguousRequest(input.message) && extraction.intent !== 'unknown')
    reasons.push('Ontkenning of meerdere vragen: controleer de bedoeling handmatig.');
  if (rules.intent !== 'unknown' && rules.intent !== extraction.intent)
    reasons.push('Model en expliciete brontekst spreken elkaar tegen.');
  if (
    new Set((input.message.match(/\bDD-\d{3}\b/gi) ?? []).map((ref) => ref.toUpperCase())).size > 1
  )
    reasons.push('Meerdere pandreferenties: controleer de juiste koppeling.');
  if (extraction.intent === 'visit' && !extraction.reference)
    reasons.push('Pandreferentie ontbreekt.');
  const listing = listings.find((x) => x.id === extraction.reference);
  if (extraction.reference && !listing)
    reasons.push('Pandreferentie bestaat niet in de catalogus.');
  if (listing?.status === 'sold') reasons.push('Pand is verkocht; geen bezoek voorstellen.');
  if (
    listing &&
    (!Number.isFinite(Date.parse(listing.checkedAt)) ||
      Date.parse(now) - Date.parse(listing.checkedAt) > 86400000 ||
      Date.parse(listing.checkedAt) > Date.parse(now))
  )
    reasons.push('Pandgegevens zijn niet actueel; ververs de catalogus.');
  const greeting = `Dag ${input.name.split(' ')[0]},`;
  let body =
    extraction.intent === 'valuation'
      ? 'Bedankt voor je vraag om een schatting. Een collega neemt contact op om de woning en de volgende stappen te bespreken.'
      : extraction.intent === 'search'
        ? 'Bedankt voor je zoekvraag. Een collega bekijkt graag samen met je welke woonwensen we verder moeten verduidelijken.'
        : listing
          ? `Bedankt voor je interesse in de ${listing.title} in ${listing.city}. Een collega stemt graag een bezoekmoment met je af. De vraagprijs is ${money(listing.price)}.`
          : 'Bedankt voor je bericht. Een collega bekijkt je vraag en neemt contact op.';
  if (reasons.length)
    body = 'Bedankt voor je bericht. Een collega bekijkt je vraag en neemt contact op.';
  return {
    reasons,
    draft: `${greeting}\n\n${body}\n\nMet vriendelijke groeten,\nTeam Duin & Dorp`,
  };
}
export function createLead(
  raw: unknown,
  listings: Listing[],
  now: string,
  model?: Extraction,
): Lead {
  const input = IntakeSchema.parse(raw);
  const extraction = validateExtraction(model ?? extractRules(input.message), input.message);
  const result = assess(input, extraction, listings, now);
  return {
    ...input,
    id: input.eventId,
    version: 1,
    receivedAt: now,
    status: result.reasons.length ? 'manual' : 'review',
    extraction,
    ...result,
    attempts: 0,
    audit: [
      { at: now, action: 'received', detail: `Ontvangen via ${input.channel}` },
      {
        at: now,
        action: model ? 'model_analysis' : 'rules_analysis',
        detail: result.reasons.join(' ') || 'Bron gecontroleerd; antwoordvoorstel klaar.',
      },
    ],
  };
}
export function approve(
  lead: Lead,
  version: number,
  actor: string,
  listings: Listing[],
  now: string,
): Lead {
  if (lead.version !== version)
    throw new DomainError('VERSION', 'Deze aanvraag is gewijzigd. Herlaad vóór goedkeuring.');
  if (lead.status !== 'review')
    throw new DomainError('STATE', 'Alleen een gecontroleerd voorstel kan worden goedgekeurd.');
  if (!actor.trim()) throw new DomainError('ACTOR', 'Een beoordelaar is verplicht.');
  const current = assess(lead, lead.extraction, listings, now);
  if (current.reasons.length || current.draft !== lead.draft)
    throw new DomainError(
      'STALE',
      'Brongegevens zijn gewijzigd. Analyseer opnieuw vóór goedkeuring.',
    );
  return {
    ...lead,
    version: lead.version + 1,
    status: 'queued',
    approvedBy: actor,
    approvedAt: now,
    audit: [
      ...lead.audit,
      {
        at: now,
        action: 'approved',
        detail: `${actor}: voorstel gecontroleerd; klaargezet voor CRM. Geen e-mail verstuurd.`,
      },
    ],
  };
}
export function manual(lead: Lead, now: string): Lead {
  if (lead.status !== 'review')
    throw new DomainError('STATE', 'Deze aanvraag is al in behandeling.');
  return {
    ...lead,
    version: lead.version + 1,
    status: 'manual',
    audit: [
      ...lead.audit,
      { at: now, action: 'manual', detail: 'Medewerker neemt de opvolging over.' },
    ],
  };
}
export function deliver(lead: Lead, fail: boolean, now: string): Lead {
  if (lead.status !== 'queued') throw new DomainError('STATE', 'Geen overdracht klaar.');
  if (lead.nextAttemptAt && Date.parse(now) < Date.parse(lead.nextAttemptAt))
    throw new DomainError('BACKOFF', 'Wacht tot de volgende poging.');
  const attempts = lead.attempts + 1;
  return {
    ...lead,
    version: lead.version + 1,
    attempts,
    status: fail ? (attempts >= 3 ? 'dead' : 'queued') : 'synced',
    nextAttemptAt:
      fail && attempts < 3
        ? new Date(Date.parse(now) + 1000 * 2 ** attempts).toISOString()
        : undefined,
    audit: [
      ...lead.audit,
      {
        at: now,
        action: fail ? 'crm_failed' : 'crm_acknowledged',
        detail: fail
          ? `Poging ${attempts}/3 mislukt; ${attempts >= 3 ? 'beheerder moet ingrijpen.' : 'opnieuw proberen na wachttijd.'}`
          : 'CRM-mock bevestigt ontvangst; geen e-mail verstuurd.',
      },
    ],
  };
}
export function requeue(
  lead: Lead,
  version: number,
  actor: string,
  reason: string,
  listings: Listing[],
  now: string,
): Lead {
  if (lead.version !== version) throw new DomainError('VERSION', 'Deze aanvraag is gewijzigd.');
  if (lead.status !== 'dead' || !lead.approvedBy)
    throw new DomainError(
      'STATE',
      'Alleen een eerder goedgekeurde mislukte overdracht kan hersteld worden.',
    );
  if (!actor.trim() || reason.trim().length < 10 || reason.length > 500)
    throw new DomainError('REASON', 'Geef een herstelreden van 10 tot 500 tekens.');
  const current = assess(lead, lead.extraction, listings, now);
  if (current.reasons.length || current.draft !== lead.draft)
    throw new DomainError('STALE', 'Pandgegevens zijn gewijzigd; hernieuwde beoordeling is nodig.');
  return {
    ...lead,
    version: lead.version + 1,
    status: 'queued',
    attempts: 0,
    nextAttemptAt: undefined,
    audit: [
      ...lead.audit,
      {
        at: now,
        action: 'crm_requeued',
        detail: `${actor}: ${reason.trim()}. Vorige pogingen blijven in dit log.`,
      },
    ],
  };
}
