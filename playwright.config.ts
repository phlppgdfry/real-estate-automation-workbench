import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'tests/browser',
  use: {
    baseURL: 'http://127.0.0.1:5187/real-estate-automation-workbench/',
    browserName: 'chromium',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:5187/real-estate-automation-workbench/',
    reuseExistingServer: !process.env.CI,
  },
  reporter: 'list',
});
