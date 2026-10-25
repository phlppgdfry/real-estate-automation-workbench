import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { catalog } from '../src/seed';
mkdirSync('var', { recursive: true, mode: 0o700 });
if (!existsSync('.env.local'))
  writeFileSync(
    '.env.local',
    `APP_TOKEN=${randomBytes(24).toString('hex')}\nWEBHOOK_SECRET=${randomBytes(24).toString('hex')}\n`,
    { mode: 0o600 },
  );
if (!existsSync('var/catalog.json'))
  writeFileSync('var/catalog.json', JSON.stringify(catalog(), null, 2), { mode: 0o600 });
console.log(
  'Lokale secrets en fictieve catalogus aangemaakt waar ze ontbraken. Geen secrets weergegeven.',
);
