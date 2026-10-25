import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync, readFileSync, chmodSync } from 'node:fs';
import { catalog } from '../src/seed';
mkdirSync('var',{recursive:true,mode:0o700});
let env=existsSync('.env.local')?readFileSync('.env.local','utf8'):'';
for(const key of ['REVIEWER_TOKEN','OPERATOR_TOKEN','READER_TOKEN','WEBHOOK_SECRET']){
  if(!new RegExp(`^${key}=.+$`,'m').test(env))env+=`${env&&!env.endsWith('\n')?'\n':''}${key}=${randomBytes(24).toString('hex')}\n`;
}
writeFileSync('.env.local',env,{mode:0o600});chmodSync('.env.local',0o600);
if(!existsSync('var/catalog.json'))writeFileSync('var/catalog.json',JSON.stringify(catalog(),null,2),{mode:0o600});
console.log('Ontbrekende labsecrets veilig aangevuld. Bestaande waarden en catalogus behouden. Geen secrets weergegeven.');
