import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  retries: 1,
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'retain-on-failure',
  },
  webServer: {
    // Use dev server so the e2e test does not require a prior build step.
    // MOCK_LLM=1 replaces Ollama calls with deterministic offline fixtures.
    command: 'npm run dev',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: true,
    env: {
      MOCK_LLM: '1',
      PORT: '3000',
    },
    timeout: 90000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
