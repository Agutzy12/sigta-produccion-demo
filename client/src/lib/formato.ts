/** Formatos con estilo argentino: 1.000,5 kg · 12/11/2026 · 08:30 */
const pad = (n: number) => String(n).padStart(2, '0');

export const num = (n: number | null | undefined, dec = 0) =>
  n == null || Number.isNaN(Number(n)) ? '—' : Number(n).toLocaleString('es-AR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
export const kg = (n: number | null | undefined) => `${num(n, Number.isInteger(Number(n)) ? 0 : 1)} kg`;

/** Acepta "AAAA-MM-DD" (fecha sin hora) o una fecha ISO con hora. */
const aFecha = (iso: string) => new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
export const fecha = (iso?: string | null) => { if (!iso) return '—'; const d = aFecha(iso); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`; };
export const hora = (iso: string | Date) => { const d = new Date(iso); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
export const fechaHora = (iso?: string | null) => (iso ? `${fecha(iso)} · ${hora(iso)}` : '—');
export const hoyTexto = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
/** "Hoy" o "23/10" */
export const fechaCorta = (texto: string) => { const [, m, d] = texto.split('-'); return texto === hoyTexto() ? 'Hoy' : `${d}/${m}`; };
export const fechaLarga = () => {
  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const d = new Date();
  return `${dias[d.getDay()]} ${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
};
/** Lee un número escrito por el usuario (acepta coma decimal). Vacío o inválido = NaN. */
export const leerNumero = (v: unknown) => { const t = String(v ?? '').trim(); return t === '' ? NaN : Number(t.replace(',', '.')); };
/** Peso de una presentación: 0.5 -> "500 g", 20 -> "20 kg". */
export const pesoTexto = (kgUnidad: number) => (kgUnidad < 1 ? `${Math.round(kgUnidad * 1000)} g` : `${num(kgUnidad, Number.isInteger(kgUnidad) ? 0 : 1)} kg`);
export const plural = (n: number, singular: string, pluralTexto = `${singular}s`) => `${n} ${n === 1 ? singular : pluralTexto}`;
