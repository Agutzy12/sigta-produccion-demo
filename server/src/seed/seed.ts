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
import { CATEGORIAS, ESPECIFICACION, INSUMOS, LINEAS, PARTIDAS, PRODUCTOS, SALDOS_FINALES, recetaDe, urlProducto } from './catalogo.js';
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
  'op_item', 'orden_produccion', 'partida_insumo', 'receta_item', 'receta', 'insumo', 'producto', 'linea', 'categoria',
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
/* 2) Catálogo (el de agrifood-argentina.com, ver catalogo.ts)          */
/* ------------------------------------------------------------------ */

const sumarDias = (dias: number) => { const d = new Date(); d.setDate(d.getDate() + dias); return fechaLocal(d); };

async function cargarCatalogo() {
  await prisma.categoria.createMany({ data: CATEGORIAS });
  await prisma.linea.createMany({ data: LINEAS });
  await prisma.producto.createMany({
    data: PRODUCTOS.map((d) => {
      const esp = ESPECIFICACION[d.categoria];
      return {
        id: d.id, codigo: d.codigo, nombre: d.nombre, gtin: armarGtin13(`7791234500${String(d.id).padStart(2, '0')}`),
        categoria_id: CATEGORIAS.find((c) => c.codigo === d.categoria)!.id, presentacion: d.presentacion, linea_id: esp.linea_id,
        presentacion_kg: d.presentacion_kg, unidades_por_caja: d.unidades_por_caja, unidades_por_pallet: d.unidades_por_pallet,
        raciones: d.raciones, ingredientes: d.ingredientes, alergenos: d.alergenos, almacenamiento: d.almacenamiento,
        embalaje: d.embalaje, url_web: urlProducto(d), vida_util_meses: 12, color_esperado: d.color,
        humedad_max: d.humedad_max ?? esp.humedad_max, ph_min: d.ph?.[0] ?? esp.ph_min, ph_max: d.ph?.[1] ?? esp.ph_max, ufc_max: esp.ufc_max,
      };
    }),
  });
  await prisma.insumo.createMany({
    data: INSUMOS.map(([id, codigo, nombre, tipo, unidad, critico, stock_minimo]) => ({ id, codigo, nombre, tipo, unidad, critico, stock_minimo })),
  });
  // Recetas: cantidades cada 100 kg de producto. id de receta = id de producto.
  for (const d of PRODUCTOS) {
    await prisma.receta.create({
      data: {
        id: d.id, codigo: `REC-${d.codigo}`, producto_id: d.id, version: 1, vigente_desde: aFechaDb('2026-07-01'), base_kg: 100, activa: true,
        items: { create: recetaDe(d).map(([insumo_id, cantidad_base]) => ({ insumo_id, cantidad_base })) },
      },
    });
  }
  // Arrancan con un saldo enorme para que el historial pueda consumir sin problemas.
  // Al terminar el historial se ajustan al saldo real (ver ajustarSaldosFinales).
  await prisma.partidaInsumo.createMany({
    data: PARTIDAS.map(([insumo_id, nro_lote, proveedor, dias, documento_origen]) => ({
      insumo_id, nro_lote, proveedor, cantidad: 1_000_000, vencimiento: dias === null ? null : aFechaDb(sumarDias(dias)),
      documento_origen, estado: 'LIBERADO' as const, ingreso: ahora(),
    })),
  });
}

/** Stock con el que arranca la demo (después del historial). */
async function ajustarSaldosFinales() {
  for (const [nro_lote, cantidad] of Object.entries(SALDOS_FINALES)) {
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
    const bultos = Math.round((o.kg * 0.98) / prod.presentacion_kg); // se obtiene alrededor del 98 % del objetivo
    const enCurso = await ordenes.getOrden(orden.id);
    const fin = await ordenes.finalizarElaboracion(MARTIN, orden.id, {
      consumos: enCurso.consumo_sugerido!, cantidad_real_kg: bultos * prod.presentacion_kg, bultos,
    });
    if (o.hasta === 'CUARENTENA') return fin;

    avanzar(65);
    const ensayo = {
      humedad: Math.round(prod.humedad_max * 0.75 * 10) / 10, ph: Math.round(((prod.ph_min + prod.ph_max) / 2) * 10) / 10,
      aroma: 'Característico', color: prod.color_esperado, sabor: 'Característico', ufc: 320,
    };
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
    const rack = ['A01', 'B01', 'B03', 'A04', 'A03', 'A02'][prod.categoria_id ?? 0];
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

  const obs = 'Elaboración del turno mañana. Verificar limpieza de línea y cambio de envase antes del inicio.';

  // Semana anterior: sirve para calcular la variación del gráfico de producción reciente
  await simular({ atras: 9, hora: '07:00', producto: 'COD500', kg: 1200, hasta: 'FINALIZADA' });
  await simular({ atras: 8, hora: '07:00', producto: 'PIZ500', kg: 600, hasta: 'FINALIZADA' });
  await simular({ atras: 7, hora: '07:00', producto: 'AJOE20', kg: 200, hasta: 'FINALIZADA' });
  await simular({ atras: 6, hora: '07:00', producto: 'SPA500', kg: 1200, hasta: 'FINALIZADA' });
  await simular({ atras: 6, hora: '10:00', producto: 'ARZ8K', kg: 400, hasta: 'FINALIZADA' });

  // Días anteriores: producción terminada
  await simular({ atras: 5, hora: '07:00', producto: 'BIZC500', kg: 500, hasta: 'FINALIZADA' });
  await simular({ atras: 5, hora: '09:30', producto: 'NUE120', kg: 240, hasta: 'FINALIZADA' });
  await simular({ atras: 5, hora: '12:00', producto: 'ESPE10', kg: 100, hasta: 'FINALIZADA' });
  await simular({ atras: 4, hora: '07:00', producto: 'RIG500', kg: 1000, hasta: 'FINALIZADA' });
  await simular({ atras: 4, hora: '10:00', producto: 'PUR4K', kg: 450, hasta: 'FINALIZADA' });
  await simular({ atras: 4, hora: '12:30', producto: 'NOQ500', kg: 500, hasta: 'FINALIZADA' });
  await simular({ atras: 3, hora: '07:00', producto: 'TIR500', kg: 1000, hasta: 'FINALIZADA' });
  await simular({ atras: 3, hora: '09:30', producto: 'LEN8K', kg: 400, hasta: 'FINALIZADA' });
  await simular({ atras: 3, hora: '12:00', producto: 'TOME20', kg: 200, hasta: 'FINALIZADA' });
  await simular({ atras: 2, hora: '07:00', producto: 'COD500', kg: 1200, hasta: 'FINALIZADA', despachoKg: 300 });
  const pendiente1 = await simular({ atras: 2, hora: '10:00', producto: 'BUN200', kg: 160, hasta: 'CUARENTENA' });
  const pendiente2 = await simular({ atras: 1, hora: '13:00', producto: 'SPA500', kg: 1200, hasta: 'CUARENTENA' });
  await simular({ atras: 1, hora: '11:00', producto: 'PAS120', kg: 120, hasta: 'CANCELADA' });
  await simular({ atras: 1, hora: '10:00', producto: 'PIZ500', kg: 600, hasta: 'RECHAZADA' });
  await simular({ atras: 1, hora: '08:00', producto: 'ZANC20', kg: 200, hasta: 'LIBERADO' }); // espera recepción en depósito

  // Hoy
  await simular({ atras: 0, hora: '06:00', producto: 'ARZ240', kg: 240, hasta: 'CUARENTENA' });
  await simular({ atras: 0, hora: '07:00', producto: 'COD500', kg: 1200, hasta: 'PAUSADA' });

  // Dos lotes viejos ya tienen el análisis empezado (borrador guardado); el de hoy todavía no
  for (const lote of [pendiente1, pendiente2]) {
    await calidad.guardarBorrador(LUCIA, lote!.lote_id, { humedad: 8.2, ph: 6.3, aroma: 'Característico' });
  }

  // El stock con el que arranca la demo se fija acá, antes de las últimas órdenes
  await ajustarSaldosFinales();

  await simular({ atras: 0, hora: '08:30', producto: 'SPA500', kg: 1000, hasta: 'PLANIFICADA', observaciones: obs });
  await simular({ atras: 0, hora: '11:30', producto: 'BUN5K', kg: 400, hasta: 'CREADA', observaciones: 'Falta huevo en polvo: esperando reposición.' });
  await simular({ atras: 0, hora: '12:00', producto: 'AJOP20', kg: 200, hasta: 'PLANIFICADA', observaciones: 'Usar primero la partida de ajo que vence antes.' });
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
