/**
 * CU-P03 Registrar Control de Calidad de Lote
 * El técnico carga las determinaciones, el sistema las compara con la especificación
 * y firma el dictamen: lote liberado o lote bloqueado.
 */
import { Prisma, type Producto } from '@prisma/client';
import { db, tx } from '../db.js';
import { ahora } from '../clock.js';
import { FORMULARIO_CALIDAD } from '../config.js';
import { datosInvalidos, noExiste, noSePuede } from '../errores.js';
import { aNumero, auditar, type UsuarioActual } from './comun.js';

type Especificable = Pick<Producto, 'humedad_max' | 'ph_min' | 'ph_max' | 'ufc_max' | 'color_esperado'>;

/**
 * Especificación de ejemplo de un producto (NO son límites normativos: son valores de la demo).
 * `opciones` son las que aparecen en las listas desplegables de la pantalla.
 */
export function especificacion(p: Especificable) {
  return {
    humedad_max: p.humedad_max,
    ph_min: p.ph_min,
    ph_max: p.ph_max,
    ufc_max: p.ufc_max,
    aroma: { esperado: 'Característico', texto: 'Característico, sin olores extraños', opciones: ['Característico', 'Atípico'] },
    color: { esperado: p.color_esperado, texto: p.color_esperado, opciones: [p.color_esperado, 'No uniforme'] },
    sabor: { esperado: 'Característico', texto: 'Característico, sin notas extrañas', opciones: ['Característico', 'Extraño'] },
  };
}
type Especificacion = ReturnType<typeof especificacion>;

export interface Ensayo { humedad: number; ph: number; ufc: number; aroma: string; color: string; sabor: string }

/** Compara los resultados contra la especificación. Devuelve true/false por determinación. */
export function evaluarEnsayo(espec: Especificacion, e: Ensayo) {
  return {
    humedad: e.humedad <= espec.humedad_max,
    ph: e.ph >= espec.ph_min && e.ph <= espec.ph_max,
    aroma: e.aroma === espec.aroma.esperado,
    color: e.color === espec.color.esperado,
    sabor: e.sabor === espec.sabor.esperado,
    ufc: e.ufc <= espec.ufc_max,
  };
}

async function leerLote(id: number) {
  const lote = await db().loteProduccion.findUnique({
    where: { id: Number(id) || 0 },
    include: { orden: true, producto: true },
  });
  if (!lote) throw noExiste('Lote inexistente');
  return lote;
}
type LoteLeido = Awaited<ReturnType<typeof leerLote>>;

function aplanar(lote: LoteLeido) {
  const { orden, producto, ...resto } = lote;
  return {
    ...resto,
    op_numero: orden.numero, op_id: orden.id, op_estado: orden.estado, op_fin: orden.fin_elaboracion,
    producto_codigo: producto.codigo, producto_nombre: producto.nombre,
  };
}

/** Todo lo que necesita la pantalla de calidad para un lote. */
export async function getLoteCalidad(id: number) {
  const lote = await leerLote(id);
  const anio = lote.creado_en.getFullYear();
  return {
    ...aplanar(lote),
    especificacion: especificacion(lote.producto),
    documentos: [
      { tipo: 'Parte de elaboración', codigo: lote.orden.numero, fecha: lote.orden.fin_elaboracion },
      { tipo: 'Ensayo microbiológico', codigo: `LAB-${anio}-${String(lote.id + 441).padStart(5, '0')}`, fecha: lote.creado_en },
    ],
  };
}

/** Lotes esperando análisis (columna izquierda de la pantalla). */
export async function lotesCuarentena() {
  const lista = await db().loteProduccion.findMany({
    where: { estado: 'CUARENTENA' }, orderBy: [{ creado_en: 'desc' }, { id: 'desc' }], select: { id: true },
  });
  return Promise.all(lista.map((l) => getLoteCalidad(l.id)));
}

function leerEnsayo(cuerpo: Record<string, unknown>): Ensayo {
  const ensayo = {
    humedad: aNumero(cuerpo.humedad), ph: aNumero(cuerpo.ph), ufc: aNumero(cuerpo.ufc),
    aroma: String(cuerpo.aroma ?? ''), color: String(cuerpo.color ?? ''), sabor: String(cuerpo.sabor ?? ''),
  };
  if ([ensayo.humedad, ensayo.ph, ensayo.ufc].some((v) => Number.isNaN(v))) {
    throw datosInvalidos('Completá humedad, pH y recuento microbiológico');
  }
  if (!ensayo.aroma || !ensayo.color || !ensayo.sabor) throw datosInvalidos('Completá la evaluación sensorial (aroma, color y sabor)');
  if (ensayo.humedad < 0 || ensayo.ufc < 0 || ensayo.ph < 0 || ensayo.ph > 14) throw datosInvalidos('Hay resultados fuera de rango (revisá humedad, pH y recuento)');
  return { ...ensayo, ufc: Math.round(ensayo.ufc) };
}

/** "Guardar borrador": conserva lo cargado, pero el lote sigue en cuarentena. */
export async function guardarBorrador(usuario: UsuarioActual, loteId: number, cuerpo: Record<string, unknown>) {
  const lote = await leerLote(loteId);
  if (lote.estado !== 'CUARENTENA') throw noSePuede('El lote ya fue dictaminado');
  const campo = (k: string) => (cuerpo[k] ?? '') as string | number;
  const borrador = {
    humedad: campo('humedad'), ph: campo('ph'), ufc: campo('ufc'), aroma: campo('aroma'), color: campo('color'),
    sabor: campo('sabor'), dictamen: campo('dictamen'), observaciones: campo('observaciones'),
    guardado_por: usuario.nombre, guardado_en: ahora().toISOString(),
  };
  await db().loteProduccion.update({ where: { id: lote.id }, data: { borrador } });
  return getLoteCalidad(lote.id);
}

export function registrarControlCalidad(usuario: UsuarioActual, loteId: number, cuerpo: Record<string, unknown>) {
  return tx(async () => {
    const lote = await leerLote(loteId);
    if (lote.estado !== 'CUARENTENA') {
      throw noSePuede(`El lote ya fue dictaminado (${lote.estado}). El protocolo firmado no se puede modificar.`);
    }
    const espec = especificacion(lote.producto);
    const ensayo = leerEnsayo(cuerpo);
    const dictamen = cuerpo.dictamen;
    if (dictamen !== 'APROBAR_LIBERAR' && dictamen !== 'RECHAZAR_BLOQUEAR') throw datosInvalidos('Elegí el dictamen: aprobado o rechazado');
    const observaciones = String(cuerpo.observaciones ?? '').trim();

    const resultados = evaluarEnsayo(espec, ensayo);
    const fuera = Object.entries(resultados).filter(([, ok]) => !ok).map(([nombre]) => nombre);
    if (dictamen === 'APROBAR_LIBERAR' && fuera.length > 0) {
      throw noSePuede(`No se puede aprobar: hay determinaciones fuera de especificación (${fuera.join(', ')}). Corresponde rechazar y bloquear el lote.`);
    }
    if (dictamen === 'RECHAZAR_BLOQUEAR' && !observaciones) {
      throw datosInvalidos('Para rechazar un lote detallá la no conformidad en las observaciones');
    }

    const protocolo = `CC-${lote.orden.numero.slice(3)}`; // OP-2026-00128 -> CC-2026-00128
    await db().controlCalidad.create({
      data: {
        lote_id: lote.id, protocolo, formulario: FORMULARIO_CALIDAD, ...ensayo, dictamen,
        observaciones: observaciones || null, analista: usuario.nombre, fecha: ahora(),
      },
    });

    if (dictamen === 'APROBAR_LIBERAR') {
      await db().loteProduccion.update({ where: { id: lote.id }, data: { estado: 'APROBADO_LIBERADO', borrador: Prisma.DbNull } });
      await auditar(usuario, 'LOTE_LIBERADO', lote.codigo, 'Firma de protocolo de calidad',
        { op_id: lote.op_id, lote_id: lote.id, resultado: 'Lote liberado · OP en CC' });
    } else {
      await db().loteProduccion.update({ where: { id: lote.id }, data: { estado: 'RECHAZADO_BLOQUEADO', borrador: Prisma.DbNull } });
      await db().ordenProduccion.update({ where: { id: lote.op_id }, data: { estado: 'RECHAZADA_SCRAP', cierre: ahora() } });
      await auditar(usuario, 'LOTE_BLOQUEADO', lote.codigo, 'Firma de protocolo de calidad · lote rechazado',
        { op_id: lote.op_id, lote_id: lote.id, resultado: 'Lote bloqueado · OP rechazada' });
      await auditar(usuario, 'ALERTA_NO_CONFORMIDAD', lote.codigo,
        `Jefatura de planta: desvío en el lote ${lote.codigo} (${lote.orden.numero}). Lote bloqueado y orden a Scrap. ${observaciones}`,
        { op_id: lote.op_id, lote_id: lote.id });
    }
    return { protocolo, resultados, lote: await getLoteCalidad(lote.id) };
  });
}

/** Protocolo firmado completo (botón "Ver protocolo"). */
export async function getProtocoloFirmado(loteId: number) {
  const lote = await leerLote(loteId);
  const control = await db().controlCalidad.findUnique({ where: { lote_id: lote.id } });
  if (!control) throw noExiste('Este lote todavía no tiene un protocolo firmado');
  const espec = especificacion(lote.producto);
  return {
    protocolo: control,
    lote: { codigo: lote.codigo, producto_nombre: lote.producto.nombre, cantidad_kg: lote.cantidad_kg, estado: lote.estado },
    especificacion: espec,
    resultados: evaluarEnsayo(espec, control),
  };
}

export async function historialCalidad() {
  const lista = await db().controlCalidad.findMany({ orderBy: { id: 'desc' }, take: 20, include: { lote: { include: { producto: true } } } });
  return lista.map(({ lote, ...c }) => ({ ...c, lote_codigo: lote.codigo, producto_nombre: lote.producto.nombre }));
}
