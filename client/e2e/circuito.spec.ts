/**
 * Recorre el guion de la demo completo en el navegador:
 * planificar → elaborar → controlar calidad → ingresar a depósito → trazar, con cada rol.
 */
import { expect, test } from '@playwright/test';
import { ingresarComo, reiniciarDemo } from './ayuda';

test.describe.configure({ mode: 'serial' });
test.beforeAll(async ({ baseURL }) => { await reiniciarDemo(baseURL!); });

test('la pantalla de ingreso explica qué es SIGTA y rechaza una contraseña incorrecta', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/ingresar/);
  await expect(page.getByRole('heading', { name: 'Sistema Integral de Gestión y Trazabilidad Alimentaria' })).toBeVisible();
  await expect(page.getByAltText('Agrifood Argentina')).toBeVisible();
  await page.getByLabel('Email').fill('calidad@sigta.demo');
  await page.getByLabel('Contraseña').fill('equivocada');
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await expect(page.getByText('Email o contraseña incorrectos')).toBeVisible();
  await page.getByLabel('Contraseña').fill('sigta2026');
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await expect(page.getByText('Lucía Benítez').first()).toBeVisible();
  await expect(page.getByTestId('tarea-sugerida')).toContainText('esperan tu análisis');
});

test('circuito completo: de la orden al stock vendible, con la trazabilidad final', async ({ page }) => {
  // 1) Planificar (Supervisor de producción)
  await ingresarComo(page, /Supervisor de producción/);
  await expect(page.locator('.marca')).toContainText('SIGTA');
  await expect(page.locator('.marca')).toContainText('Gestión y Trazabilidad Alimentaria');
  await page.getByRole('link', { name: /Nueva orden/ }).click();
  await expect(page.getByText('Paso 1 de 4 · Planificar orden')).toBeVisible();
  await expect(page.getByLabel('Producto terminado *')).toHaveValue('28'); // Coditos 500 g
  await expect(page.getByTestId('ficha-producto')).toContainText('Línea Pastas Secas');
  await page.getByLabel('Cantidad *').fill('1000');
  await expect(page.getByText('Sin faltantes')).toBeVisible();
  // con una cantidad enorme no deja planificar
  await page.getByLabel('Cantidad *').fill('100000');
  await expect(page.getByText('Hay faltantes críticos')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Confirmar y planificar' })).toBeDisabled();
  await page.getByLabel('Cantidad *').fill('1000');
  await expect(page.getByText('Sin faltantes')).toBeVisible();
  await page.getByRole('button', { name: 'Confirmar y planificar' }).click();

  // 2) Elaborar
  await expect(page).toHaveURL(/\/ejecucion\/\d+/);
  await page.getByRole('button', { name: 'Iniciar elaboración' }).click();
  await expect(page.getByText(/Elaboración iniciada · lote L-COD500-/)).toBeVisible();
  await expect(page.getByText('Todos los lotes son válidos')).toBeVisible();
  await expect(page.getByTestId('merma')).toContainText('2,97 %'); // 1.010 kg de sémola y harina → 980 kg de Coditos
  // pausar y reanudar la línea
  await page.getByRole('button', { name: 'Pausar línea' }).click();
  await expect(page.getByText(/Línea pausada ·/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Finalizar y enviar a Calidad' })).toBeDisabled();
  await page.getByRole('button', { name: 'Reanudar línea' }).click();
  await page.getByRole('button', { name: 'Finalizar y enviar a Calidad' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Finalizar y enviar a Calidad' }).click();
  await expect(page.getByRole('dialog', { name: 'Elaboración finalizada' })).toContainText('quedó en cuarentena');
  const lote = (await page.getByRole('dialog').locator('b').first().innerText()).match(/L-COD500-\d{6}-\d{2}/)![0];
  await page.getByRole('button', { name: 'Ir a Control de calidad' }).click();

  // 3) Controlar calidad: Producción no puede firmar; cambia a Técnica de calidad desde la guía
  await expect(page).toHaveURL(/\/calidad\/\d+/);
  await expect(page.getByRole('button', { name: 'Firmar protocolo' })).toBeDisabled();
  await page.getByRole('button', { name: /Cambiar a Técnico de calidad/ }).click();
  await expect(page.locator('header .usuario')).toContainText('Lucía Benítez');
  await expect(page.locator('.lote-item.sel')).toContainText(lote);
  // humedad fuera de especificación: no se puede aprobar
  await page.getByRole('button', { name: 'Cargar ejemplo' }).click();
  await page.locator('#humedad').fill('19');
  await expect(page.getByText('No se puede aprobar')).toBeVisible();
  await page.locator('#humedad').fill('12,4');
  await expect(page.getByText('6/6 conformes')).toBeVisible();
  await page.getByRole('button', { name: 'Firmar protocolo' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Firmar' }).click();
  await expect(page.getByRole('dialog', { name: 'Lote aprobado y liberado' })).toBeVisible();
  await page.getByRole('button', { name: 'Ir a Ingreso a depósito' }).click();

  // 4) Ingresar a depósito (Operario de depósito)
  await expect(page).toHaveURL(/\/deposito\/\d+/);
  await page.getByRole('button', { name: /Cambiar a Operario de depósito/ }).click();
  await expect(page.getByText('Liberación verificada')).toBeVisible();
  await expect(page.locator('#pallets')).toHaveValue('4'); // 1.960 paquetes, 600 por pallet (palletizado de la web)
  await page.getByRole('button', { name: 'Confirmar ingreso y cerrar OP' }).click();
  const confirmacion = page.getByRole('dialog', { name: 'Ingreso confirmado' });
  await expect(confirmacion).toContainText('Circuito completo');
  // las etiquetas GS1-128 se dibujan con su código de barras
  await expect(confirmacion.locator('.etiqueta')).toHaveCount(4);
  await expect(confirmacion.locator('.etiqueta svg').first()).toBeVisible();
  await expect(confirmacion.locator('.etiqueta').first()).toHaveAttribute('data-gs1', new RegExp(`\\(10\\)${lote}$`));
  await page.getByRole('button', { name: 'Ver trazabilidad' }).click();

  // 5) Trazabilidad del lote
  await expect(page.getByRole('heading', { name: 'Recorrido del lote' })).toBeVisible();
  await expect(page.locator('.recorrido')).toContainText('Aprobado y liberado');
  await expect(page.locator('.recorrido')).toContainText('Stock vendible');
  await expect(page.getByText('Molinos Florencia SAU').first()).toBeVisible();
  await page.getByText('Ver historial del lote (auditoría)').click();
  await expect(page.getByRole('cell', { name: 'Firma de protocolo de calidad' })).toBeVisible();
});

test('bloqueo lógico: un lote en cuarentena no se puede despachar', async ({ page }) => {
  await ingresarComo(page, /Operario de depósito/);
  await page.goto('/calidad');
  const lote = (await page.locator('.lote-item .cod').first().innerText()).trim();
  await page.goto(`/trazabilidad?q=${lote}`);
  await expect(page.locator('.recorrido')).toContainText('Pendiente');
  await page.getByRole('button', { name: /Registrar despacho de ejemplo/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Despachar' }).click();
  await expect(page.getByText(/Despacho bloqueado: el lote .* está en estado CUARENTENA/)).toBeVisible();
  await page.getByText('Ver historial del lote (auditoría)').click();
  await expect(page.getByRole('cell', { name: 'Intento de despacho bloqueado' })).toBeVisible();
});

test('rechazo: un lote fuera de especificación se bloquea y exige el motivo', async ({ page }) => {
  await ingresarComo(page, /Técnica de calidad/);
  await page.getByRole('link', { name: /Controlar calidad/ }).click();
  await page.getByRole('button', { name: 'Cargar ejemplo' }).click();
  await page.locator('#ufc').fill('45000');
  await page.locator('#obs').fill('');
  await page.getByLabel('Rechazar y bloquear').check();
  await page.getByRole('button', { name: 'Firmar protocolo' }).click();
  await expect(page.getByText('Para rechazar el lote escribí el motivo en las observaciones.')).toBeVisible();
  await page.locator('#obs').fill('Recuento microbiológico fuera de especificación.');
  await page.getByRole('button', { name: 'Firmar protocolo' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Firmar' }).click();
  await expect(page.getByRole('dialog', { name: 'Lote rechazado y bloqueado' })).toBeVisible();
  await page.getByRole('button', { name: 'Ver trazabilidad' }).click();
  await expect(page.locator('.tarjeta').first()).toContainText('Rechazado y bloqueado');
});

test('el catálogo es el de la web de Agrifood y permite planificar un producto', async ({ page }) => {
  await ingresarComo(page, /Supervisor de producción/);
  await page.locator('.sidebar').getByRole('link', { name: 'Catálogo de productos' }).click();
  await expect(page.getByRole('heading', { name: 'Catálogo de productos' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Todas · 31' })).toBeVisible();
  await page.getByRole('button', { name: /^Deshidratados · 9/ }).click();
  const fila = page.getByRole('row', { name: /Espinaca Deshidratada en Escamas/ });
  await expect(fila).toContainText('36 × 10 kg');
  await fila.getByRole('button', { name: 'Ficha y receta →' }).click();
  await expect(page.getByRole('dialog')).toContainText('Spinacea oleracea');
  await expect(page.getByRole('dialog')).toContainText('Espinaca fresca');
  await page.getByRole('dialog').getByRole('button', { name: 'Cerrar' }).click();
  await fila.getByRole('link', { name: 'Planificar →' }).click();
  await expect(page.getByLabel('Producto terminado *')).toHaveValue('3');
  await expect(page.getByLabel('Cantidad *')).toHaveValue('200');
  await expect(page.getByRole('link', { name: 'Ver en la web de Agrifood ↗' })).toHaveAttribute('href', 'https://agrifood-argentina.com/productos/deshidratados/espinaca-deshidratada-en-escamas.php');
});

test('se puede instalar como aplicación (manifest y service worker)', async ({ page, request }) => {
  const manifest = await (await request.get('/manifest.webmanifest')).json();
  expect(manifest).toMatchObject({ short_name: 'SIGTA', display: 'standalone', start_url: '/panel' });
  expect((await request.get('/icons/icono-512.png')).ok()).toBeTruthy();
  await page.goto('/ingresar');
  const registrado = await page.evaluate(async () => { const r = await navigator.serviceWorker.ready; return Boolean(r.active); });
  expect(registrado).toBe(true);
});

test('Gerencia sólo consulta: ve todo pero no puede registrar', async ({ page }) => {
  await ingresarComo(page, /Gerencia/);
  await expect(page.getByText('Modo de sólo lectura')).toBeVisible();
  await page.getByRole('link', { name: /Planificar orden/ }).click();
  await expect(page.getByRole('button', { name: 'Confirmar y planificar' })).toBeDisabled();
  await expect(page.getByText(/Estás como Gerencia: podés mirar/)).toBeVisible();
});

test('escanear una etiqueta GS1-128 lleva a la ficha del lote', async ({ page }) => {
  await ingresarComo(page, /Gerencia/);
  await page.getByRole('link', { name: 'Trazabilidad de lote' }).click();
  await page.getByRole('button', { name: 'Escanear código' }).click();
  const fila = page.getByRole('dialog').locator('tbody tr').first();
  const gs1 = (await fila.locator('.peq').innerText()).trim();
  const lote = gs1.split('(10)')[1];
  await fila.click();
  await expect(page.getByText(`Etiqueta leída: ${gs1}`)).toBeVisible();
  await expect(page.locator('.tarjeta').first()).toContainText(lote);
});

test('glosario, ayuda y modo oscuro', async ({ page }) => {
  await ingresarComo(page, /Supervisor de producción/);
  await page.locator('.kpi .termino').hover();
  await expect(page.getByRole('tooltip').filter({ hasText: 'Estado de un lote recién elaborado' })).toBeVisible();
  await page.getByRole('link', { name: '¿Cómo funciona SIGTA?' }).click();
  await expect(page.getByRole('heading', { name: 'El circuito en 4 pasos' })).toBeVisible();
  await expect(page.locator('.glosario')).toContainText('FEFO');
  await page.getByRole('button', { name: 'Cambiar a modo oscuro' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-tema', 'oscuro');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-tema', 'oscuro');
  await expect(page.getByAltText('Agrifood Argentina')).toHaveAttribute('src', '/img/logo-oscuro.png');
});

test('en el celular el menú se despliega y no hay desplazamiento horizontal', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ingresarComo(page, /Supervisor de producción/);
  const ancho = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(ancho).toBeLessThanOrEqual(390);
  await page.getByRole('button', { name: 'Abrir menú' }).click();
  await page.locator('.sidebar').getByRole('link', { name: /Elaborar/ }).click();
  await expect(page.getByRole('heading', { name: 'Elaborar' })).toBeVisible();
});
