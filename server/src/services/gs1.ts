/**
 * Etiquetas logísticas GS1-128 (ver Informe Técnico, sección 10.A).
 * Cada pallet lleva un código con los Identificadores de Aplicación (IA):
 *   (01) GTIN del artículo · (17) vencimiento AAMMDD · (3102) peso neto en kg con 2 decimales · (10) lote
 * Los campos de largo fijo van primero y el lote (largo variable) al final, como recomienda GS1.
 */
import { deFechaDb } from './comun.js';

/** Dígito verificador GS1 (módulo 10, pesos 3 y 1 desde la derecha). */
export function digitoVerificador(numeros: string): number {
  let suma = 0;
  for (let i = 0; i < numeros.length; i++) {
    const digito = Number(numeros[numeros.length - 1 - i]);
    suma += digito * (i % 2 === 0 ? 3 : 1);
  }
  return (10 - (suma % 10)) % 10;
}

/** Arma un GTIN-13 válido a partir de los 12 primeros dígitos. */
export const armarGtin13 = (doce: string) => `${doce}${digitoVerificador(doce)}`;

export const esGtinValido = (gtin: string) =>
  /^\d{8,14}$/.test(gtin) && digitoVerificador(gtin.slice(0, -1)) === Number(gtin.slice(-1));

const aGtin14 = (gtin: string) => gtin.padStart(14, '0');

/** Date (columna DATE) -> "AAMMDD" */
const fechaGS1 = (fecha: Date) => deFechaDb(fecha)!.slice(2).replaceAll('-', '');

/** kg -> 6 dígitos con 2 decimales implícitos: 980 kg -> "098000" */
export function pesoGS1(kg: number) {
  const centesimos = Math.round(kg * 100);
  if (centesimos < 0 || centesimos > 999999) throw new Error('El peso no entra en el campo (3102) de GS1');
  return String(centesimos).padStart(6, '0');
}

/** Texto legible de la etiqueta de un pallet, con los IA entre paréntesis. */
export function etiquetaPallet(gtin: string, lote: string, vencimiento: Date, kg: number) {
  return `(01)${aGtin14(gtin)}(17)${fechaGS1(vencimiento)}(3102)${pesoGS1(kg)}(10)${lote}`;
}

export interface DatosGS1 { gtin?: string; lote?: string; vencimiento?: string; kg?: number; sscc?: string }

const FIJOS: Record<string, number> = { '00': 18, '01': 14, '02': 14, '11': 6, '13': 6, '15': 6, '17': 6 };

function asignar(datos: DatosGS1, ia: string, valor: string) {
  if (ia === '01' || ia === '02') datos.gtin = valor;
  else if (ia === '00') datos.sscc = valor;
  else if (ia === '10') datos.lote = valor;
  else if (ia === '17') datos.vencimiento = `20${valor.slice(0, 2)}-${valor.slice(2, 4)}-${valor.slice(4, 6)}`;
  else if (/^310\d$/.test(ia)) datos.kg = Number(valor) / 10 ** Number(ia[3]);
}

/**
 * Lee un código GS1-128 tal como lo entrega un lector:
 * - con paréntesis: (01)07791234500016(17)270512(3102)098000(10)L-MRC01-202646-01
 * - "crudo": ]C1 + campos seguidos, con el carácter GS (ASCII 29) después de cada campo variable.
 * Devuelve null si el texto no parece un código GS1.
 */
export function leerGS1(texto: string): DatosGS1 | null {
  const t = texto.trim();
  const datos: DatosGS1 = {};
  if (t.startsWith('(')) {
    const partes = [...t.matchAll(/\((\d{2,4})\)([^(]*)/g)];
    if (!partes.length) return null;
    for (const [, ia, valor] of partes) asignar(datos, ia, valor.trim());
    return datos;
  }
  if (!t.startsWith(']C1') && !t.includes('\u001d')) return null;
  let resto = t.replace(/^\]C1/, '');
  while (resto.length >= 2) {
    const ia = /^31\d/.test(resto) ? resto.slice(0, 4) : resto.slice(0, 2);
    resto = resto.slice(ia.length);
    const largo = FIJOS[ia] ?? (/^31\d\d$/.test(ia) ? 6 : null);
    let valor: string;
    if (largo) {
      valor = resto.slice(0, largo);
      resto = resto.slice(largo);
    } else {
      const fin = resto.indexOf('\u001d');
      valor = fin === -1 ? resto : resto.slice(0, fin);
      resto = fin === -1 ? '' : resto.slice(fin);
    }
    asignar(datos, ia, valor);
    resto = resto.replace(/^\u001d/, '');
  }
  return datos;
}
