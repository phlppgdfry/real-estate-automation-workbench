import { mkdirSync } from 'node:fs';
import { crmTestService } from '../server/crm-test-service';
mkdirSync('var', { recursive: true });
const { server } = crmTestService('var/crm-http-test.sqlite');
server.listen(4340, '127.0.0.1', () =>
  console.log(
    'Fictional HTTP CRM test service: http://127.0.0.1:4340; no vendor/customer integration.',
  ),
);
