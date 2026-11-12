/**
 * Trazabilidad de lote (bidireccional):
 * hacia atrás (de qué partidas de proveedor está hecho), qué pasó en planta y calidad,
 * y hacia adelante (a qué depósito y a qué cliente fue).
 */
import { db } from '../db.js';
import { datosInvalidos, noExiste } from '../errores.js';
import { etiquetaPallet, leerGS1 } from './gs1.js';

/** Arma la ficha completa de un lote. */
export async function traceLote(loteId: number) {
  const lote = await db().loteProduccion.findUnique({
    where: { id: loteId },
    include: {
      producto: { include: { categoria: true } },
      orden: { include: { linea: true, receta: true } },
      control: true,
      stock: { orderBy: { id: 'asc' } },
      pallets: { orderBy: { id: 'asc' } },
      despachos: { orderBy: { id: 'asc' } },
    },
  });
  if (!lote) throw noExiste('Lote inexistente');
  const { producto, orden, control, stock, pallets, despachos, borrador: _b, ...datosLote } = lote;

  // Hacia atrás: cada insumo con las partidas de proveedor que se usaron
  const consumos = await db().consumo.findMany({
    where: { op_id: orden.id }, include: { insumo: true, partida: true }, orderBy: [{ insumo_id: 'asc' }, { id: 'asc' }],
  });
  consumos.sort((a, b) => (a.insumo.tipo === b.insumo.tipo ? 0 : a.insumo.tipo === 'MP' ? -1 : 1));
  const origen: {
    insumo_id: number; insumo_codigo: string; insumo_nombre: string; unidad: string; tipo: string; total: number;
    proveedores: string[]; lotes: { nro_lote: string; cantidad: number; documento_origen: string | null }[];
  }[] = [];
  for (const c of consumos) {
    let grupo = origen.find((g) => g.insumo_id === c.insumo_id);
    if (!grupo) {
      grupo = {
        insumo_id: c.insumo_id, insumo_codigo: c.insumo.codigo, insumo_nombre: c.insumo.nombre, unidad: c.insumo.unidad,
        tipo: c.insumo.tipo, total: 0, proveedores: [], lotes: [],
      };
      origen.push(grupo);
    }
    grupo.total += c.cantidad;
    if (c.partida.proveedor && !grupo.proveedores.includes(c.partida.proveedor)) grupo.proveedores.push(c.partida.proveedor);
    grupo.lotes.push({ nro_lote: c.partida.nro_lote, cantidad: c.cantidad, documento_origen: c.partida.documento_origen });
  }
  const kgConsumidos = consumos.filter((c) => c.insumo.tipo === 'MP').reduce((a, c) => a + c.cantidad, 0);

  // Historial: todo lo que pasó con la orden y con el lote (sin las alertas internas)
  const historial = (await db().auditoria.findMany({
    where: { OR: [{ op_id: orden.id }, { lote_id: lote.id }], NOT: { accion: { startsWith: 'ALERTA' } }, detalle: { not: null } },
    orderBy: [{ fecha: 'asc' }, { id: 'asc' }],
  })).map((h) => ({ fecha: h.fecha, evento: h.detalle, usuario: h.usuario, resultado: h.resultado }));

  const ingreso = stock[0] ?? null;
  const documentos = [{ tipo: 'Orden y parte de elaboración', codigo: orden.numero, fecha: orden.creado_en }];
  if (control) documentos.push({ tipo: 'Protocolo de calidad firmado', codigo: `${control.protocolo} · ${control.formulario}`, fecha: control.fecha });
  if (ingreso) documentos.push({ tipo: 'Comprobante de recepción', codigo: ingreso.comprobante, fecha: ingreso.fecha });

  const { linea, receta, avance: _a, ...datosOrden } = orden;
  return {
    tipo: 'LOTE' as const,
    lote: {
      ...datosLote, producto_codigo: producto.codigo, producto_nombre: producto.nombre, presentacion_kg: producto.presentacion_kg, gtin: producto.gtin,
      presentacion: producto.presentacion, url_web: producto.url_web, categoria_nombre: producto.categoria?.nombre ?? null,
    },
    op: { ...datosOrden, linea_nombre: linea?.nombre ?? null, receta_codigo: receta.codigo, receta_version: receta.version },
    origen,
    resumen_origen: { insumos: origen.length, partidas: consumos.length },
    kg_consumidos: kgConsumidos,
    calidad: control,
    ingreso,
    pallets: pallets.map((p) => ({ ...p, gs1: etiquetaPallet(producto.gtin, lote.codigo, lote.vencimiento, p.kg) })),
    stock_vendible_kg: stock.reduce((a, s) => a + s.cantidad_kg, 0),
    despachos,
    despachado_kg: despachos.reduce((a, d) => a + d.cantidad_kg, 0),
    historial,
    documentos,
    ultimo_movimiento: historial.at(-1) ?? null,
  };
}

/** Lotes que usaron una partida de insumo (hacia adelante desde el proveedor). */
async function lotesDePartida(partidaId: number) {
  const consumos = await db().consumo.findMany({
    where: { partida_id: partidaId },
    include: { orden: { include: { lote: { include: { producto: true, despachos: { orderBy: { id: 'asc' } } } } } } },
  });
  const vistos = new Map<number, NonNullable<(typeof consumos)[number]['orden']['lote']>>();
  for (const c of consumos) if (c.orden.lote) vistos.set(c.orden.lote.id, c.orden.lote);
  return [...vistos.values()]
    .sort((a, b) => a.id - b.id)
    .map((l) => ({
      id: l.id, codigo: l.codigo, estado: l.estado, cantidad_kg: l.cantidad_kg, producto_nombre: l.producto.nombre,
      despachos: l.despachos.map((d) => ({ cliente: d.cliente, cantidad_kg: d.cantidad_kg, fecha: d.fecha })),
    }));
}

const igual = (texto: string) => ({ equals: texto, mode: 'insensitive' as const });

/**
 * Busca por código de lote, número de orden, pallet, lote de origen de un insumo
 * o por el contenido de una etiqueta GS1-128 escaneada.
 * Devuelve la ficha del lote, la lista de lotes si hay varias coincidencias, o las partidas.
 */
export async function buscar(texto: unknown) {
  let q = String(texto ?? '').trim();
  if (!q) throw datosInvalidos('Ingresá un lote, una orden o un identificador');

  const gs1 = leerGS1(q);
  if (gs1) {
    if (!gs1.lote) throw datosInvalidos('La etiqueta GS1 no tiene el número de lote (IA 10)');
    q = gs1.lote;
  }

  const lote = await db().loteProduccion.findFirst({ where: { codigo: igual(q) }, select: { id: true } });
  if (lote) return traceLote(lote.id);

  const porOrden = await db().loteProduccion.findFirst({ where: { orden: { numero: igual(q) } }, select: { id: true } });
  if (porOrden) return traceLote(porOrden.id);

  const porPallet = await db().pallet.findFirst({ where: { codigo: igual(q) } });
  if (porPallet) return traceLote(porPallet.lote_id);

  const partidas = await db().partidaInsumo.findMany({ where: { nro_lote: igual(q) }, include: { insumo: true }, orderBy: { id: 'asc' } });
  if (partidas.length) {
    return {
      tipo: 'PARTIDA' as const,
      partidas: await Promise.all(partidas.map(async ({ insumo, ...p }) => ({ ...p, insumo_nombre: insumo.nombre, lotes: await lotesDePartida(p.id) }))),
    };
  }

  const parecidos = await db().loteProduccion.findMany({
    where: { codigo: { contains: q, mode: 'insensitive' } }, include: { producto: true }, orderBy: { id: 'desc' }, take: 20,
  });
  if (parecidos.length === 1) return traceLote(parecidos[0].id);
  if (parecidos.length > 1) {
    return {
      tipo: 'LISTA' as const,
      lotes: parecidos.map((l) => ({ id: l.id, codigo: l.codigo, estado: l.estado, cantidad_kg: l.cantidad_kg, producto_nombre: l.producto.nombre })),
    };
  }
  throw noExiste(`No se encontró ningún lote, orden o identificador que coincida con "${q}"`);
}
