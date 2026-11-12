/**
 * Valores fijos de SIGTA. Si algo cambia (objetivo diario, bultos por pallet...),
 * se cambia acá y no hay que buscarlo por todo el código.
 */
import type { Rol } from '@prisma/client';

export const ENTORNO = process.env.NODE_ENV ?? 'development';
export const EN_PRODUCCION = ENTORNO === 'production';

/** Modo demo: habilita los accesos rápidos y las herramientas "reponer stock" y "reiniciar demo". */
export const MODO_DEMO = (process.env.DEMO_MODE ?? 'true') !== 'false';

export const JWT_SECRET = (() => {
  const clave = process.env.JWT_SECRET;
  if (clave && clave.length >= 16) return clave;
  if (EN_PRODUCCION) throw new Error('Falta JWT_SECRET (al menos 16 caracteres) en las variables de entorno');
  return 'clave-de-desarrollo-sigta-no-usar-en-produccion';
})();
export const DURACION_SESION = '10h';

export const PLANTA = 'Planta principal';
export const OBJETIVO_DIARIO_KG = 4000; // objetivo de producción neta por día (Panel)
export const PRIMERA_OP = 111; // la primera orden de los datos de ejemplo es OP-AAAA-00111
export const FORMULARIO_CALIDAD = 'R.BPM.01V01';

/** Contraseña de los usuarios de ejemplo (sólo para la demo). */
export const CLAVE_DEMO = 'sigta2026';

export interface UsuarioBase {
  rol: Rol;
  email: string;
  nombre: string;
  cargo: string;
  iniciales: string;
}

/** Personas de ejemplo. El rol define qué casos de uso puede ejecutar cada una. */
export const USUARIOS_DEMO: UsuarioBase[] = [
  { rol: 'PRODUCCION', email: 'produccion@sigta.demo', nombre: 'Martín Pérez', cargo: 'Supervisor de producción', iniciales: 'MP' },
  { rol: 'CALIDAD', email: 'calidad@sigta.demo', nombre: 'Lucía Benítez', cargo: 'Técnica de calidad', iniciales: 'LB' },
  { rol: 'DEPOSITO', email: 'deposito@sigta.demo', nombre: 'Diego Acosta', cargo: 'Operario de depósito', iniciales: 'DA' },
  { rol: 'DIRECCION', email: 'gerencia@sigta.demo', nombre: 'Valeria Ruiz', cargo: 'Gerencia (sólo consulta)', iniciales: 'VR' },
];

/** Nombre del rol para los mensajes ("Sólo Técnica de calidad puede..."). */
export const NOMBRE_ROL: Record<Rol, string> = {
  PRODUCCION: 'Supervisor de producción',
  CALIDAD: 'Técnico de calidad',
  DEPOSITO: 'Operario de depósito',
  DIRECCION: 'Gerencia',
};

/** Opciones de ubicación de guarda para el ingreso a depósito */
export const UBICACIONES = {
  depositos: ['Producto terminado'],
  sectores: ['Secos · Ambiente', 'Refrigerado'],
  sectoresConCamara: ['Refrigerado'],
  racks: ['A01', 'A02', 'A03', 'A04', 'A05', 'B01', 'B02', 'B03', 'B04', 'B05'],
  niveles: ['01', '02', '03', '04'],
  camaras: ['Cámara 1', 'Cámara 2'],
};

export const MOTIVOS_PAUSA = [
  'Ajuste del dosificador',
  'Falta de insumo en tolva',
  'Limpieza de línea',
  'Mantenimiento correctivo',
  'Corte de energía',
  'Otro motivo',
];
