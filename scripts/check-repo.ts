import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

const files = [
  ...new Set(
    execFileSync('git', ['ls-files', '-co', '--exclude-standard', '-z'], { encoding: 'utf8' })
      .split('\0')
      .filter(Boolean),
  ),
];
const localSecrets = existsSync('.env.local')
  ? readFileSync('.env.local', 'utf8')
      .split('\n')
      .flatMap((line) => {
        const pair = line.match(/^([A-Z_0-9]*(?:KEY|TOKEN|SECRET|PASSWORD)[A-Z_0-9]*)=(.*)$/);
        const value = pair?.[2].trim().replace(/^['"]|['"]$/g, '');
        return value && value.length >= 12 ? [Buffer.from(value)] : [];
      })
  : [];
const patterns = [
  /(?:sk-(?:proj-)?[A-Za-z0-9_-]{30,}|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|app-[A-Za-z0-9]{30,})/,
];
const problems = [];
for (const file of files) {
  if (!existsSync(file)) continue;
  if (/^(?:\.env(?:\.|$)|var\/)|\.(?:sqlite(?:-wal|-shm)?|ifpkg)$/.test(file))
    problems.push(file + ': local state');
  const bytes = readFileSync(file);
  if (localSecrets.some((secret) => bytes.includes(secret)))
    problems.push(file + ': configured secret');
  if (patterns.some((pattern) => pattern.test(bytes.toString('utf8'))))
    problems.push(file + ': credential pattern');
}
for (const [source, published] of [
  ['data/benchmark-report.json', 'public/dify/benchmark.json'],
  ['data/trigger-verification.json', 'public/dify/trigger-verification.json'],
]) {
  if (
    JSON.stringify(JSON.parse(readFileSync(source, 'utf8'))) !==
    JSON.stringify(JSON.parse(readFileSync(published, 'utf8')))
  )
    problems.push(source + ': published evidence differs');
}
if (problems.length) throw Error('REPO_SCAN_FAILED\n' + problems.join('\n'));
console.log(
  `PASS public-file scan (${files.length} files); no configured secret or recognized credential pattern found.`,
);
