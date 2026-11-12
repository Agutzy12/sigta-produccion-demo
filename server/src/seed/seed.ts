/**
 * Datos de ejemplo de la demo.
 *
 * 1) Usuarios de ejemplo (con contraseña cifrada).
 * 2) Catálogo: productos, recetas, insumos y partidas (el stock inicial).
 * 3) Historial: órdenes en todos los estados, para que el Panel no arranque vacío.
 *    Se generan corriendo los MISMOS servicios que usa la aplicación, con un reloj simulado
 *    (clock.ts). Así los datos de ejemplo siempre cumplen las reglas del sistema.
 */
import { prisma } from '../db.js';
import { fijarReloj, liberarReloj, ahora } from '../clock.js';
import { CLAVE_DEMO, USUARIOS_DEMO } from '../config.js';
import { auditar, aFechaDb, fechaLocal, type UsuarioActual } from '../services/comun.js';
import { cifrar } from '../services/auth.js';
import { armarGtin13 } from '../services/gs1.js';
import * as ordenes from '../services/ordenes.js';
import * as calidad from '../services/calidad.js';
import * as deposito from '../services/deposito.js';

const persona = (rol: string): UsuarioActual => {
  const u = USUARIOS_DEMO.find((x) => x.rol === rol)!;
  return { nombre: u.nombre, rol: u.rol };
};
const MARTIN = persona('PRODUCCION');
const LUCIA = persona('CALIDAD');
const DIEGO = persona('DEPOSITO');

/** Tablas de datos (todas menos usuario), en orden para vaciarlas. */
const TABLAS = [
  'auditoria', 'despacho', 'pallet', 'stock_pt', 'control_calidad', 'lote_produccion', 'consumo',
  'op_item', 'orden_produccion', 'partida_insumo', 'receta_item', 'receta', 'insumo', 'producto', 'linea',
];

/* ------------------------------------------------------------------ */
/* 1) Usuarios                                                          */
/* ------------------------------------------------------------------ */

export async function cargarUsuarios() {
  const hash = await cifrar(CLAVE_DEMO);
  for (const u of USUARIOS_DEMO) {
    await prisma.usuario.upsert({
      where: { email: u.email },
      update: { nombre: u.nombre, cargo: u.cargo, iniciales: u.iniciales, rol: u.rol, activo: true },
      create: { ...u, password_hash: hash },
    });
  }
}

/* ------------------------------------------------------------------ */
/* 2) Catálogo                                                          */
/* ------------------------------------------------------------------ */

async function cargarCatalogo() {
  await prisma.linea.createMany({ data: [{ id: 1, nombre: 'Línea de mezclado 1' }, { id: 2, nombre: 'Línea de mezclado 2' }] });

  // id, código, nombre, línea sugerida, color esperado. GTIN de ejemplo con prefijo argentino 779.
  const productos: [number, string, string, number, string][] = [
    [1, 'MRC01', 'Mezcla rebozadora clásica', 1, 'Crema uniforme'],
    [2, 'PPN02', 'Premezcla para pan', 2, 'Blanco crema'],
    [3, 'RMA03', 'Rebozador de maíz', 1, 'Amarillo uniforme'],
    [4, 'MML01', 'Mezcla para milanesas', 2, 'Crema uniforme'],
    [5, 'PPI02', 'Premezcla para pizza', 2, 'Blanco crema'],
  ];
  // bolsas de 20 kg, vida útil 6 meses, especificación de ejemplo: humedad ≤ 14 %, pH 5,5–7,0, ≤ 10.000 UFC/g
  await prisma.producto.createMany({
    data: productos.map(([id, codigo, nombre, linea_id, color_esperado]) => ({
      id, codigo, nombre, linea_id, color_esperado, gtin: armarGtin13(`77912345000${id}`),
      presentacion_kg: 20, vida_util_meses: 6, humedad_max: 14, ph_min: 5.5, ph_max: 7, ufc_max: 10000,
    })),
  });

  // id, código, nombre, tipo, unidad, crítico, stock mínimo
  const insumos: [number, string, string, 'MP' | 'ME', string, boolean, number][] = [
    [1, 'MP-001', 'Harina de trigo', 'MP', 'kg', true, 500],
    [2, 'MP-002', 'Harina de maíz', 'MP', 'kg', true, 200],
    [3, 'MP-003', 'Sal fina', 'MP', 'kg', true, 50],
    [4, 'MP-004', 'Mezcla de especias', 'MP', 'kg', true, 30],
    [5, 'MP-005', 'Almidón', 'MP', 'kg', true, 150],
    [6, 'MP-006', 'Levadura seca', 'MP', 'kg', true, 20],
    [7, 'MP-007', 'Azúcar', 'MP', 'kg', true, 50],
    [8, 'ENV-020', 'Bolsa kraft de 20 kg', 'ME', 'un.', true, 100],
    [9, 'ETQ-MRC', 'Etiqueta de producto', 'ME', 'un.', true, 100],
    [10, 'ETQ-PPN', 'Etiqueta de producto', 'ME', 'un.', true, 100],
    [11, 'ETQ-RMA', 'Etiqueta de producto', 'ME', 'un.', true, 100],
    [12, 'ETQ-MML', 'Etiqueta de producto', 'ME', 'un.', true, 100],
    [13, 'ETQ-PPI', 'Etiqueta de producto', 'ME', 'un.', true, 100],
    [14, 'FIL-STR', 'Film estirable para pallets', 'ME', 'rollos', false, 20],
  ];
  await prisma.insumo.createMany({
    data: insumos.map(([id, codigo, nombre, tipo, unidad, critico, stock_minimo]) => ({ id, codigo, nombre, tipo, unidad, critico, stock_minimo })),
  });

  // Recetas: cantidades cada 100 kg de producto. id receta = id producto.
  const recetas: [number, string, number, string, [number, number][]][] = [
    [1, 'REC-MRC01', 3, '2026-09-01', [[1, 85], [2, 10], [3, 3], [4, 2], [8, 5], [9, 5]]],
    [2, 'REC-PPN02', 2, '2026-08-15', [[1, 90], [3, 2], [6, 3], [7, 5], [8, 5], [10, 5]]],
    [3, 'REC-RMA03', 1, '2026-07-01', [[2, 70], [1, 20], [3, 5], [4, 5], [8, 5], [11, 5]]],
    [4, 'REC-MML01', 2, '2026-08-01', [[1, 70], [5, 20], [3, 5], [4, 5], [8, 5], [12, 5]]],
    [5, 'REC-PPI02', 1, '2026-07-15', [[1, 85], [6, 3], [3, 2], [7, 5], [5, 5], [8, 5], [13, 5]]],
  ];
  for (const [id, codigo, version, desde, items] of recetas) {
    await prisma.receta.create({
      data: {
        id, codigo, producto_id: id, version, vigente_desde: aFechaDb(desde), base_kg: 100, activa: true,
        items: { create: items.map(([insumo_id, cantidad_base]) => ({ insumo_id, cantidad_base })) },
      },
    });
  }

  // Partidas de proveedor: [insumo, lote de origen, proveedor, vencimiento, remito]
  const partidas: [number, string, string, string | null, string][] = [
    [1, 'MF-261001', 'Molinos Florencia SAU', '2027-04-01', 'REM-MF-261001'],
    [1, 'MF-261015', 'Molinos Florencia SAU', '2027-04-15', 'REM-MF-261015'],
    [1, 'MF-261020', 'Molinos Florencia SAU', '2027-05-10', 'REM-MF-261020'],
    [2, 'HM-261012', 'Maíces del Sur S.A.', '2027-04-12', 'REM-MS-261012'],
    [3, 'SAL-261005', 'Salinas del Centro S.R.L.', '2028-10-05', 'REM-SC-261005'],
    [4, 'ESP-261008', 'Aromas del Campo S.R.L.', '2027-10-08', 'REM-AC-261008'],
    [5, 'ALM-261003', 'Almidones del Litoral S.A.', '2027-08-03', 'REM-AL-261003'],
    [6, 'LEV-261009', 'Levaduras Pampeanas S.A.', '2027-03-09', 'REM-LP-261009'],
    [7, 'AZU-261011', 'Azucarera del Norte S.A.', '2028-02-11', 'REM-AN-261011'],
    [8, 'ENV-261010', 'Cartocor S.A.', null, 'REM-CA-261010'],
    [9, 'ETQ-261010', 'Etiquetas del Centro S.A.', null, 'REM-EC-261010'],
    [10, 'ETQ-261011', 'Etiquetas del Centro S.A.', null, 'REM-EC-261011'],
    [11, 'ETQ-261012', 'Etiquetas del Centro S.A.', null, 'REM-EC-261012'],
    [12, 'ETQ-261013', 'Etiquetas del Centro S.A.', null, 'REM-EC-261013'],
    [13, 'ETQ-261014', 'Etiquetas del Centro S.A.', null, 'REM-EC-261014'],
    [14, 'FIL-261002', 'Plásticos Industriales S.A.', null, 'REM-PI-261002'],
  ];
  // Arrancan con un saldo enorme para que el historial pueda consumir sin problemas.
  // Al terminar el historial se ajustan al saldo real (ver ajustarSaldosFinales).
  await prisma.partidaInsumo.createMany({
    data: partidas.map(([insumo_id, nro_lote, proveedor, vence, documento_origen]) => ({
      insumo_id, nro_lote, proveedor, cantidad: 1_000_000, vencimiento: vence ? aFechaDb(vence) : null,
      documento_origen, estado: 'LIBERADO' as const, ingreso: ahora(),
    })),
  });
}

/** Stock con el que arranca la demo (después del historial). */
async function ajustarSaldosFinales() {
  const saldos: Record<string, number> = {
    'MF-261001': 500, 'MF-261015': 3000, 'MF-261020': 2500, // harina de trigo
    'HM-261012': 900, 'SAL-261005': 300, 'ESP-261008': 150,
    'ALM-261003': 80, // almidón: queda por debajo del mínimo (150)
    'LEV-261009': 60, 'AZU-261011': 200, 'ENV-261010': 480,
    'ETQ-261010': 400, 'ETQ-261011': 300, 'ETQ-261012': 300, 'ETQ-261013': 300, 'ETQ-261014': 300,
    'FIL-261002': 12, // film: por debajo del mínimo (20)
  };
  for (const [nro_lote, cantidad] of Object.entries(saldos)) {
    await prisma.partidaInsumo.updateMany({ where: { nro_lote }, data: { cantidad } });
  }
}

/* ------------------------------------------------------------------ */
/* 3) Historial simulado                                                */
/* ------------------------------------------------------------------ */

type Hasta = 'CREADA' | 'PLANIFICADA' | 'CANCELADA' | 'PAUSADA' | 'CUARENTENA' | 'LIBERADO' | 'RECHAZADA' | 'FINALIZADA';

async function cargarHistorial() {
  const AHORA_REAL = new Date();
  let cursor = new Date(AHORA_REAL.getTime());
  fijarReloj(() => new Date(cursor.getTime()));

  // Fecha de hace N días hábiles (0 = hoy)
  function diaHabil(atras: number) {
    const d = new Date(AHORA_REAL.getFullYear(), AHORA_REAL.getMonth(), AHORA_REAL.getDate());
    let faltan = atras;
    while (faltan > 0) {
      d.setDate(d.getDate() - 1);
      if (d.getDay() !== 0 && d.getDay() !== 6) faltan--;
    }
    return d;
  }
  // Mueve el reloj a un día y hora (sin pasar nunca de "ahora")
  function irA(dia: Date, hhmm: string) {
    const [h, m] = hhmm.split(':').map(Number);
    const t = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), h, m);
    cursor = t > AHORA_REAL ? new Date(AHORA_REAL.getTime()) : t;
  }
  function avanzar(minutos: number) {
    const t = new Date(cursor.getTime() + minutos * 60000);
    cursor = t > AHORA_REAL ? new Date(AHORA_REAL.getTime()) : t;
  }

  /** Corre una orden por el circuito real hasta el punto indicado. */
  async function simular(o: { atras: number; hora: string; producto: string; kg: number; hasta: Hasta; observaciones?: string; despachoKg?: number }) {
    const prod = await prisma.producto.findUniqueOrThrow({ where: { codigo: o.producto } });
    const dia = diaHabil(o.atras);
    const [h, m] = o.hora.split(':').map(Number);
    irA(dia, `${String(Math.max(h - 1, 0)).padStart(2, '0')}:${String(m).padStart(2, '0')}`); // se crea una hora antes
    const orden = await ordenes.crearOrden(MARTIN, {
      producto_id: prod.id, linea_id: prod.linea_id, cantidad_kg: o.kg, fecha_proyectada: fechaLocal(dia),
      hora_prevista: o.hora, observaciones: o.observaciones ?? '', accion: o.hasta === 'CREADA' ? 'BORRADOR' : 'PLANIFICAR',
    });
    if (o.hasta === 'CREADA' || o.hasta === 'PLANIFICADA') return null;
    if (o.hasta === 'CANCELADA') {
      avanzar(15);
      await ordenes.cancelarOrden(MARTIN, orden.id, 'Se cancela por cambio en el pedido del cliente');
      return null;
    }

    irA(dia, o.hora);
    await ordenes.iniciarProduccion(MARTIN, orden.id);
    if (o.hasta === 'PAUSADA') {
      avanzar(40);
      await ordenes.pausarLinea(MARTIN, orden.id, 'Ajuste del dosificador');
      return null;
    }

    avanzar(100);
    const bultos = Math.round((o.kg * 0.98) / prod.presentacion_kg); // merma de proceso de alrededor del 2 %
    const enCurso = await ordenes.getOrden(orden.id);
    const fin = await ordenes.finalizarElaboracion(MARTIN, orden.id, {
      consumos: enCurso.consumo_sugerido!, cantidad_real_kg: bultos * prod.presentacion_kg, bultos,
    });
    if (o.hasta === 'CUARENTENA') return fin;

    avanzar(65);
    const ensayo = { humedad: 12.4, ph: 6.2, aroma: 'Característico', color: prod.color_esperado, sabor: 'Característico', ufc: 320 };
    if (o.hasta === 'RECHAZADA') {
      await calidad.registrarControlCalidad(LUCIA, fin.lote_id, {
        ...ensayo, ufc: 45000, dictamen: 'RECHAZAR_BLOQUEAR',
        observaciones: 'Recuento microbiológico fuera de especificación. Se bloquea el lote y se informa a jefatura de planta.',
      });
      return fin;
    }
    await calidad.registrarControlCalidad(LUCIA, fin.lote_id, {
      ...ensayo, dictamen: 'APROBAR_LIBERAR', observaciones: 'Resultados dentro de la especificación de ejemplo. Sin desvíos observados.',
    });
    if (o.hasta === 'LIBERADO') return fin;

    avanzar(45);
    const rack = ({ MRC01: 'A02', PPN02: 'A01', RMA03: 'A03', MML01: 'A04', PPI02: 'A05' } as Record<string, string>)[o.producto];
    await deposito.ingresarProductoTerminado(DIEGO, {
      op_id: orden.id, bultos_recibidos: bultos, kg_conformes: bultos * prod.presentacion_kg, bultos_danados: 0, merma_kg: 0,
      deposito: 'Producto terminado', sector: 'Secos · Ambiente', rack, nivel: '02',
    });
    if (o.despachoKg) {
      avanzar(24 * 60);
      await deposito.despachar(DIEGO, { lote_id: fin.lote_id, cliente: 'Distribuidora Mayorista del Litoral S.R.L.', cantidad_kg: o.despachoKg });
    }
    return fin;
  }

  const obs = 'Elaboración del turno mañana. Presentación en bolsas de 20 kg; verificar limpieza de línea antes del inicio.';

  // Semana anterior: sirve para calcular la variación del gráfico "Producción reciente"
  await simular({ atras: 9, hora: '07:00', producto: 'MRC01', kg: 1000, hasta: 'FINALIZADA' });
  await simular({ atras: 8, hora: '07:00', producto: 'PPN02', kg: 800, hasta: 'FINALIZADA' });
  await simular({ atras: 7, hora: '07:00', producto: 'MML01', kg: 750, hasta: 'FINALIZADA' });
  await simular({ atras: 6, hora: '07:00', producto: 'RMA03', kg: 600, hasta: 'FINALIZADA' });
  await simular({ atras: 6, hora: '10:00', producto: 'PPI02', kg: 500, hasta: 'FINALIZADA' });

  // Días anteriores: producción terminada
  await simular({ atras: 5, hora: '07:00', producto: 'PPN02', kg: 800, hasta: 'FINALIZADA' });
  await simular({ atras: 5, hora: '09:30', producto: 'MRC01', kg: 1000, hasta: 'FINALIZADA' });
  await simular({ atras: 5, hora: '12:00', producto: 'RMA03', kg: 600, hasta: 'FINALIZADA' });
  await simular({ atras: 4, hora: '07:00', producto: 'MML01', kg: 750, hasta: 'FINALIZADA' });
  await simular({ atras: 4, hora: '10:00', producto: 'PPI02', kg: 500, hasta: 'FINALIZADA' });
  await simular({ atras: 4, hora: '12:30', producto: 'MRC01', kg: 1000, hasta: 'FINALIZADA' });
  await simular({ atras: 3, hora: '07:00', producto: 'PPN02', kg: 800, hasta: 'FINALIZADA' });
  await simular({ atras: 3, hora: '09:30', producto: 'MRC01', kg: 1000, hasta: 'FINALIZADA' });
  await simular({ atras: 3, hora: '12:00', producto: 'RMA03', kg: 800, hasta: 'FINALIZADA' });
  await simular({ atras: 2, hora: '07:00', producto: 'MML01', kg: 750, hasta: 'FINALIZADA', despachoKg: 300 });
  const pendiente1 = await simular({ atras: 2, hora: '10:00', producto: 'PPI02', kg: 500, hasta: 'CUARENTENA' });
  const pendiente2 = await simular({ atras: 1, hora: '13:00', producto: 'MRC01', kg: 1000, hasta: 'CUARENTENA' });
  await simular({ atras: 1, hora: '11:00', producto: 'RMA03', kg: 400, hasta: 'CANCELADA' });
  await simular({ atras: 1, hora: '10:00', producto: 'PPN02', kg: 600, hasta: 'RECHAZADA' });
  await simular({ atras: 1, hora: '08:00', producto: 'MML01', kg: 750, hasta: 'LIBERADO' }); // espera recepción en depósito

  // Hoy
  await simular({ atras: 0, hora: '06:00', producto: 'RMA03', kg: 600, hasta: 'CUARENTENA' });
  await simular({ atras: 0, hora: '07:00', producto: 'PPN02', kg: 800, hasta: 'PAUSADA' });

  // Dos lotes viejos ya tienen el análisis empezado (borrador guardado); el de hoy todavía no
  for (const lote of [pendiente1, pendiente2]) {
    await calidad.guardarBorrador(LUCIA, lote!.lote_id, { humedad: 12.6, ph: 6.3, aroma: 'Característico' });
  }

  // El stock con el que arranca la demo se fija acá, antes de las últimas órdenes
  await ajustarSaldosFinales();

  await simular({ atras: 0, hora: '08:30', producto: 'MRC01', kg: 1000, hasta: 'PLANIFICADA', observaciones: obs });
  await simular({ atras: 0, hora: '11:30', producto: 'MML01', kg: 750, hasta: 'CREADA', observaciones: 'Falta almidón: esperando reposición.' });
  await simular({ atras: 0, hora: '12:00', producto: 'MRC01', kg: 1000, hasta: 'PLANIFICADA', observaciones: obs });
}

/* ------------------------------------------------------------------ */
/* Funciones públicas                                                   */
/* ------------------------------------------------------------------ */

/** Vacía las tablas de datos (los usuarios se conservan). TRUNCATE no dispara los triggers de fila. */
async function vaciarDatos() {
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${TABLAS.map((t) => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE`);
}

export async function cargarDatosDeEjemplo() {
  await cargarUsuarios();
  await vaciarDatos();
  await cargarCatalogo();
  try {
    await cargarHistorial();
  } finally {
    liberarReloj();
  }
}

/** Si la base está vacía (primera vez), la carga con los datos de ejemplo. */
export async function asegurarDatos() {
  if ((await prisma.usuario.count()) === 0 || (await prisma.producto.count()) === 0) {
    console.log('Base vacía: cargando datos de ejemplo...');
    await cargarDatosDeEjemplo();
  }
}

let reiniciando: Promise<unknown> | null = null;

/** Botón "Reiniciar demo": borra los movimientos y vuelve a cargar los datos de ejemplo. */
export async function reiniciarDemo(usuario: UsuarioActual) {
  if (!reiniciando) {
    reiniciando = cargarDatosDeEjemplo().finally(() => { reiniciando = null; });
  }
  await reiniciando;
  await auditar(usuario, 'REINICIO_DEMO', 'DEMO', 'Se restauraron los datos de ejemplo');
  return { ok: true };
}
