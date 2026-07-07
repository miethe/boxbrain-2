import { defineConfig, devices } from "@playwright/test";

const apiPort = process.env.BOXBRAIN_API_E2E_PORT ?? "18080";
const webPort = process.env.BOXBRAIN_WEB_E2E_PORT ?? "3300";
const apiBaseUrl = `http://127.0.0.1:${apiPort}`;
const webBaseUrl = `http://127.0.0.1:${webPort}`;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: {
    timeout: 5_000
  },
  use: {
    baseURL: webBaseUrl,
    trace: "on-first-retry"
  },
  webServer: [
    {
      command: `cd ../../services/api && uv run uvicorn app.main:app --host 127.0.0.1 --port ${apiPort}`,
      url: `${apiBaseUrl}/api/health`,
      reuseExistingServer: false,
      timeout: 30_000
    },
    {
      command: `BOXBRAIN_API_PROXY_TARGET=${apiBaseUrl} NEXT_PUBLIC_API_BASE_URL=${apiBaseUrl} next start --hostname 127.0.0.1 --port ${webPort}`,
      url: webBaseUrl,
      reuseExistingServer: false,
      timeout: 30_000
    }
  ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});
