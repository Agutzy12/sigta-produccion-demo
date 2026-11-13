import { defineConfig, devices } from '@playwright/test';

/**
 * Pruebas de punta a punta: abren el navegador y recorren la demo como lo haría una persona.
 * Antes: `npm run build` (en la raíz). Levanta el servidor solo si no está corriendo.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_URL ?? 'http://localhost:3000',
    locale: 'es-AR',
    timezoneId: 'America/Argentina/Cordoba',
    trace: 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1400, height: 900 } } }],
  // Con E2E_URL se prueba un servidor ya publicado (por ejemplo, la dirección de Vercel); si no, se levanta el local.
  webServer: process.env.E2E_URL ? undefined : {
    command: 'npm --prefix .. run start',
    url: 'http://localhost:3000/api/salud',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
