/**
 * Pruebas del circuito completo de producción (CU-P01 a CU-P04) contra PostgreSQL real.
 * Corren con:  npm test
 */
import { beforeAll, afterAll, describe, expect, test } from 'vitest';
import { prisma } from '../src/db.js';
import { cargarDatosDeEjemplo } from '../src/seed/seed.js';
import { api, type RolPrueba } from './ayuda.js';

const PROD: RolPrueba = 'PRODUCCION', CAL: RolPrueba = 'CALIDAD', DEP: RolPrueba = 'DEPOSITO', DIR: RolPrueba = 'DIRECCION';
const hoy = () => new Date().toLocaleDateString('sv-SE'); // AAAA-MM-DD en hora local
const ensayoOk = { humedad: 12.4, ph: 6.2, aroma: 'Característico', color: 'Crema uniforme', sabor: 'Característico', ufc: 320 };
const ubicacion = { deposito: 'Producto terminado', sector: 'Secos · Ambiente', rack: 'A03', nivel: '02' };

/** Cada prueba arranca con insumos de sobra (el seed deja algunos bajos a propósito para el Panel). */
async function reponerTodo() {
  for (let insumo_id = 1; insumo_id <= 14; insumo_id++) await api(PROD, 'post', '/demo/reponer', { insumo_id, cantidad: 5000 });
}
/** Crea y planifica una orden. */
async function nuevaOrden(producto_id = 1, cantidad_kg = 1000) {
  await reponerTodo();
  const r = await api(PROD, 'post', '/ordenes', { producto_id, cantidad_kg, fecha_proyectada: hoy(), hora_prevista: '08:00', accion: 'PLANIFICAR' });
  expect(r.estado, JSON.stringify(r.cuerpo)).toBe(200);
  return r.cuerpo;
}
/** Lleva una orden hasta el lote en cuarentena. */
async function elaborar(orden: { id: number }, neto = 980) {
  await api(PROD, 'post', `/ordenes/${orden.id}/iniciar`);
  const d = (await api(PROD, 'get', `/ordenes/${orden.id}`)).cuerpo;
  const r = await api(PROD, 'post', `/ordenes/${orden.id}/finalizar-elaboracion`, { consumos: d.consumo_sugerido, cantidad_real_kg: neto, bultos: neto / 20 });
  expect(r.estado, JSON.stringify(r.cuerpo)).toBe(200);
  return r.cuerpo;
}
const sumaPartidas = async (insumo_id: number) =>
  (await prisma.partidaInsumo.aggregate({ where: { insumo_id }, _sum: { cantidad: true } }))._sum.cantidad ?? 0;

beforeAll(async () => { await cargarDatosDeEjemplo(); });
afterAll(async () => { await prisma.$disconnect(); });

describe('Datos de ejemplo', () => {
  test('el seed deja órdenes en todos los estados y dos insumos bajo el mínimo', async () => {
    const ordenes = (await api(DIR, 'get', '/ordenes')).cuerpo as { estado: string; numero: string }[];
    const estados = new Set(ordenes.map((o) => o.estado));
    for (const e of ['CREADA', 'PLANIFICADA', 'EN_PRODUCCION', 'EN_CONTROL_CALIDAD', 'FINALIZADA', 'RECHAZADA_SCRAP', 'CANCELADA']) {
      expect(estados.has(e), `falta ${e}`).toBe(true);
    }
    expect(ordenes).toHaveLength(25);
    expect(ordenes.at(-1)!.numero).toBe(`OP-${new Date().getFullYear()}-00111`);
    const panel = (await api(DIR, 'get', '/panel')).cuerpo;
    expect(panel.kpis.alertasAbastecimiento).toBe(2);
  });

  test('las fechas sin hora viajan como AAAA-MM-DD (no cambian de día por la zona horaria)', async () => {
    const ordenes = (await api(DIR, 'get', '/ordenes')).cuerpo as { fecha_proyectada: string; creado_en: string }[];
    expect(ordenes[0].fecha_proyectada).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(ordenes[0].creado_en).toMatch(/T.*Z$/);
  });
});

describe('Seguridad: sesión y permisos', () => {
  test('sin sesión no se puede operar (401) y con un token inválido tampoco', async () => {
    const { default: request } = await import('supertest');
    const { app } = await import('./ayuda.js');
    expect((await request(app).get('/api/ordenes')).status).toBe(401);
    expect((await request(app).get('/api/ordenes').set('Authorization', 'Bearer cualquiera')).status).toBe(401);
  });

  test('contraseña incorrecta: 401 con un mensaje que no da pistas', async () => {
    const { default: request } = await import('supertest');
    const { app } = await import('./ayuda.js');
    const r = await request(app).post('/api/auth/login').send({ email: 'calidad@sigta.demo', password: 'mal' });
    expect(r.status).toBe(401);
    expect(r.body.error).toBe('Email o contraseña incorrectos');
    const inexistente = await request(app).post('/api/auth/login').send({ email: 'nadie@sigta.demo', password: 'x' });
    expect(inexistente.body.error).toBe('Email o contraseña incorrectos');
  });

  test('las contraseñas se guardan cifradas con bcrypt', async () => {
    const u = await prisma.usuario.findUniqueOrThrow({ where: { email: 'produccion@sigta.demo' } });
    expect(u.password_hash).toMatch(/^\$2[aby]\$10\$/);
  });

  test('/auth/yo devuelve quién inició sesión', async () => {
    const r = await api(CAL, 'get', '/auth/yo');
    expect(r.cuerpo).toMatchObject({ rol: 'CALIDAD', nombre: 'Lucía Benítez' });
    expect(r.cuerpo.password_hash).toBeUndefined();
  });

  test('cada rol sólo hace lo suyo (403)', async () => {
    expect((await api(CAL, 'post', '/ordenes', {})).estado).toBe(403);
    expect((await api(DIR, 'post', '/depositos/ingreso', {})).estado).toBe(403);
    expect((await api(PROD, 'post', '/calidad/1', {})).estado).toBe(403);
    expect((await api(DIR, 'post', '/despachos', { lote_id: 1, cliente: 'x', cantidad_kg: 1 })).estado).toBe(403);
  });

  test('los pedidos mal formados se rechazan con un mensaje claro (400)', async () => {
    const r = await api(PROD, 'post', '/ordenes', { producto_id: 1, cantidad_kg: 10, fecha_proyectada: hoy(), accion: 'OTRA' });
    expect(r.estado).toBe(400);
    expect(r.cuerpo.error).toMatch(/PLANIFICAR/);
    const fecha = await api(PROD, 'post', '/ordenes', { producto_id: 1, cantidad_kg: 10, fecha_proyectada: 'mañana', accion: 'BORRADOR' });
    expect(fecha.cuerpo.error).toBe('Ingresá una fecha programada válida');
  });
});

describe('CU-P01 Registrar orden de producción', () => {
  test('el cálculo de insumos es proporcional a la receta base de 100 kg', async () => {
    const r = (await api(PROD, 'post', '/ordenes/verificar', { producto_id: 1, cantidad_kg: 1000 })).cuerpo;
    expect(r.factor).toBe(10);
    expect(r.items.find((i: { codigo: string }) => i.codigo === 'MP-001').requerido).toBe(850);
    expect(r.items.find((i: { codigo: string }) => i.codigo === 'ENV-020').requerido).toBe(50);
    expect(r.planificable).toBe(true);
  });

  test('con faltantes críticos no se puede planificar, pero sí guardar borrador (y avisa a Compras)', async () => {
    const plan = await api(PROD, 'post', '/ordenes', { producto_id: 5, cantidad_kg: 100000, fecha_proyectada: hoy(), accion: 'PLANIFICAR' });
    expect(plan.estado).toBe(409);
    const borrador = await api(PROD, 'post', '/ordenes', { producto_id: 5, cantidad_kg: 100000, fecha_proyectada: hoy(), accion: 'BORRADOR' });
    expect(borrador.estado).toBe(200);
    expect(borrador.cuerpo.estado).toBe('CREADA');
    const alertas = (await api(PROD, 'get', '/alertas')).cuerpo as { detalle: string }[];
    expect(alertas.some((a) => /Compras/i.test(a.detalle))).toBe(true);
  });

  test('un borrador se puede completar y planificar después', async () => {
    await reponerTodo();
    const b = (await api(PROD, 'post', '/ordenes', { producto_id: 2, cantidad_kg: 200, fecha_proyectada: hoy(), accion: 'BORRADOR' })).cuerpo;
    const r = await api(PROD, 'put', `/ordenes/${b.id}`, { producto_id: 2, cantidad_kg: 400, fecha_proyectada: hoy(), hora_prevista: '10:30', accion: 'PLANIFICAR' });
    expect(r.estado).toBe(200);
    expect(r.cuerpo).toMatchObject({ estado: 'PLANIFICADA', cantidad_kg: 400, numero: b.numero });
  });
});

describe('Circuito completo', () => {
  test('planificar, elaborar, aprobar, ingresar, despachar y trazar', async () => {
    await reponerTodo();
    const stockAntes = await sumaPartidas(1);
    const orden = await nuevaOrden();
    // planificar NO descuenta stock (sólo sumó la reposición de nuevaOrden)
    expect(await sumaPartidas(1)).toBe(stockAntes + 5000);

    const fin = await elaborar(orden);
    expect(fin.orden.estado).toBe('EN_CONTROL_CALIDAD');
    expect(fin.merma_kg).toBe(20); // 1000 consumidos - 980 netos
    expect(fin.merma_pct).toBe(2);
    expect(await sumaPartidas(1)).toBe(stockAntes + 5000 - 850);
    const lote = await prisma.loteProduccion.findUniqueOrThrow({ where: { id: fin.lote_id } });
    expect(lote.estado).toBe('CUARENTENA');
    expect(lote.codigo).toMatch(/^L-MRC01-\d{6}-\d{2}$/);

    // en cuarentena: no se puede recibir ni despachar
    expect((await api(DEP, 'post', '/despachos', { lote_id: lote.id, cliente: 'X', cantidad_kg: 10 })).estado).toBe(423);
    expect((await api(DEP, 'post', '/depositos/ingreso', { op_id: orden.id, bultos_recibidos: 49, kg_conformes: 980, ...ubicacion })).estado).toBe(409);

    const cc = await api(CAL, 'post', `/calidad/${lote.id}`, { ...ensayoOk, dictamen: 'APROBAR_LIBERAR', observaciones: 'Conforme' });
    expect(cc.estado, JSON.stringify(cc.cuerpo)).toBe(200);
    expect(cc.cuerpo.protocolo).toMatch(/^CC-\d{4}-\d{5}$/);
    // la aprobación no finaliza la OP ni suma stock vendible
    expect((await prisma.ordenProduccion.findUniqueOrThrow({ where: { id: orden.id } })).estado).toBe('EN_CONTROL_CALIDAD');
    expect(await prisma.stockPT.count({ where: { lote_id: lote.id } })).toBe(0);

    const ing = await api(DEP, 'post', '/depositos/ingreso', { op_id: orden.id, bultos_recibidos: 49, kg_conformes: 980, bultos_danados: 0, merma_kg: 0, ...ubicacion });
    expect(ing.estado, JSON.stringify(ing.cuerpo)).toBe(200);
    expect(ing.cuerpo.pallets.map((p: { bultos: number }) => p.bultos)).toEqual([25, 24]);
    expect(ing.cuerpo.pallets[0].gs1).toContain(`(10)${lote.codigo}`);
    expect((await prisma.ordenProduccion.findUniqueOrThrow({ where: { id: orden.id } })).estado).toBe('FINALIZADA');

    expect((await api(DEP, 'post', '/despachos', { lote_id: lote.id, cliente: 'Cliente de prueba', cantidad_kg: 80 })).estado).toBe(200);
    expect((await api(DEP, 'post', '/despachos', { lote_id: lote.id, cliente: 'Cliente de prueba', cantidad_kg: 5000 })).estado).toBe(409);

    const traza = (await api(DIR, 'get', `/trazabilidad?q=${lote.codigo}`)).cuerpo;
    expect(traza.tipo).toBe('LOTE');
    expect(traza.despachado_kg).toBe(80);
    expect(traza.stock_vendible_kg).toBe(900);
    expect(traza.origen.length).toBeGreaterThanOrEqual(6);
    expect(traza.historial.map((h: { evento: string }) => h.evento)).toContain('Firma de protocolo de calidad');
    // también se encuentra por orden, por pallet, por lote de origen y por la etiqueta GS1-128
    expect((await api(DIR, 'get', `/trazabilidad?q=${orden.numero}`)).cuerpo.lote.codigo).toBe(lote.codigo);
    expect((await api(DIR, 'get', `/trazabilidad?q=${ing.cuerpo.pallets[1].codigo}`)).cuerpo.lote.codigo).toBe(lote.codigo);
    expect((await api(DIR, 'get', '/trazabilidad?q=MF-261015')).cuerpo.tipo).toBe('PARTIDA');
    const porEtiqueta = await api(DIR, 'get', `/trazabilidad?q=${encodeURIComponent(ing.cuerpo.pallets[0].gs1)}`);
    expect(porEtiqueta.cuerpo.lote.codigo).toBe(lote.codigo);
  });

  test('un lote rechazado queda bloqueado, la OP pasa a Scrap y no puede ingresar ni despacharse', async () => {
    const orden = await nuevaOrden(2, 800);
    const fin = await elaborar(orden, 780);
    const sinMotivo = await api(CAL, 'post', `/calidad/${fin.lote_id}`, { ...ensayoOk, color: 'Blanco crema', ufc: 50000, dictamen: 'RECHAZAR_BLOQUEAR', observaciones: '' });
    expect(sinMotivo.estado).toBe(400); // rechazar exige observaciones
    const ok = await api(CAL, 'post', `/calidad/${fin.lote_id}`, { ...ensayoOk, color: 'Blanco crema', ufc: 50000, dictamen: 'RECHAZAR_BLOQUEAR', observaciones: 'Recuento fuera de especificación' });
    expect(ok.estado).toBe(200);
    expect((await prisma.ordenProduccion.findUniqueOrThrow({ where: { id: orden.id } })).estado).toBe('RECHAZADA_SCRAP');
    expect((await api(DEP, 'post', '/despachos', { lote_id: fin.lote_id, cliente: 'X', cantidad_kg: 1 })).estado).toBe(423);
    expect((await api(DEP, 'get', `/depositos/recepcion/${orden.id}`)).cuerpo.habilitado).toBe(false);
    // el intento de despacho bloqueado queda registrado en la auditoría
    expect(await prisma.auditoria.count({ where: { accion: 'DESPACHO_BLOQUEADO', lote_id: fin.lote_id } })).toBe(1);
    // y el protocolo firmado no se puede volver a firmar
    expect((await api(CAL, 'post', `/calidad/${fin.lote_id}`, { ...ensayoOk, dictamen: 'APROBAR_LIBERAR' })).estado).toBe(409);
  });

  test('no se puede aprobar un lote con resultados fuera de especificación', async () => {
    const orden = await nuevaOrden(3, 600);
    const fin = await elaborar(orden, 580);
    const r = await api(CAL, 'post', `/calidad/${fin.lote_id}`, { ...ensayoOk, color: 'Amarillo uniforme', humedad: 19, dictamen: 'APROBAR_LIBERAR', observaciones: 'x' });
    expect(r.estado).toBe(409);
    expect(r.cuerpo.error).toMatch(/humedad/);
  });

  test('en el ingreso, el daño o la merma exigen justificación y no se pueden superar los kilos elaborados', async () => {
    const orden = await nuevaOrden(4, 750);
    const fin = await elaborar(orden, 740);
    await api(CAL, 'post', `/calidad/${fin.lote_id}`, { ...ensayoOk, dictamen: 'APROBAR_LIBERAR', observaciones: 'ok' });
    const base = { op_id: orden.id, bultos_recibidos: 37, ...ubicacion, rack: 'A04', nivel: '01' };
    expect((await api(DEP, 'post', '/depositos/ingreso', { ...base, kg_conformes: 730, bultos_danados: 1, merma_kg: 10 })).estado).toBe(400);
    expect((await api(DEP, 'post', '/depositos/ingreso', { ...base, kg_conformes: 800 })).estado).toBe(409);
    expect((await api(DEP, 'post', '/depositos/ingreso', { ...base, kg_conformes: 730, sector: 'Refrigerado' })).estado).toBe(400); // falta cámara
    expect((await api(DEP, 'post', '/depositos/ingreso', { ...base, kg_conformes: 730, bultos_danados: 1, merma_kg: 10, justificacion: 'Una bolsa rota en el traslado' })).estado).toBe(200);
  });
});

describe('CU-P02 Ejecución y consumo', () => {
  test('el consumo respeta el saldo de cada partida y no mezcla insumos', async () => {
    const orden = await nuevaOrden(1, 1000);
    await api(PROD, 'post', `/ordenes/${orden.id}/iniciar`);
    const d = (await api(PROD, 'get', `/ordenes/${orden.id}`)).cuerpo;
    const consumos = d.consumo_sugerido.map((c: object) => ({ ...c }));
    consumos[0].cantidad = 999999; // más que el saldo de la partida
    const r = await api(PROD, 'post', `/ordenes/${orden.id}/finalizar-elaboracion`, { consumos, cantidad_real_kg: 900, bultos: 45 });
    expect(r.estado).toBe(409);
    expect(r.cuerpo.error).toMatch(/saldo/i);
    const mezclado = d.consumo_sugerido.map((c: object) => ({ ...c }));
    mezclado[0].insumo_id = 2; // la partida es de harina de trigo, no de maíz
    expect((await api(PROD, 'post', `/ordenes/${orden.id}/finalizar-elaboracion`, { consumos: mezclado, cantidad_real_kg: 900 })).estado).toBe(400);
  });

  test('las partidas se sugieren por FEFO (primero la que vence antes)', async () => {
    const orden = await nuevaOrden(1, 1000);
    await api(PROD, 'post', `/ordenes/${orden.id}/iniciar`);
    const d = (await api(PROD, 'get', `/ordenes/${orden.id}`)).cuerpo;
    const harina = d.items.find((i: { codigo: string }) => i.codigo === 'MP-001');
    const vencimientos = harina.partidas.filter((p: { vencimiento: string | null }) => p.vencimiento).map((p: { vencimiento: string }) => p.vencimiento);
    expect(vencimientos).toEqual([...vencimientos].sort());
    expect(d.consumo_sugerido.find((c: { insumo_id: number }) => c.insumo_id === 1).partida_id).toBe(harina.partidas[0].id);
  });

  test('la línea pausada no permite finalizar hasta reanudar', async () => {
    const orden = await nuevaOrden(1, 500);
    await api(PROD, 'post', `/ordenes/${orden.id}/iniciar`);
    expect((await api(PROD, 'post', `/ordenes/${orden.id}/pausar`, { motivo: '' })).estado).toBe(400);
    expect((await api(PROD, 'post', `/ordenes/${orden.id}/pausar`, { motivo: 'Limpieza de línea' })).estado).toBe(200);
    const d = (await api(PROD, 'get', `/ordenes/${orden.id}`)).cuerpo;
    expect((await api(PROD, 'post', `/ordenes/${orden.id}/finalizar-elaboracion`, { consumos: d.consumo_sugerido, cantidad_real_kg: 490, bultos: 24 })).estado).toBe(409);
    expect((await api(PROD, 'post', `/ordenes/${orden.id}/reanudar`)).estado).toBe(200);
  });

  test('guardar avance conserva lo cargado sin descontar stock', async () => {
    const orden = await nuevaOrden(1, 500);
    await api(PROD, 'post', `/ordenes/${orden.id}/iniciar`);
    const antes = await sumaPartidas(1);
    const d = (await api(PROD, 'get', `/ordenes/${orden.id}`)).cuerpo;
    const r = await api(PROD, 'put', `/ordenes/${orden.id}/avance`, { consumos: d.consumo_sugerido, cantidad_real_kg: 480, bultos: 24 });
    expect(r.estado).toBe(200);
    expect(r.cuerpo.avance.cantidad_real_kg).toBe(480);
    expect(await sumaPartidas(1)).toBe(antes);
  });

  test('dos finalizaciones simultáneas de la misma orden: sólo una se registra', async () => {
    const orden = await nuevaOrden(1, 500);
    await api(PROD, 'post', `/ordenes/${orden.id}/iniciar`);
    const d = (await api(PROD, 'get', `/ordenes/${orden.id}`)).cuerpo;
    const cuerpo = { consumos: d.consumo_sugerido, cantidad_real_kg: 490, bultos: 24 };
    const [a, b] = await Promise.all([
      api(PROD, 'post', `/ordenes/${orden.id}/finalizar-elaboracion`, cuerpo),
      api(PROD, 'post', `/ordenes/${orden.id}/finalizar-elaboracion`, cuerpo),
    ]);
    expect([a.estado, b.estado].sort()).toEqual([200, 409]);
    expect(await prisma.consumo.count({ where: { op_id: orden.id } })).toBe(d.consumo_sugerido.length);
  });
});

describe('Reglas en la base de datos (aunque alguien se saltee la aplicación)', () => {
  test('triggers: bloqueo lógico, protocolo inalterable, auditoría sólo agregar y dictamen final', async () => {
    const cuarentena = await prisma.loteProduccion.findFirstOrThrow({ where: { estado: 'CUARENTENA' } });
    await expect(prisma.$executeRaw`INSERT INTO despacho(lote_id, cliente, cantidad_kg, fecha, usuario) VALUES (${cuarentena.id}, 'x', 1, now(), 'x')`).rejects.toThrow(/Bloqueo lógico/);
    await expect(prisma.controlCalidad.updateMany({ data: { observaciones: 'cambiado' } })).rejects.toThrow(/inalterable/);
    await expect(prisma.controlCalidad.deleteMany({})).rejects.toThrow(/no puede eliminarse/);
    await expect(prisma.auditoria.deleteMany({})).rejects.toThrow(/auditoría/);
    await expect(prisma.loteProduccion.updateMany({ where: { estado: 'RECHAZADO_BLOQUEADO' }, data: { estado: 'APROBADO_LIBERADO' } })).rejects.toThrow(/ya está firmado/);
    await expect(prisma.partidaInsumo.update({ where: { id: 1 }, data: { cantidad: -5 } })).rejects.toThrow();
  });
});

describe('Herramientas de la demo', () => {
  test('reiniciar la demo vuelve a los datos de ejemplo', async () => {
    expect((await api(PROD, 'post', '/demo/reset')).estado).toBe(200);
    expect((await api(DIR, 'get', '/ordenes')).cuerpo).toHaveLength(25);
    const pendientes = (await api(DIR, 'get', '/pendientes')).cuerpo;
    expect(pendientes).toMatchObject({ planificar: 1, elaborar: 3, calidad: 3, deposito: 1 });
  });
});

describe('Errores de la base convertidos a respuestas HTTP', () => {
  test('un trigger de bloqueo lógico se traduce a 423 y uno de inalterable a 409', async () => {
    const { errorDeRegla } = await import('../src/errores.js');
    const cuarentena = await prisma.loteProduccion.findFirstOrThrow({ where: { estado: 'CUARENTENA' } });
    const e1 = await prisma.despacho.create({ data: { lote_id: cuarentena.id, cliente: 'x', cantidad_kg: 1, fecha: new Date(), usuario: 'x' } }).catch((e) => e);
    expect(errorDeRegla(e1)?.status).toBe(423);
    expect(errorDeRegla(e1)?.message).toMatch(/^Bloqueo lógico: el lote no está aprobado y liberado/);
    const e2 = await prisma.controlCalidad.updateMany({ data: { ph: 1 } }).catch((e) => e);
    expect(errorDeRegla(e2)?.status).toBe(409);
    expect(errorDeRegla(new Error('otra cosa'))).toBeNull();
  });
});
