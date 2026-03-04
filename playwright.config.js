const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './demo',
  timeout: 45_000,
  retries: 0,
  use: {
    baseURL: 'http://127.0.0.1:5173',
    viewport: { width: 1366, height: 768 },
    video: 'on',
    trace: 'off',
    screenshot: 'off'
  },
  webServer: {
    command: 'npm start',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: true,
    timeout: 120_000
  },
  reporter: [['list']]
});
