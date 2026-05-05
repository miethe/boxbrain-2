import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: {
    timeout: 5_000
  },
  use: {
    baseURL: "http://127.0.0.1:3300",
    trace: "on-first-retry"
  },
  webServer: [
    {
      command: "cd ../../services/api && uv run uvicorn app.main:app --host 127.0.0.1 --port 18080",
      url: "http://127.0.0.1:18080/api/health",
      reuseExistingServer: false,
      timeout: 30_000
    },
    {
      command: "NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:18080 next start --hostname 127.0.0.1 --port 3300",
      url: "http://127.0.0.1:3300",
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
