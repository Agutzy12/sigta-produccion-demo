/**
 * Catálogos (productos, líneas, recetas) y stock de insumos.
 */
import { db } from '../db.js';
import { ahora } from '../clock.js';
import { datosInvalidos, noExiste } from '../errores.js';
import { redondear, aNumero, auditar, fechaLocal, type UsuarioActual } from './comun.js';

/** Estados de orden que reservan insumos (planificar no descuenta, pero sí reserva). */
const ESTADOS_QUE_RESERVAN = ['PLANIFICADA', 'EN_PRODUCCION'] as const;

/** Stock físico, reservado por órdenes planificadas y disponible de cada insumo. */
export async function stockInsumos() {
  const [insumos, stock, reservado] = await Promise.all([
    db().insumo.findMany({ orderBy: { id: 'asc' } }),
    db().partidaInsumo.groupBy({ by: ['insumo_id'], where: { estado: 'LIBERADO' }, _sum: { cantidad: true } }),
    db().opItem.groupBy({
      by: ['insumo_id'],
      where: { orden: { estado: { in: [...ESTADOS_QUE_RESERVAN] } } },
      _sum: { cantidad_teorica: true },
    }),
  ]);
  const stockDe = new Map(stock.map((s) => [s.insumo_id, s._sum.cantidad ?? 0]));
  const reservadoDe = new Map(reservado.map((r) => [r.insumo_id, r._sum.cantidad_teorica ?? 0]));
  return insumos.map((i) => {
    const fisico = redondear(stockDe.get(i.id) ?? 0);
    const reservadoInsumo = redondear(reservadoDe.get(i.id) ?? 0);
    const disponible = redondear(fisico - reservadoInsumo);
    return { ...i, stock: fisico, reservado: reservadoInsumo, disponible, bajo: disponible < i.stock_minimo };
  });
}

/**
 * Partidas con saldo de un insumo, ordenadas por vencimiento (primero la que vence antes: FEFO).
 * Las que no tienen vencimiento (bolsas, etiquetas) van al final por orden de llegada.
 */
export function partidasDisponibles(insumoId: number) {
  return db().partidaInsumo.findMany({
    where: { insumo_id: insumoId, estado: 'LIBERADO', cantidad: { gt: 0 } },
    orderBy: [{ vencimiento: { sort: 'asc', nulls: 'last' } }, { ingreso: 'asc' }, { id: 'asc' }],
  });
}

export async function listInsumos() {
  const lista = await stockInsumos();
  return Promise.all(lista.map(async (i) => ({ ...i, partidas: await partidasDisponibles(i.id) })));
}

export const listLineas = () => db().linea.findMany({ orderBy: { id: 'asc' } });

/** Receta vigente de un producto (la activa de versión más alta). */
export const recetaVigente = (productoId: number) =>
  db().receta.findFirst({ where: { producto_id: productoId, activa: true }, orderBy: { version: 'desc' } });

/** Productos con su receta vigente. */
export async function listProductos() {
  const productos = await db().producto.findMany({
    orderBy: { id: 'asc' },
    include: { recetas: { where: { activa: true }, orderBy: { version: 'desc' }, take: 1 } },
  });
  return productos
    .filter((p) => p.recetas.length > 0)
    .map(({ recetas: [r], ...p }) => ({
      ...p,
      receta_id: r.id,
      receta_codigo: r.codigo,
      receta_version: r.version,
      receta_vigente_desde: r.vigente_desde,
      receta_base_kg: r.base_kg,
    }));
}

/** Receta con sus componentes (botón "Ver receta"). */
export async function getReceta(id: number) {
  const receta = await db().receta.findUnique({
    where: { id },
    include: { producto: true, items: { include: { insumo: true } } },
  });
  if (!receta) throw noExiste('Receta inexistente');
  const items = receta.items
    .map((ri) => ({
      codigo: ri.insumo.codigo, nombre: ri.insumo.nombre, tipo: ri.insumo.tipo, unidad: ri.insumo.unidad,
      critico: ri.insumo.critico, cantidad_base: ri.cantidad_base, insumo_id: ri.insumo_id,
    }))
    .sort((a, b) => (a.tipo === b.tipo ? a.insumo_id - b.insumo_id : a.tipo === 'MP' ? -1 : 1));
  const { producto, items: _, ...resto } = receta;
  return { ...resto, producto_nombre: producto.nombre, producto_codigo: producto.codigo, items };
}

/** Herramienta de la demo: simula la llegada de mercadería (lo hará el módulo de Compras). */
export async function reponerStock(usuario: UsuarioActual, cuerpo: { insumo_id: unknown; cantidad: unknown }) {
  const insumo = await db().insumo.findUnique({ where: { id: Number(cuerpo.insumo_id) || 0 } });
  if (!insumo) throw noExiste('Insumo inexistente');
  const cantidad = aNumero(cuerpo.cantidad);
  if (!(cantidad > 0)) throw datosInvalidos('La cantidad debe ser mayor a 0');
  const hoy = fechaLocal(ahora()).replaceAll('-', '');
  const prefijo = `REP-${hoy}-${insumo.codigo}`;
  const previas = await db().partidaInsumo.count({ where: { nro_lote: { startsWith: prefijo } } });
  const nro = `${prefijo}${previas ? `-${previas + 1}` : ''}`;
  await db().partidaInsumo.create({
    data: {
      insumo_id: insumo.id, nro_lote: nro, proveedor: 'Reposición (demo)', cantidad, vencimiento: null,
      documento_origen: `REM-${nro}`, estado: 'LIBERADO', ingreso: ahora(),
    },
  });
  await auditar(usuario, 'REPOSICION_STOCK', insumo.codigo, `Ingreso de ${cantidad} ${insumo.unidad} de ${insumo.nombre}`);
  return { ok: true, partida: nro };
}
