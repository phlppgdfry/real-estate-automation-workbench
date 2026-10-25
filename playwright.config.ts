import { defineConfig } from '@playwright/test';
const port = Number(process.env.UI_PORT ?? 5187);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid UI_PORT');
export default defineConfig({
  testDir: 'tests/browser',
  use: {
    baseURL: `http://127.0.0.1:${port}/real-estate-automation-workbench/`,
    browserName: 'chromium',
  },
  webServer: {
    command: `npm run dev -- --port ${port}`,
    url: `http://127.0.0.1:${port}/real-estate-automation-workbench/`,
    reuseExistingServer: !process.env.CI,
  },
  reporter: 'list',
});
