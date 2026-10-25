import { execFileSync } from 'node:child_process';

const checks: { name: string; ok: boolean; detail: string }[] = [];

function commandExists(command: string): boolean {
  try {
    execFileSync('sh', ['-lc', `command -v ${command}`], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

checks.push({
  name: 'difyctl',
  ok: commandExists('difyctl'),
  detail: commandExists('difyctl')
    ? 'CLI gevonden'
    : 'Installeer difyctl via de officiële installer',
});
checks.push({
  name: 'workflow API key',
  ok: Boolean(process.env.DIFY_WORKFLOW_API_KEY),
  detail: process.env.DIFY_WORKFLOW_API_KEY
    ? 'ingesteld (waarde verborgen)'
    : 'niet ingesteld; rules fallback blijft actief',
});
checks.push({
  name: 'API base URL',
  ok: !process.env.DIFY_API_BASE_URL || /^https:\/\//.test(process.env.DIFY_API_BASE_URL),
  detail: process.env.DIFY_API_BASE_URL ?? 'standaard https://api.dify.ai',
});

for (const check of checks)
  console.log(`${check.ok ? 'PASS' : 'INFO'}  ${check.name}: ${check.detail}`);
console.log(
  `\nDify mode: ${process.env.DIFY_WORKFLOW_API_KEY ? 'workflow provider' : 'deterministic rules fallback'}`,
);
if (!checks.every((check) => check.ok || check.name === 'workflow API key')) process.exitCode = 1;
