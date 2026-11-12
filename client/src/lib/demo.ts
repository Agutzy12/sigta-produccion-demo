import type { Rol } from './tipos';

/** Usuario de ejemplo de cada rol (para cambiar de rol con un clic en la demo). */
export const USUARIO_DE_ROL: Record<Rol, string> = {
  PRODUCCION: 'produccion@sigta.demo',
  CALIDAD: 'calidad@sigta.demo',
  DEPOSITO: 'deposito@sigta.demo',
  DIRECCION: 'gerencia@sigta.demo',
};

/** Qué hace cada rol, en una línea (pantalla de ingreso y menú de usuario). */
export const QUE_HACE: Record<Rol, string> = {
  PRODUCCION: 'Planifica órdenes y registra la elaboración',
  CALIDAD: 'Analiza los lotes y firma el dictamen',
  DEPOSITO: 'Recibe el producto liberado y despacha',
  DIRECCION: 'Consulta todo, sin modificar nada',
};
