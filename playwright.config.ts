import { defineConfig } from '@playwright/test';

const backendPort = Number(process.env.PW_BACKEND_PORT ?? 3210);
const frontendPort = Number(process.env.PW_FRONTEND_PORT ?? 5184);

export default defineConfig({
  testDir: './e2e/specs',
  timeout: 30_000,
  fullyParallel: false,
  use: {
    baseURL: `http://localhost:${frontendPort}`,
    headless: true,
    trace: 'retain-on-failure'
  },
  webServer: [
    {
      command: `PORT=${backendPort} AUTO_SEED_ON_BOOT=true pnpm --filter insightboard-backend dev`,
      url: `http://localhost:${backendPort}/api/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000
    },
    {
      command: `VITE_DEV_API_TARGET=http://localhost:${backendPort} pnpm --filter insightboard-frontend exec vite --host localhost --port ${frontendPort}`,
      url: `http://localhost:${frontendPort}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000
    }
  ]
});
