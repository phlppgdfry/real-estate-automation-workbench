import {
  mkdtempSync,
  cpSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
  existsSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';

const root = process.cwd();
const dir = mkdtempSync(join(tmpdir(), 'duin-clean-install-'));
const env = Object.fromEntries(
  Object.entries(process.env).filter(
    ([key]) =>
      !/KEY|TOKEN|SECRET|PASSWORD|DIFY|OPENAI|CRM_TEST_URL|NODE_OPTIONS|PORT|LAB_API_URL/.test(key),
  ),
);
let server: ReturnType<typeof spawn> | undefined;
const checks: string[] = [];
try {
  const files = execFileSync('git', ['ls-files', '-co', '--exclude-standard', '-z'], {
    encoding: 'utf8',
  })
    .split('\0')
    .filter(Boolean);
  for (const file of new Set(files)) {
    if (!existsSync(file)) continue;
    mkdirSync(dirname(join(dir, file)), { recursive: true });
    cpSync(file, join(dir, file));
  }
  if (existsSync(join(dir, '.env.local')) || existsSync(join(dir, 'var')))
    throw Error('CLEAN_COPY_CONTAINS_STATE');
  checks.push('source copied without .env, database, node_modules or git metadata');
  const run = (args: string[]) =>
    execFileSync('npm', args, { cwd: dir, env, timeout: 180000, stdio: 'pipe' });
  run(['ci', '--offline']);
  checks.push('npm ci --offline');
  run(['run', 'setup:local']);
  checks.push('fresh local credentials and catalogue');
  run(['run', 'build']);
  checks.push('TypeScript and production build');
  run(['run', 'drill']);
  checks.push('restart and recovery drill');
  // Reserve a free local port; use a dedicated child with no inherited provider credentials.
  const probe = createServer();
  probe.listen(0, '127.0.0.1');
  await once(probe, 'listening');
  const port = (probe.address() as { port: number }).port;
  await new Promise<void>((resolve) => probe.close(() => resolve()));
  server = spawn(
    process.execPath,
    ['--import', 'tsx', '--env-file=.env.local', 'server/index.ts'],
    { cwd: dir, env: { ...env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'] },
  );
  let ready = false;
  server.stdout!.on('data', (chunk: Buffer) => {
    if (chunk.toString().includes('API:')) ready = true;
  });
  const deadline = Date.now() + 15000;
  while (!ready && Date.now() < deadline && server.exitCode === null)
    await new Promise((resolve) => setTimeout(resolve, 50));
  if (!ready) throw Error('CLEAN_SERVER_NOT_READY');
  execFileSync(
    process.execPath,
    ['--import', 'tsx', '--env-file=.env.local', 'scripts/demo-api.ts'],
    {
      cwd: dir,
      env: { ...env, LAB_API_URL: `http://127.0.0.1:${port}` },
      timeout: 30000,
      stdio: 'pipe',
    },
  );
  checks.push(
    'signed receipt → rule analysis → human approval → durable mock receipt over real HTTP',
  );
  const response = await fetch(`http://127.0.0.1:${port}/real-estate-automation-workbench/`);
  if (!response.ok || !(await response.text()).includes('Duin & Dorp'))
    throw Error('CLEAN_STATIC_APP');
  checks.push('production frontend served by local API');
  mkdirSync(join(root, 'var'), { recursive: true });
  writeFileSync(
    join(root, 'var/install-verification.json'),
    JSON.stringify(
      {
        recordedAt: new Date().toISOString(),
        version: JSON.parse(readFileSync('package.json', 'utf8')).version,
        status: 'passed',
        checks,
        limitation:
          'Automated clean local installation. No new Dify workspace, provider request or independent human installation.',
      },
      null,
      2,
    ) + '\n',
  );
  console.log('PASS clean installation: ' + checks.join('; '));
} finally {
  if (server && server.exitCode === null) {
    server.kill('SIGTERM');
    await Promise.race([once(server, 'exit'), new Promise((resolve) => setTimeout(resolve, 3000))]);
    if (server.exitCode === null) {
      server.kill('SIGKILL');
      await once(server, 'exit');
    }
  }
  rmSync(dir, { recursive: true, force: true });
}
