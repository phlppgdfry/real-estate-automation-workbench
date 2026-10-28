import { spawnSync } from 'node:child_process';
const checks = [
  { name: 'Node.js 24+', ok: Number(process.versions.node.split('.')[0]) >= 24, required: true },
  ...[
    ['python3', ['--version']],
    ['pdftotext', ['-v']],
    ['pdftoppm', ['-v']],
    ['tesseract', ['--list-langs']],
  ].map(([command, args]) => {
    const result = spawnSync(command as string, args as string[], {
      encoding: 'utf8',
      timeout: 10000,
    });
    return {
      name: command as string,
      ok: result.status === 0 && (command !== 'tesseract' || /\beng\b/.test(result.stdout)),
      required: process.argv.includes('--require-documents'),
    };
  }),
];
for (const check of checks)
  console.log(
    `${check.ok ? 'PASS' : 'MISSING'} ${check.name}${check.required ? ' (required)' : ' (document extraction)'}`,
  );
if (checks.some((check) => check.required && !check.ok)) process.exitCode = 1;
