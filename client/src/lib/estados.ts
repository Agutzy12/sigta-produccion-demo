import type { EstadoLote, EstadoOP } from './tipos';

export type Color = 'gris' | 'ambar' | 'azul' | 'verde' | 'rojo';

export const ESTADOS_OP: Record<EstadoOP, [string, Color]> = {
  CREADA: ['Borrador', 'gris'], PLANIFICADA: ['Planificada', 'ambar'], EN_PRODUCCION: ['En producción', 'ambar'],
  EN_CONTROL_CALIDAD: ['En control de calidad', 'azul'], FINALIZADA: ['Finalizada', 'verde'],
  RECHAZADA_SCRAP: ['Rechazada (Scrap)', 'rojo'], CANCELADA: ['Cancelada', 'gris'],
};
export const ESTADOS_LOTE: Record<EstadoLote, [string, Color]> = {
  CUARENTENA: ['Cuarentena', 'ambar'], APROBADO_LIBERADO: ['Aprobado y liberado', 'verde'], RECHAZADO_BLOQUEADO: ['Rechazado y bloqueado', 'rojo'],
};

/** En qué paso del circuito (1 a 4) está una orden. 5 = terminada. */
export function pasoDeOrden(estado: EstadoOP, loteEstado?: EstadoLote | null) {
  if (estado === 'CREADA' || estado === 'PLANIFICADA') return 1;
  if (estado === 'EN_PRODUCCION') return 2;
  if (estado === 'EN_CONTROL_CALIDAD') return loteEstado === 'APROBADO_LIBERADO' ? 4 : 3;
  if (estado === 'FINALIZADA') return 5;
  return 3;
}
