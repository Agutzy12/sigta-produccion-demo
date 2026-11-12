/**
 * CU-P04 Registrar Ingreso de Producto Terminado y Cierre de OP
 * Más el despacho de ejemplo, que sirve para mostrar el bloqueo de lotes no liberados.
 */
import { db, tx } from '../db.js';
import { ahora } from '../clock.js';
import { BULTOS_POR_PALLET, UBICACIONES } from '../config.js';
import { bloqueado, datosInvalidos, noExiste, noSePuede } from '../errores.js';
import { redondear, rellenar, aNumero, auditar, type UsuarioActual } from './comun.js';
import { etiquetaPallet } from './gs1.js';

/** Lotes liberados por calidad que todavía no entraron a depósito. */
export async function recepcionesPendientes() {
  const ordenes = await db().ordenProduccion.findMany({
    where: { estado: 'EN_CONTROL_CALIDAD', lote: { estado: 'APROBADO_LIBERADO', control: { isNot: null } } },
    include: { producto: true, lote: { include: { control: true } } },
  });
  return ordenes
    .map((o) => ({
      op_id: o.id, op_numero: o.numero, lote_id: o.lote!.id, lote_codigo: o.lote!.codigo,
      cantidad_kg: o.lote!.cantidad_kg, bultos: o.lote!.bultos, vencimiento: o.lote!.vencimiento,
      producto_codigo: o.producto.codigo, producto_nombre: o.producto.nombre, liberado_en: o.lote!.control!.fecha,
    }))
    .sort((a, b) => b.liberado_en.getTime() - a.liberado_en.getTime());
}

/**
 * Reparte las bolsas en pallets de BULTOS_POR_PALLET.
 * Ejemplo: 49 bolsas -> un pallet de 25 y otro de 24. Los kilos se reparten en proporción.
 */
export async function armarPallets(bultos: number, kg: number, anio: number) {
  const ultimo = await db().pallet.count();
  const cantidad = Math.ceil(bultos / BULTOS_POR_PALLET);
  const pallets: { codigo: string; bultos: number; kg: number }[] = [];
  let kgAsignados = 0;
  for (let i = 0; i < cantidad; i++) {
    const enEste = i < cantidad - 1 ? BULTOS_POR_PALLET : bultos - BULTOS_POR_PALLET * (cantidad - 1);
    const esElUltimo = i === cantidad - 1;
    const kgEste = esElUltimo ? redondear(kg - kgAsignados, 2) : redondear((kg * enEste) / bultos, 2);
    kgAsignados += kgEste;
    pallets.push({ codigo: `PAL-${anio}-${rellenar(ultimo + i + 1, 5)}`, bultos: enEste, kg: kgEste });
  }
  return pallets;
}

/** Datos de la pantalla de ingreso a depósito para una orden. */
export async function getRecepcion(opId: number) {
  const op = await db().ordenProduccion.findUnique({ where: { id: Number(opId) || 0 }, include: { producto: true, lote: { include: { control: true } } } });
  if (!op) throw noExiste('Orden de producción inexistente');
  const { producto, lote, ...orden } = op;
  if (!lote) throw noSePuede('Esta orden todavía no generó un lote');
  const { control, borrador: _b, ...datosLote } = lote;

  let habilitado = true;
  let motivo: string | null = null;
  if (op.estado === 'FINALIZADA') { habilitado = false; motivo = 'Este lote ya fue recibido en depósito.'; }
  else if (lote.estado === 'CUARENTENA') { habilitado = false; motivo = 'El lote está en cuarentena: no se puede recibir hasta que Calidad lo libere.'; }
  else if (lote.estado === 'RECHAZADO_BLOQUEADO') { habilitado = false; motivo = 'El lote fue rechazado y bloqueado por Calidad.'; }
  else if (op.estado !== 'EN_CONTROL_CALIDAD') { habilitado = false; motivo = `La orden está en estado ${op.estado}.`; }

  const anio = (op.cierre ?? ahora()).getFullYear();
  return {
    habilitado,
    motivo,
    op: { ...orden, avance: undefined },
    lote: datosLote,
    producto,
    certificado: control,
    pallets_previstos: await armarPallets(lote.bultos, lote.cantidad_kg, anio),
    comprobante: `REC-${op.numero.slice(3)}`,
    ubicaciones: UBICACIONES,
  };
}

export interface DatosIngreso {
  op_id: number; bultos_recibidos: unknown; kg_conformes: unknown; bultos_danados?: unknown; merma_kg?: unknown;
  justificacion?: string | null; deposito?: string; sector?: string; rack?: string; nivel?: string; camara?: string | null;
}

export function ingresarProductoTerminado(usuario: UsuarioActual, cuerpo: DatosIngreso) {
  return tx(async () => {
    const op = await db().ordenProduccion.findUnique({ where: { id: Number(cuerpo.op_id) || 0 }, include: { producto: true } });
    if (!op) throw noExiste('Orden de producción inexistente');
    const lote = await db().loteProduccion.findUnique({ where: { op_id: op.id } });
    if (!lote) throw noSePuede('La orden todavía no generó un lote');
    if (lote.estado !== 'APROBADO_LIBERADO') {
      throw noSePuede(`Sólo se pueden recibir lotes aprobados y liberados. Este lote está en estado ${lote.estado}.`);
    }
    if (op.estado !== 'EN_CONTROL_CALIDAD') throw noSePuede(`La orden debe estar EN_CONTROL_CALIDAD (actual: ${op.estado})`);

    const bultos = Math.round(aNumero(cuerpo.bultos_recibidos));
    const kg = aNumero(cuerpo.kg_conformes);
    const danados = Number.isNaN(aNumero(cuerpo.bultos_danados)) ? 0 : Math.round(aNumero(cuerpo.bultos_danados));
    const merma = Number.isNaN(aNumero(cuerpo.merma_kg)) ? 0 : aNumero(cuerpo.merma_kg);
    if (!(bultos > 0)) throw datosInvalidos('Ingresá los bultos recibidos');
    if (!(kg > 0)) throw datosInvalidos('Ingresá los kilogramos conformes');
    if (danados < 0 || merma < 0) throw datosInvalidos('Los bultos dañados y la merma no pueden ser negativos');
    if (bultos > lote.bultos) throw noSePuede(`Se informan ${bultos} bultos y el lote sólo tiene ${lote.bultos}`);

    const diferencia = redondear(lote.cantidad_kg - kg - merma, 2);
    if (diferencia < 0) throw noSePuede('Los kilos conformes más la merma superan lo elaborado');
    const hayDesvio = danados > 0 || merma > 0 || diferencia > 0;
    const justificacion = String(cuerpo.justificacion ?? '').trim();
    if (hayDesvio && !justificacion) throw datosInvalidos('Justificá el daño, la merma o la diferencia de kilos');

    const { deposito, sector, rack, nivel } = cuerpo;
    if (!deposito || !sector || !rack || !nivel) throw datosInvalidos('Completá depósito, sector, rack y nivel');
    if (!UBICACIONES.depositos.includes(deposito) || !UBICACIONES.sectores.includes(sector)
      || !UBICACIONES.racks.includes(rack) || !UBICACIONES.niveles.includes(nivel)) {
      throw datosInvalidos('La ubicación elegida no existe');
    }
    const llevaCamara = UBICACIONES.sectoresConCamara.includes(sector);
    if (llevaCamara && !cuerpo.camara) throw datosInvalidos('Elegí la cámara de frío');

    const momento = ahora();
    const pallets = await armarPallets(bultos, kg, momento.getFullYear());
    const comprobante = `REC-${op.numero.slice(3)}`;

    await db().pallet.createMany({ data: pallets.map((p) => ({ ...p, lote_id: lote.id })) });
    // El trigger de la base rechaza este INSERT si el lote no está aprobado y liberado
    await db().stockPT.create({
      data: {
        lote_id: lote.id, comprobante, deposito, sector, rack, nivel, camara: llevaCamara ? cuerpo.camara! : null,
        bultos, pallets: pallets.length, kg_recibidos: kg, cantidad_kg: kg, bultos_danados: danados, merma_kg: merma,
        justificacion: justificacion || null, recibido_por: usuario.nombre, fecha: momento,
      },
    });
    await db().ordenProduccion.update({ where: { id: op.id }, data: { estado: 'FINALIZADA', cierre: momento } });
    await auditar(usuario, 'OP_FINALIZADA', op.numero, `Recepción de ${pallets.length} pallets · ${kg} kg`,
      { op_id: op.id, lote_id: lote.id, resultado: 'OP Finalizada' });
    return {
      comprobante,
      pallets: pallets.map((p) => ({ ...p, gs1: etiquetaPallet(op.producto.gtin, lote.codigo, lote.vencimiento, p.kg) })),
      orden_id: op.id,
      lote_id: lote.id,
    };
  });
}

export async function stockPT() {
  const filas = await db().stockPT.findMany({
    where: { cantidad_kg: { gt: 0 } }, orderBy: { id: 'asc' }, include: { lote: { include: { producto: true } } },
  });
  return filas.map(({ lote, ...s }) => ({ ...s, lote_codigo: lote.codigo, vencimiento: lote.vencimiento, producto_nombre: lote.producto.nombre }));
}

/**
 * Despacho de ejemplo: descuenta stock de un lote.
 * Si el lote no está aprobado y liberado, el sistema lo bloquea (código 423).
 */
export async function despachar(usuario: UsuarioActual, cuerpo: { lote_id: unknown; cantidad_kg: unknown; cliente?: unknown }) {
  const lote = await db().loteProduccion.findUnique({ where: { id: Number(cuerpo.lote_id) || 0 } });
  if (!lote) throw noExiste('Lote inexistente');
  const kg = aNumero(cuerpo.cantidad_kg);
  if (!(kg > 0)) throw datosInvalidos('La cantidad a despachar debe ser mayor a 0');
  const cliente = String(cuerpo.cliente ?? '').trim();
  if (!cliente) throw datosInvalidos('Indicá el cliente');

  if (lote.estado !== 'APROBADO_LIBERADO') {
    // Se registra fuera de la transacción para que el intento bloqueado quede en la auditoría
    await auditar(usuario, 'DESPACHO_BLOQUEADO', lote.codigo, 'Intento de despacho bloqueado',
      { op_id: lote.op_id, lote_id: lote.id, resultado: `Rechazado: lote ${lote.estado}` });
    throw bloqueado(`Despacho bloqueado: el lote ${lote.codigo} está en estado ${lote.estado} y sólo se pueden despachar lotes aprobados y liberados.`);
  }

  return tx(async () => {
    const stock = await db().stockPT.findMany({ where: { lote_id: lote.id, cantidad_kg: { gt: 0 } }, orderBy: { id: 'asc' } });
    const disponible = stock.reduce((a, s) => a + s.cantidad_kg, 0);
    if (kg > disponible + 1e-9) throw noSePuede(`Stock insuficiente del lote ${lote.codigo}: hay ${redondear(disponible)} kg`);

    let resto = kg;
    for (const fila of stock) {
      const tomar = Math.min(resto, fila.cantidad_kg);
      await db().stockPT.update({ where: { id: fila.id }, data: { cantidad_kg: redondear(fila.cantidad_kg - tomar, 3) } });
      resto -= tomar;
      if (resto <= 1e-9) break;
    }
    await db().despacho.create({ data: { lote_id: lote.id, cliente, cantidad_kg: kg, fecha: ahora(), usuario: usuario.nombre } });
    await auditar(usuario, 'DESPACHO', lote.codigo, `Despacho de ${kg} kg a ${cliente}`,
      { op_id: lote.op_id, lote_id: lote.id, resultado: 'Stock descontado' });
    return { ok: true, lote: lote.codigo, cantidad_kg: kg, cliente };
  });
}
