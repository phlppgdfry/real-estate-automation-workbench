import { difyBaseUrl } from '../server/dify';
let ok = true;
for (const [name, env] of [
  ['aanvraaganalyse', 'DIFY_WORKFLOW_API_KEY'],
  ['dossierassistent', 'DIFY_AGENT_API_KEY'],
  ['documentcontrole', 'DIFY_DOCUMENT_API_KEY'],
  ['native Agentvergelijking', 'DIFY_COMPARISON_API_KEY'],
]) {
  const present = Boolean(process.env[env]);
  ok &&= present;
  console.log(
    `${present ? 'PASS' : 'MISSING'} ${name}: ${present ? 'sleutel ingesteld (verborgen)' : `zet ${env} in .env.local`}`,
  );
}
try {
  difyBaseUrl(process.env.DIFY_API_BASE_URL);
  console.log('PASS API URL geldig');
} catch {
  ok = false;
  console.log('FAIL API URL ongeldig');
}
console.log(
  'difyctl is niet nodig: importeer de DSL in Studio en publiceer elke app. Dit controleert configuratie; npm run dify:smoke controleert echte runs.',
);
if (!ok) process.exitCode = 1;
