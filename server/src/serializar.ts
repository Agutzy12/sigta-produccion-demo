/**
 * Convierte lo que devuelve la base en JSON para la API.
 * Las columnas DATE (sin hora) salen como "AAAA-MM-DD" para que no "cambien de día"
 * por la zona horaria; el resto de las fechas sale en formato ISO con hora.
 */
const SOLO_FECHA = new Set(['fecha_proyectada', 'vencimiento', 'vencimiento_previsto', 'vigente_desde', 'receta_vigente_desde']);

export function serializar(valor: unknown, clave = ''): unknown {
  if (valor instanceof Date) return SOLO_FECHA.has(clave) ? valor.toISOString().slice(0, 10) : valor.toISOString();
  if (Array.isArray(valor)) return valor.map((v) => serializar(v, clave));
  if (valor && typeof valor === 'object') {
    const salida: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(valor)) if (v !== undefined) salida[k] = serializar(v, k);
    return salida;
  }
  return valor;
}
