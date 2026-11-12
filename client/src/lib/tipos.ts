/** Tipos de los datos que devuelve la API (los mismos nombres que las columnas de la base). */
export type Rol = 'PRODUCCION' | 'CALIDAD' | 'DEPOSITO' | 'DIRECCION';
export type EstadoOP = 'CREADA' | 'PLANIFICADA' | 'EN_PRODUCCION' | 'EN_CONTROL_CALIDAD' | 'FINALIZADA' | 'RECHAZADA_SCRAP' | 'CANCELADA';
export type EstadoLote = 'CUARENTENA' | 'APROBADO_LIBERADO' | 'RECHAZADO_BLOQUEADO';
export type Dictamen = 'APROBAR_LIBERAR' | 'RECHAZAR_BLOQUEAR';

export interface Usuario { id: number; email: string; nombre: string; cargo: string; iniciales: string; rol: Rol }
export interface Config {
  planta: string; demo: boolean; motivos_pausa: string[]; roles: Record<Rol, string>;
  ubicaciones: { depositos: string[]; sectores: string[]; sectoresConCamara: string[]; racks: string[]; niveles: string[]; camaras: string[] };
}
export interface Pendientes { planificar: number; elaborar: number; calidad: number; deposito: number; alertas: number }

export interface Producto {
  id: number; codigo: string; nombre: string; gtin: string; linea_id: number; presentacion_kg: number; vida_util_meses: number;
  receta_id: number; receta_codigo: string; receta_version: number; receta_base_kg: number;
  categoria_codigo: string | null; categoria_nombre: string | null; familia: string | null; presentacion: string;
  unidades_por_caja: number | null; unidades_por_pallet: number; raciones: number | null;
  ingredientes: string | null; alergenos: string | null; almacenamiento: string | null; embalaje: string | null; url_web: string | null;
}
export interface Linea { id: number; nombre: string }
export interface Partida { id: number; nro_lote: string; proveedor: string | null; cantidad: number; vencimiento: string | null; documento_origen: string | null }

export interface ItemOrden {
  insumo_id: number; cantidad_teorica: number; codigo: string; nombre: string; tipo: 'MP' | 'ME'; unidad: string; critico: boolean; partidas?: Partida[];
}
export interface FilaConsumo { insumo_id: number; partida_id: number | null; cantidad: number }

export interface OrdenResumen {
  id: number; secuencia: number; numero: string; estado: EstadoOP; producto_id: number; producto_codigo: string; producto_nombre: string;
  linea_id: number | null; linea_nombre: string | null; cantidad_kg: number; fecha_proyectada: string; hora_prevista: string;
  pausada: boolean; motivo_pausa: string | null; observaciones: string | null; creado_por: string;
  lote_codigo: string | null; lote_estado: EstadoLote | null; lote_id: number | null;
}
export interface Orden extends OrdenResumen {
  receta_id: number; receta_codigo: string; receta_version: number; presentacion_kg: number; vida_util_meses: number;
  presentacion: string; unidades_por_pallet: number; url_web: string | null;
  inicio_real: string | null; lote_codigo_previsto: string | null; vencimiento_previsto: string | null;
  cantidad_real_kg: number | null; bultos: number | null; merma_pct: number | null; merma_kg: number | null;
  items: ItemOrden[]; consumo_sugerido?: FilaConsumo[];
  avance: { consumos: FilaConsumo[]; cantidad_real_kg: number | null; bultos: number | null } | null;
}

export interface ItemRequerido {
  insumo_id: number; codigo: string; nombre: string; tipo: 'MP' | 'ME'; unidad: string; critico: boolean;
  requerido: number; disponible: number; faltante: number; ok: boolean;
}
export interface Verificacion { items: ItemRequerido[]; kgMateriaPrima: number; criticosTotal: number; criticosOk: number; planificable: boolean; hayFaltantes: boolean; factor: number }

export interface Especificacion {
  humedad_max: number; ph_min: number; ph_max: number; ufc_max: number;
  aroma: { esperado: string; texto: string; opciones: string[] };
  color: { esperado: string; texto: string; opciones: string[] };
  sabor: { esperado: string; texto: string; opciones: string[] };
}
export interface Borrador { humedad?: string | number; ph?: string | number; ufc?: string | number; aroma?: string; color?: string; sabor?: string; dictamen?: string; observaciones?: string }
export interface LoteCalidad {
  id: number; codigo: string; op_id: number; op_numero: string; producto_nombre: string; producto_codigo: string;
  cantidad_kg: number; bultos: number; vencimiento: string; estado: EstadoLote; creado_en: string;
  borrador: Borrador | null; especificacion: Especificacion;
}
export interface Protocolo {
  id: number; protocolo: string; formulario: string; humedad: number; ph: number; aroma: string; color: string; sabor: string;
  ufc: number; dictamen: Dictamen; observaciones: string | null; analista: string; fecha: string; lote_id: number;
}
export type Resultados = Record<'humedad' | 'ph' | 'aroma' | 'color' | 'sabor' | 'ufc', boolean | null>;

export interface Pallet { codigo: string; bultos: number; kg: number; gs1?: string }
