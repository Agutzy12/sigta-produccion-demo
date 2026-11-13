/**
 * CU-P01 Registrar Orden de Producción
 * CU-P02 Registrar Ejecución de Producción y Consumo
 *
 * Estados de la orden:
 * CREADA -> PLANIFICADA -> EN_PRODUCCION -> EN_CONTROL_CALIDAD -> FINALIZADA
 *                                              (rechazo de calidad) -> RECHAZADA_SCRAP
 * y CANCELADA mientras no haya llegado a control de calidad.
 */
import { Prisma } from '@prisma/client';
import { db, tx } from '../db.js';
import { ahora } from '../clock.js';
import { PRIMERA_OP } from '../config.js';
import { datosInvalidos, noExiste, noSePuede } from '../errores.js';
import {
  redondear, rellenar, aNumero, aFechaDb, sumarMeses, semanaISO, auditar, type UsuarioActual,
} from './comun.js';
import { stockInsumos, partidasDisponiblesDe, recetaVigente, type Partida } from './inventario.js';

/* ------------------------------------------------------------------ */
/* Ayudas                                                               */
/* ------------------------------------------------------------------ */

async function getOpRow(id: number) {
  const op = await db().ordenProduccion.findUnique({ where: { id: Number(id) || 0 } });
  if (!op) throw noExiste('Orden de producción inexistente');
  return op;
}

function validarKg(valor: unknown) {
  const kg = aNumero(valor);
  if (!(kg > 0)) throw datosInvalidos('La cantidad a elaborar debe ser mayor a 0');
  return kg;
}

interface ItemRequerido {
  insumo_id: number; cantidad_base: number; codigo: string; nombre: string; tipo: 'MP' | 'ME';
  unidad: string; critico: boolean; requerido: number; disponible: number; faltante: number; ok: boolean;
}

const textoFaltantes = (items: ItemRequerido[]) =>
  items.filter((i) => !i.ok).map((i) => `${i.nombre}: faltan ${i.faltante} ${i.unidad}`).join('; ');

/** Orden de los insumos en pantalla: primero materias primas (la principal arriba), después empaque. */
const porTipoYCantidad = <T extends { tipo: string; insumo_id: number }>(cantidad: (x: T) => number) => (a: T, b: T) =>
  a.tipo !== b.tipo ? (a.tipo === 'MP' ? -1 : 1) : a.tipo === 'MP' ? cantidad(b) - cantidad(a) || a.insumo_id - b.insumo_id : a.insumo_id - b.insumo_id;

/**
 * Calcula cuánto de cada insumo necesita una receta para `kg` de producto
 * y lo compara con lo que hay disponible (stock menos lo reservado por otras órdenes).
 */
export async function requerimientos(productoId: number, kg: number) {
  const producto = await db().producto.findUnique({ where: { id: Number(productoId) || 0 } });
  if (!producto) throw noExiste('Producto inexistente');
  const receta = await recetaVigente(producto.id);
  if (!receta) throw noSePuede('El producto no tiene una receta vigente');

  const stock = new Map((await stockInsumos()).map((s) => [s.id, s]));
  const componentes = await db().recetaItem.findMany({ where: { receta_id: receta.id }, include: { insumo: true } });
  const items: ItemRequerido[] = componentes
    .map((ri) => {
      let requerido = (ri.cantidad_base * kg) / receta.base_kg;
      // los kilos se redondean; las bolsas y etiquetas se redondean hacia arriba (no hay media bolsa)
      requerido = ri.insumo.unidad === 'kg' ? redondear(requerido) : Math.ceil(redondear(requerido, 6));
      const disponible = stock.get(ri.insumo_id)?.disponible ?? 0;
      // si otras órdenes ya reservaron más de lo que hay, para ESTA orden falta todo lo requerido (no más)
      const faltante = Math.max(0, redondear(requerido - Math.max(0, disponible)));
      return {
        insumo_id: ri.insumo_id, cantidad_base: ri.cantidad_base, codigo: ri.insumo.codigo, nombre: ri.insumo.nombre,
        tipo: ri.insumo.tipo, unidad: ri.insumo.unidad, critico: ri.insumo.critico,
        requerido, disponible, faltante, ok: faltante === 0,
      };
    })
    .sort(porTipoYCantidad((i) => i.requerido));

  const kgMateriaPrima = items.filter((i) => i.tipo === 'MP').reduce((a, i) => a + i.requerido, 0);
  return {
    producto,
    receta,
    factor: kg / receta.base_kg,
    items,
    kgMateriaPrima: redondear(kgMateriaPrima),
    criticosTotal: items.filter((i) => i.critico).length,
    criticosOk: items.filter((i) => i.critico && i.ok).length,
    planificable: items.filter((i) => i.critico).every((i) => i.ok),
    hayFaltantes: items.some((i) => !i.ok),
  };
}

export function verificarDisponibilidad(cuerpo: { producto_id: unknown; cantidad_kg: unknown }) {
  return requerimientos(Number(cuerpo.producto_id), validarKg(cuerpo.cantidad_kg));
}

export async function proximoNumero() {
  const ultima = await db().ordenProduccion.aggregate({ _max: { secuencia: true } });
  const secuencia = (ultima._max.secuencia ?? PRIMERA_OP - 1) + 1;
  return { secuencia, numero: `OP-${ahora().getFullYear()}-${rellenar(secuencia, 5)}` };
}

/* ------------------------------------------------------------------ */
/* CU-P01 Registrar Orden de Producción                                 */
/* ------------------------------------------------------------------ */

export interface DatosOrden {
  producto_id: number;
  cantidad_kg: number;
  fecha_proyectada: string;
  hora_prevista?: string | null;
  linea_id?: number | null;
  observaciones?: string | null;
  accion: 'PLANIFICAR' | 'BORRADOR';
}

/**
 * Crea una orden nueva o completa un borrador (si viene opId).
 * accion = 'PLANIFICAR' (reserva los insumos) o 'BORRADOR' (queda CREADA y avisa a Compras si falta algo).
 */
async function guardarOrden(usuario: UsuarioActual, cuerpo: DatosOrden, opId: number | null) {
  const kg = validarKg(cuerpo.cantidad_kg);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(cuerpo.fecha_proyectada || ''))) throw datosInvalidos('Ingresá una fecha programada válida');
  const hora = cuerpo.hora_prevista || '08:00';
  if (!/^\d{2}:\d{2}$/.test(hora)) throw datosInvalidos('La hora de inicio prevista no es válida');
  if (!['PLANIFICAR', 'BORRADOR'].includes(cuerpo.accion)) throw datosInvalidos("La acción debe ser 'PLANIFICAR' o 'BORRADOR'");

  return tx(async () => {
    const req = await requerimientos(cuerpo.producto_id, kg);
    if (cuerpo.accion === 'PLANIFICAR' && !req.planificable) {
      throw noSePuede(`Hay faltantes críticos, no se puede planificar. ${textoFaltantes(req.items)}`);
    }
    const estado = cuerpo.accion === 'PLANIFICAR' ? 'PLANIFICADA' : 'CREADA';
    const lineaId = Number(cuerpo.linea_id) || req.producto.linea_id;
    const datos = {
      producto_id: req.producto.id, receta_id: req.receta.id, linea_id: lineaId, cantidad_kg: kg,
      fecha_proyectada: aFechaDb(cuerpo.fecha_proyectada), hora_prevista: hora, estado,
      observaciones: cuerpo.observaciones?.trim() || null,
    } as const;

    let id: number;
    let numero: string;
    let esNueva = true;
    if (opId) {
      const op = await getOpRow(opId);
      if (op.estado !== 'CREADA') throw noSePuede('Sólo se puede completar una orden en estado CREADA');
      await db().ordenProduccion.update({ where: { id: op.id }, data: datos });
      await db().opItem.deleteMany({ where: { op_id: op.id } });
      id = op.id;
      numero = op.numero;
      esNueva = false;
    } else {
      const siguiente = await proximoNumero();
      const creada = await db().ordenProduccion.create({
        data: { ...datos, secuencia: siguiente.secuencia, numero: siguiente.numero, creado_por: usuario.nombre, creado_en: ahora() },
      });
      id = creada.id;
      numero = creada.numero;
    }

    await db().opItem.createMany({
      data: req.items.map((item) => ({ op_id: id, insumo_id: item.insumo_id, cantidad_teorica: item.requerido })),
    });

    if (esNueva) await auditar(usuario, 'OP_CREADA', numero, 'Creación de la orden', { op_id: id, resultado: 'OP Creada' });
    if (estado === 'PLANIFICADA') {
      await auditar(usuario, 'OP_PLANIFICADA', numero, 'Confirmación de disponibilidad', { op_id: id, resultado: 'OP Planificada' });
    } else if (req.hayFaltantes) {
      await auditar(usuario, 'ALERTA_COMPRAS', numero,
        `Compras y Suministros: la ${numero} necesita abastecimiento. ${textoFaltantes(req.items)}`, { op_id: id });
    }
    return getOrden(id);
  });
}

export const crearOrden = (usuario: UsuarioActual, cuerpo: DatosOrden) => guardarOrden(usuario, cuerpo, null);
export const completarBorrador = (usuario: UsuarioActual, id: number, cuerpo: DatosOrden) => guardarOrden(usuario, cuerpo, id);

export function cancelarOrden(usuario: UsuarioActual, id: number, motivo?: string | null) {
  return tx(async () => {
    const op = await getOpRow(id);
    if (!['CREADA', 'PLANIFICADA', 'EN_PRODUCCION'].includes(op.estado)) {
      throw noSePuede(`No se puede cancelar una orden en estado ${op.estado}`);
    }
    await db().ordenProduccion.update({ where: { id: op.id }, data: { estado: 'CANCELADA', pausada: false, cierre: ahora() } });
    await auditar(usuario, 'OP_CANCELADA', op.numero, `Cancelación de la orden · ${motivo?.trim() || 'sin motivo informado'}`,
      { op_id: op.id, resultado: 'OP Cancelada' });
    return getOrden(op.id);
  });
}

/* ------------------------------------------------------------------ */
/* Lectura de órdenes                                                   */
/* ------------------------------------------------------------------ */

export async function listOrdenes() {
  const ordenes = await db().ordenProduccion.findMany({
    orderBy: { secuencia: 'desc' },
    include: { producto: true, linea: true, lote: true },
  });
  return ordenes.map(({ producto, linea, lote, avance: _avance, ...o }) => ({
    ...o,
    producto_codigo: producto.codigo,
    producto_nombre: producto.nombre,
    linea_nombre: linea?.nombre ?? null,
    lote_codigo: lote?.codigo ?? null,
    lote_estado: lote?.estado ?? null,
    lote_id: lote?.id ?? null,
  }));
}

export interface FilaConsumo { insumo_id: number; partida_id: number | null; cantidad: number }

/**
 * Reparte lo que necesita cada insumo entre las partidas disponibles,
 * empezando por la que vence antes (FEFO). Es la sugerencia inicial de la pantalla de ejecución.
 */
export async function sugerirConsumo(items: { insumo_id: number; cantidad_teorica: number }[], partidas?: Map<number, Partida[]>) {
  const disponibles = partidas ?? await partidasDisponiblesDe(items.map((i) => i.insumo_id));
  const sugeridas: FilaConsumo[] = [];
  for (const item of items) {
    let resto = item.cantidad_teorica;
    let ultima: { id: number } | null = null;
    for (const partida of disponibles.get(item.insumo_id) ?? []) {
      if (resto <= 0) break;
      const tomar = redondear(Math.min(resto, partida.cantidad));
      sugeridas.push({ insumo_id: item.insumo_id, partida_id: partida.id, cantidad: tomar });
      resto = redondear(resto - tomar);
      ultima = partida;
    }
    // si no alcanza el stock queda una fila con lo que falta, para que se vea en pantalla
    if (resto > 0) sugeridas.push({ insumo_id: item.insumo_id, partida_id: ultima ? ultima.id : null, cantidad: resto });
  }
  return sugeridas;
}

export async function getOrden(id: number) {
  const op = await db().ordenProduccion.findUnique({
    where: { id: Number(id) || 0 },
    include: { producto: true, linea: true, receta: true, lote: true, items: { include: { insumo: true } } },
  });
  if (!op) throw noExiste('Orden de producción inexistente');
  const { producto, linea, receta, lote, items: filasItems, ...resto } = op;

  const items = filasItems
    .map((oi) => ({
      insumo_id: oi.insumo_id, cantidad_teorica: oi.cantidad_teorica, codigo: oi.insumo.codigo, nombre: oi.insumo.nombre,
      tipo: oi.insumo.tipo, unidad: oi.insumo.unidad, critico: oi.insumo.critico,
      partidas: undefined as Partida[] | undefined,
    }))
    .sort(porTipoYCantidad((i) => i.cantidad_teorica));

  let consumo_sugerido: FilaConsumo[] | undefined;
  if (op.estado === 'EN_PRODUCCION') {
    const partidas = await partidasDisponiblesDe(items.map((i) => i.insumo_id));
    for (const item of items) item.partidas = partidas.get(item.insumo_id) ?? [];
    consumo_sugerido = await sugerirConsumo(items, partidas);
  }
  return {
    ...resto,
    producto_codigo: producto.codigo, producto_nombre: producto.nombre, presentacion_kg: producto.presentacion_kg,
    presentacion: producto.presentacion, unidades_por_pallet: producto.unidades_por_pallet, url_web: producto.url_web,
    vida_util_meses: producto.vida_util_meses, linea_nombre: linea?.nombre ?? null,
    receta_codigo: receta.codigo, receta_version: receta.version, receta_vigente_desde: receta.vigente_desde,
    items,
    lote: lote ? { ...lote, borrador: undefined } : null,
    lote_codigo: lote?.codigo ?? null,
    consumo_sugerido,
  };
}

/* ------------------------------------------------------------------ */
/* CU-P02 Registrar Ejecución de Producción y Consumo                   */
/* ------------------------------------------------------------------ */

export async function planificarOrden(usuario: UsuarioActual, id: number) {
  const op = await getOpRow(id);
  if (op.estado !== 'CREADA') throw noSePuede(`Sólo se puede planificar una orden CREADA (actual: ${op.estado})`);
  return guardarOrden(usuario, {
    producto_id: op.producto_id, linea_id: op.linea_id, cantidad_kg: op.cantidad_kg,
    fecha_proyectada: op.fecha_proyectada.toISOString().slice(0, 10), hora_prevista: op.hora_prevista,
    observaciones: op.observaciones, accion: 'PLANIFICAR',
  }, op.id);
}

export function iniciarProduccion(usuario: UsuarioActual, id: number) {
  return tx(async () => {
    const op = await getOpRow(id);
    if (op.estado !== 'PLANIFICADA') throw noSePuede(`La orden debe estar PLANIFICADA para iniciar (actual: ${op.estado})`);
    const producto = await db().producto.findUniqueOrThrow({ where: { id: op.producto_id } });

    // Código del lote: L-[producto]-[año][semana]-[número de lote de la semana]
    const { anio, semana } = semanaISO(ahora());
    const prefijo = `L-${producto.codigo}-${anio}${rellenar(semana, 2)}-`;
    const usados = await db().ordenProduccion.count({ where: { lote_codigo_previsto: { startsWith: prefijo } } });
    const codigoLote = `${prefijo}${rellenar(usados + 1, 2)}`;
    const vencimiento = sumarMeses(ahora(), producto.vida_util_meses);

    await db().ordenProduccion.update({
      where: { id: op.id },
      data: {
        estado: 'EN_PRODUCCION', inicio_real: ahora(), operador: usuario.nombre,
        lote_codigo_previsto: codigoLote, vencimiento_previsto: aFechaDb(vencimiento),
      },
    });
    await auditar(usuario, 'OP_INICIADA', op.numero, 'Inicio de elaboración y asignación de lote',
      { op_id: op.id, resultado: 'OP En producción' });
    return getOrden(op.id);
  });
}

export function pausarLinea(usuario: UsuarioActual, id: number, motivo?: string | null) {
  return tx(async () => {
    const op = await getOpRow(id);
    if (op.estado !== 'EN_PRODUCCION') throw noSePuede('Sólo se puede pausar una orden EN_PRODUCCION');
    if (op.pausada) throw noSePuede('La línea ya está pausada');
    const texto = String(motivo ?? '').trim();
    if (!texto) throw datosInvalidos('Indicá el motivo de la pausa');
    await db().ordenProduccion.update({ where: { id: op.id }, data: { pausada: true, motivo_pausa: texto } });
    await auditar(usuario, 'LINEA_PAUSADA', op.numero, `Pausa de línea · ${texto}`, { op_id: op.id, resultado: 'En producción (pausada)' });
    return getOrden(op.id);
  });
}

export function reanudarLinea(usuario: UsuarioActual, id: number) {
  return tx(async () => {
    const op = await getOpRow(id);
    if (op.estado !== 'EN_PRODUCCION' || !op.pausada) throw noSePuede('La línea no está pausada');
    await db().ordenProduccion.update({ where: { id: op.id }, data: { pausada: false } });
    await auditar(usuario, 'LINEA_REANUDADA', op.numero, 'Reanudación de línea', { op_id: op.id, resultado: 'OP En producción' });
    return getOrden(op.id);
  });
}

/** "Guardar avance": deja anotado lo cargado hasta ahora, sin descontar stock ni cerrar nada. */
export async function guardarAvance(
  usuario: UsuarioActual, id: number,
  cuerpo: { consumos?: FilaConsumo[]; cantidad_real_kg?: unknown; bultos?: unknown },
) {
  const op = await getOpRow(id);
  if (op.estado !== 'EN_PRODUCCION') throw noSePuede('Sólo se puede guardar el avance de una orden EN_PRODUCCION');
  const avance = {
    consumos: Array.isArray(cuerpo.consumos) ? cuerpo.consumos : [],
    cantidad_real_kg: cuerpo.cantidad_real_kg ?? null,
    bultos: cuerpo.bultos ?? null,
    guardado_por: usuario.nombre,
    guardado_en: ahora().toISOString(),
  };
  await db().ordenProduccion.update({ where: { id: op.id }, data: { avance: JSON.parse(JSON.stringify(avance)) as Prisma.InputJsonValue } });
  return getOrden(op.id);
}

/**
 * Cierra la elaboración: descuenta las partidas usadas, calcula la merma y crea el lote en CUARENTENA.
 * Todo ocurre dentro de una transacción: o se hace completo o no se hace nada.
 */
export function finalizarElaboracion(
  usuario: UsuarioActual, id: number,
  cuerpo: { consumos: FilaConsumo[]; cantidad_real_kg: unknown; bultos?: unknown },
) {
  return tx(async () => {
    const op = await getOpRow(id);
    if (op.estado !== 'EN_PRODUCCION') throw noSePuede(`La orden debe estar EN_PRODUCCION (actual: ${op.estado})`);
    if (op.pausada) throw noSePuede('La línea está pausada: reanudala antes de finalizar la elaboración');

    const neto = aNumero(cuerpo.cantidad_real_kg);
    if (!(neto > 0)) throw datosInvalidos('Ingresá la cantidad neta elaborada');
    const producto = await db().producto.findUniqueOrThrow({ where: { id: op.producto_id } });
    const bultos = Number.isNaN(aNumero(cuerpo.bultos)) ? Math.round(neto / producto.presentacion_kg) : Math.round(aNumero(cuerpo.bultos));
    if (bultos < 0) throw datosInvalidos('Las bolsas conformadas no pueden ser negativas');
    if (!Array.isArray(cuerpo.consumos)) throw datosInvalidos('Faltan los consumos de insumos');

    const items = await db().opItem.findMany({ where: { op_id: op.id }, include: { insumo: true } });
    const idsPedidos = cuerpo.consumos.map((f) => Number(f.partida_id) || 0);
    const partidasPedidas = new Map((await db().partidaInsumo.findMany({ where: { id: { in: idsPedidos } } })).map((p) => [p.id, p]));

    // 1) Validar cada fila de consumo
    const porInsumo = new Map<number, number>(); // total consumido de cada insumo
    const porPartida = new Map<number, number>(); // total pedido a cada partida
    const validos: { insumo_id: number; partida_id: number; cantidad: number }[] = [];
    for (const fila of cuerpo.consumos) {
      const cantidad = aNumero(fila.cantidad);
      if (!(cantidad > 0)) continue; // las filas en cero se ignoran
      const partida = partidasPedidas.get(Number(fila.partida_id) || 0);
      if (!partida) throw datosInvalidos('Hay un consumo sin lote de origen');
      if (partida.insumo_id !== Number(fila.insumo_id)) throw datosInvalidos(`La partida ${partida.nro_lote} no corresponde a ese insumo`);
      if (!items.some((i) => i.insumo_id === partida.insumo_id)) throw datosInvalidos(`La partida ${partida.nro_lote} no pertenece a la receta de la orden`);
      if (partida.estado !== 'LIBERADO') throw noSePuede(`La partida ${partida.nro_lote} no está liberada`);
      porInsumo.set(partida.insumo_id, (porInsumo.get(partida.insumo_id) ?? 0) + cantidad);
      porPartida.set(partida.id, (porPartida.get(partida.id) ?? 0) + cantidad);
      validos.push({ insumo_id: partida.insumo_id, partida_id: partida.id, cantidad });
    }

    // 2) Saldo suficiente en cada partida (si no alcanza, hay que dividir el consumo)
    for (const [partidaId, total] of porPartida) {
      const partida = partidasPedidas.get(partidaId)!;
      if (total > partida.cantidad + 1e-9) {
        throw noSePuede(`La partida ${partida.nro_lote} tiene saldo ${redondear(partida.cantidad)} y se intenta consumir ${redondear(total)}. Dividí el consumo en otra partida.`);
      }
    }

    // 3) Trazabilidad: cada insumo crítico necesita al menos un lote de origen
    for (const item of items.filter((i) => i.insumo.critico)) {
      if (!porInsumo.get(item.insumo_id)) throw noSePuede(`Falta asignar un lote de origen para "${item.insumo.nombre}"`);
    }

    // 4) Merma = materias primas consumidas - kilos netos elaborados
    const kgConsumidos = items.filter((i) => i.insumo.tipo === 'MP').reduce((a, i) => a + (porInsumo.get(i.insumo_id) ?? 0), 0);
    if (neto > kgConsumidos + 1e-9) {
      throw noSePuede(`La cantidad neta (${neto} kg) no puede superar las materias primas consumidas (${redondear(kgConsumidos)} kg)`);
    }
    const mermaKg = redondear(kgConsumidos - neto, 2);
    const mermaPct = kgConsumidos > 0 ? redondear((mermaKg / kgConsumidos) * 100, 2) : 0;

    // 5) Descontar stock y registrar el consumo real
    for (const fila of validos) {
      await db().partidaInsumo.update({ where: { id: fila.partida_id }, data: { cantidad: { decrement: fila.cantidad } } });
    }
    await db().consumo.createMany({ data: validos.map((f) => ({ ...f, op_id: op.id })) });

    // 6) Crear el lote en CUARENTENA y pasar la orden a control de calidad
    const fin = ahora();
    const lote = await db().loteProduccion.create({
      data: {
        codigo: op.lote_codigo_previsto!, op_id: op.id, producto_id: op.producto_id, cantidad_kg: neto, bultos,
        vencimiento: op.vencimiento_previsto!, estado: 'CUARENTENA', creado_en: fin,
      },
    });
    await db().ordenProduccion.update({
      where: { id: op.id },
      data: {
        estado: 'EN_CONTROL_CALIDAD', cantidad_real_kg: neto, bultos, merma_kg: mermaKg, merma_pct: mermaPct,
        fin_elaboracion: fin, avance: Prisma.DbNull,
      },
    });
    await auditar(usuario, 'LOTE_EN_CUARENTENA', lote.codigo, `Fin de elaboración · ${neto} kg netos`,
      { op_id: op.id, lote_id: lote.id, resultado: 'Lote Cuarentena' });
    return { orden: await getOrden(op.id), lote_id: lote.id, merma_kg: mermaKg, merma_pct: mermaPct };
  });
}
