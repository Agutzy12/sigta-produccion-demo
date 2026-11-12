/**
 * Validación de la FORMA de cada pedido (Zod): tipos y campos obligatorios.
 * Las reglas del negocio (stock, estados, especificaciones) se validan en los servicios.
 */
import { z } from 'zod';

const id = z.coerce.number({ invalid_type_error: 'Identificador inválido' }).int('Identificador inválido').positive('Identificador inválido');
const numeroOTexto = z.union([z.number(), z.string()]);
const textoOpcional = z.string().max(500, 'El texto es demasiado largo').nullish();

export const login = z.object({
  email: z.string({ required_error: 'Ingresá tu email' }).trim().min(1, 'Ingresá tu email').email('El email no es válido'),
  password: z.string({ required_error: 'Ingresá tu contraseña' }).min(1, 'Ingresá tu contraseña'),
});

export const verificar = z.object({ producto_id: id, cantidad_kg: numeroOTexto });

export const orden = z.object({
  producto_id: id,
  cantidad_kg: numeroOTexto,
  fecha_proyectada: z.string({ required_error: 'Ingresá una fecha programada válida' }).regex(/^\d{4}-\d{2}-\d{2}$/, 'Ingresá una fecha programada válida'),
  hora_prevista: z.string().regex(/^\d{2}:\d{2}$/, 'La hora de inicio prevista no es válida').nullish(),
  linea_id: id.nullish(),
  observaciones: z.string().max(200, 'Las observaciones admiten hasta 200 caracteres').nullish(),
  accion: z.enum(['PLANIFICAR', 'BORRADOR'], { errorMap: () => ({ message: "La acción debe ser 'PLANIFICAR' o 'BORRADOR'" }) }),
});

export const motivo = z.object({ motivo: textoOpcional });

const filaConsumo = z.object({
  insumo_id: z.coerce.number(),
  partida_id: z.coerce.number().nullable(),
  cantidad: numeroOTexto,
});

export const avance = z.object({
  consumos: z.array(filaConsumo).default([]),
  cantidad_real_kg: numeroOTexto.nullish(),
  bultos: numeroOTexto.nullish(),
});

export const finalizar = z.object({
  consumos: z.array(filaConsumo, { required_error: 'Faltan los consumos de insumos', invalid_type_error: 'Faltan los consumos de insumos' }),
  cantidad_real_kg: numeroOTexto.nullish(),
  bultos: numeroOTexto.nullish(),
});

export const ensayo = z.object({
  humedad: numeroOTexto.nullish(),
  ph: numeroOTexto.nullish(),
  ufc: numeroOTexto.nullish(),
  aroma: z.string().nullish(),
  color: z.string().nullish(),
  sabor: z.string().nullish(),
  dictamen: z.string().nullish(),
  observaciones: textoOpcional,
});

export const ingreso = z.object({
  op_id: id,
  bultos_recibidos: numeroOTexto.nullish(),
  kg_conformes: numeroOTexto.nullish(),
  bultos_danados: numeroOTexto.nullish(),
  merma_kg: numeroOTexto.nullish(),
  justificacion: textoOpcional,
  deposito: z.string().nullish(),
  sector: z.string().nullish(),
  rack: z.string().nullish(),
  nivel: z.string().nullish(),
  camara: z.string().nullish(),
});

export const despacho = z.object({ lote_id: id, cantidad_kg: numeroOTexto.nullish(), cliente: z.string().max(120).nullish() });
export const reponer = z.object({ insumo_id: id, cantidad: numeroOTexto });
export const avisarCompras = z.object({ insumo_id: id });
