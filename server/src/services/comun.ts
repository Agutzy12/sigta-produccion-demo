/**
 * Cosas que usan todos los servicios: auditoría, fechas y pequeñas funciones de ayuda.
 */
import type { Rol } from '@prisma/client';
import { db } from '../db.js';
import { ahora } from '../clock.js';

/** Quién está haciendo la operación (sale de la sesión iniciada). */
export interface UsuarioActual {
  id?: number;
  nombre: string;
  rol: Rol | 'SISTEMA';
}

/** Redondea a N decimales (evita 0.30000000000000004). */
export function redondear(numero: number, decimales = 3): number {
  const f = 10 ** decimales;
  return Math.round(numero * f) / f;
}

/** 7 -> "00007" */
export const rellenar = (numero: number, largo: number) => String(numero).padStart(largo, '0');

/** Convierte a número. Si viene vacío o no es número devuelve NaN. Acepta coma decimal. */
export function aNumero(valor: unknown): number {
  if (valor === '' || valor === null || valor === undefined) return NaN;
  return Number(typeof valor === 'string' ? valor.replace(',', '.') : valor);
}

/* ---------- Fechas ---------- */

/** Fecha local como "AAAA-MM-DD". */
export const fechaLocal = (fecha: Date) =>
  `${fecha.getFullYear()}-${rellenar(fecha.getMonth() + 1, 2)}-${rellenar(fecha.getDate(), 2)}`;

/** "AAAA-MM-DD" -> Date para guardar en una columna DATE. */
export const aFechaDb = (texto: string) => new Date(`${texto}T00:00:00.000Z`);

/** Columna DATE -> "AAAA-MM-DD". */
export const deFechaDb = (fecha: Date | null | undefined) => (fecha ? fecha.toISOString().slice(0, 10) : null);

/** Suma meses a una fecha y devuelve "AAAA-MM-DD". */
export function sumarMeses(fecha: Date, meses: number): string {
  const nueva = new Date(fecha.getTime());
  nueva.setMonth(nueva.getMonth() + meses);
  return fechaLocal(nueva);
}

/** Número de semana del año (ISO 8601) y año al que pertenece esa semana. */
export function semanaISO(fecha: Date) {
  const t = new Date(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()));
  const dia = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dia);
  const anio = t.getUTCFullYear();
  const semana = Math.ceil(((t.getTime() - Date.UTC(anio, 0, 1)) / 86400000 + 1) / 7);
  return { anio, semana };
}

/* ---------- Auditoría ---------- */

/**
 * Guarda un renglón en el registro de auditoría.
 * extras: { op_id, lote_id, resultado } sirven para armar el historial de un lote.
 */
export async function auditar(
  usuario: UsuarioActual | null,
  accion: string,
  entidad: string | null,
  detalle: string | null,
  extras: { op_id?: number; lote_id?: number; resultado?: string } = {},
) {
  await db().auditoria.create({
    data: {
      fecha: ahora(),
      usuario: usuario?.nombre ?? 'Sistema',
      rol: usuario?.rol ?? '-',
      accion,
      entidad,
      detalle,
      resultado: extras.resultado ?? null,
      op_id: extras.op_id ?? null,
      lote_id: extras.lote_id ?? null,
    },
  });
}
