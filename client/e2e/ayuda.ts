import { expect, type Page, request } from '@playwright/test';

/** Deja la base con los datos de ejemplo antes de empezar. */
export async function reiniciarDemo(baseURL: string) {
  const ctx = await request.newContext({ baseURL });
  const login = await ctx.post('/api/auth/login', { data: { email: 'produccion@sigta.demo', password: 'sigta2026' } });
  const { token } = await login.json();
  const r = await ctx.post('/api/demo/reset', { headers: { Authorization: `Bearer ${token}` }, timeout: 60_000 });
  expect(r.ok()).toBeTruthy();
  await ctx.dispose();
}

/** Entra con el acceso rápido de un rol desde la pantalla de ingreso. */
export async function ingresarComo(page: Page, cargo: RegExp) {
  await page.goto('/ingresar');
  await page.getByRole('button', { name: cargo }).click();
  await expect(page.getByRole('heading', { name: 'Panel de producción' })).toBeVisible();
}
