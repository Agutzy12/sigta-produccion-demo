/**
 * Tabla de rutas de la API + matriz de permisos por rol.
 * Cada renglón dice: método, ruta, qué roles pueden usarla, cómo se valida y qué servicio ejecuta.
 * (roles: null = cualquier usuario con sesión iniciada; publica: true = no hace falta sesión)
 */
import { Router, type Request, type Response } from 'express';
import type { Rol } from '@prisma/client';
import type { ZodTypeAny } from 'zod';
import { MODO_DEMO, MOTIVOS_PAUSA, NOMBRE_ROL, PLANTA, UBICACIONES, CLAVE_DEMO } from './config.js';
import { datosInvalidos, noExiste, prohibido } from './errores.js';
import { serializar } from './serializar.js';
import * as V from './validaciones.js';
import * as auth from './services/auth.js';
import * as inventario from './services/inventario.js';
import * as ordenes from './services/ordenes.js';
import * as calidad from './services/calidad.js';
import * as deposito from './services/deposito.js';
import * as trazabilidad from './services/trazabilidad.js';
import * as panel from './services/panel.js';
import { reiniciarDemo } from './seed/seed.js';
import { prisma } from './db.js';

interface Contexto {
  usuario: auth.UsuarioPublico;
  params: Record<string, string>;
  consulta: Record<string, unknown>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cuerpo: any;
}
interface Ruta {
  metodo: 'get' | 'post' | 'put';
  ruta: string;
  roles?: Rol[] | null;
  publica?: boolean;
  soloDemo?: boolean;
  esquema?: ZodTypeAny;
  ejecutar: (c: Contexto) => unknown;
}

const PRODUCCION: Rol[] = ['PRODUCCION'];
const CALIDAD: Rol[] = ['CALIDAD'];
const DEPOSITO: Rol[] = ['DEPOSITO'];
const id = (c: Contexto) => Number(c.params.id);

export const RUTAS: Ruta[] = [
  // Sesión
  { metodo: 'post', ruta: '/auth/login', publica: true, esquema: V.login, ejecutar: ({ cuerpo }) => auth.iniciarSesion(cuerpo.email, cuerpo.password) },
  { metodo: 'get', ruta: '/auth/yo', ejecutar: ({ usuario }) => usuario },
  { metodo: 'get', ruta: '/auth/demo', publica: true, soloDemo: true, ejecutar: async () => ({ clave: CLAVE_DEMO, usuarios: await auth.usuariosDemo() }) },
  { metodo: 'get', ruta: '/salud', publica: true, ejecutar: async () => { await prisma.$queryRaw`SELECT 1`; return { ok: true, demo: MODO_DEMO }; } },

  // Datos generales
  { metodo: 'get', ruta: '/config', ejecutar: () => ({ planta: PLANTA, ubicaciones: UBICACIONES, motivos_pausa: MOTIVOS_PAUSA, demo: MODO_DEMO, roles: NOMBRE_ROL }) },
  { metodo: 'get', ruta: '/productos', ejecutar: () => inventario.listProductos() },
  { metodo: 'get', ruta: '/catalogo', ejecutar: () => inventario.catalogo() },
  { metodo: 'get', ruta: '/lineas', ejecutar: () => inventario.listLineas() },
  { metodo: 'get', ruta: '/recetas/:id', ejecutar: (c) => inventario.getReceta(id(c)) },
  { metodo: 'get', ruta: '/insumos', ejecutar: () => inventario.listInsumos() },
  { metodo: 'get', ruta: '/alertas', ejecutar: () => panel.listAlertas() },
  { metodo: 'get', ruta: '/pendientes', ejecutar: () => panel.pendientesPorPaso() },

  // Panel general
  { metodo: 'get', ruta: '/panel', ejecutar: () => panel.getPanel() },
  { metodo: 'post', ruta: '/panel/avisar-compras', roles: PRODUCCION, esquema: V.avisarCompras, ejecutar: ({ usuario, cuerpo }) => panel.avisarCompras(usuario, cuerpo.insumo_id) },

  // CU-P01 Registrar Orden de Producción
  { metodo: 'get', ruta: '/ordenes', ejecutar: () => ordenes.listOrdenes() },
  { metodo: 'get', ruta: '/ordenes/proximo-numero', ejecutar: () => ordenes.proximoNumero() },
  { metodo: 'post', ruta: '/ordenes/verificar', esquema: V.verificar, ejecutar: ({ cuerpo }) => ordenes.verificarDisponibilidad(cuerpo) },
  { metodo: 'post', ruta: '/ordenes', roles: PRODUCCION, esquema: V.orden, ejecutar: ({ usuario, cuerpo }) => ordenes.crearOrden(usuario, cuerpo) },
  { metodo: 'get', ruta: '/ordenes/:id', ejecutar: (c) => ordenes.getOrden(id(c)) },
  { metodo: 'put', ruta: '/ordenes/:id', roles: PRODUCCION, esquema: V.orden, ejecutar: (c) => ordenes.completarBorrador(c.usuario, id(c), c.cuerpo) },
  { metodo: 'post', ruta: '/ordenes/:id/planificar', roles: PRODUCCION, ejecutar: (c) => ordenes.planificarOrden(c.usuario, id(c)) },
  { metodo: 'post', ruta: '/ordenes/:id/cancelar', roles: PRODUCCION, esquema: V.motivo, ejecutar: (c) => ordenes.cancelarOrden(c.usuario, id(c), c.cuerpo.motivo) },

  // CU-P02 Registrar Ejecución de Producción y Consumo
  { metodo: 'post', ruta: '/ordenes/:id/iniciar', roles: PRODUCCION, ejecutar: (c) => ordenes.iniciarProduccion(c.usuario, id(c)) },
  { metodo: 'post', ruta: '/ordenes/:id/pausar', roles: PRODUCCION, esquema: V.motivo, ejecutar: (c) => ordenes.pausarLinea(c.usuario, id(c), c.cuerpo.motivo) },
  { metodo: 'post', ruta: '/ordenes/:id/reanudar', roles: PRODUCCION, ejecutar: (c) => ordenes.reanudarLinea(c.usuario, id(c)) },
  { metodo: 'put', ruta: '/ordenes/:id/avance', roles: PRODUCCION, esquema: V.avance, ejecutar: (c) => ordenes.guardarAvance(c.usuario, id(c), c.cuerpo) },
  { metodo: 'post', ruta: '/ordenes/:id/finalizar-elaboracion', roles: PRODUCCION, esquema: V.finalizar, ejecutar: (c) => ordenes.finalizarElaboracion(c.usuario, id(c), c.cuerpo) },

  // CU-P03 Registrar Control de Calidad de Lote
  { metodo: 'get', ruta: '/calidad/pendientes', ejecutar: () => calidad.lotesCuarentena() },
  { metodo: 'get', ruta: '/calidad/historial', ejecutar: () => calidad.historialCalidad() },
  { metodo: 'get', ruta: '/calidad/:id', ejecutar: (c) => calidad.getLoteCalidad(id(c)) },
  { metodo: 'get', ruta: '/calidad/:id/protocolo', ejecutar: (c) => calidad.getProtocoloFirmado(id(c)) },
  { metodo: 'put', ruta: '/calidad/:id/borrador', roles: CALIDAD, esquema: V.ensayo, ejecutar: (c) => calidad.guardarBorrador(c.usuario, id(c), c.cuerpo) },
  { metodo: 'post', ruta: '/calidad/:id', roles: CALIDAD, esquema: V.ensayo, ejecutar: (c) => calidad.registrarControlCalidad(c.usuario, id(c), c.cuerpo) },

  // CU-P04 Registrar Ingreso de Producto Terminado y Cierre de OP
  { metodo: 'get', ruta: '/depositos/pendientes', ejecutar: () => deposito.recepcionesPendientes() },
  { metodo: 'get', ruta: '/depositos/recepcion/:id', ejecutar: (c) => deposito.getRecepcion(id(c)) },
  { metodo: 'post', ruta: '/depositos/ingreso', roles: DEPOSITO, esquema: V.ingreso, ejecutar: ({ usuario, cuerpo }) => deposito.ingresarProductoTerminado(usuario, cuerpo) },
  { metodo: 'get', ruta: '/stock-pt', ejecutar: () => deposito.stockPT() },
  { metodo: 'post', ruta: '/despachos', roles: DEPOSITO, esquema: V.despacho, ejecutar: ({ usuario, cuerpo }) => deposito.despachar(usuario, cuerpo) },

  // Trazabilidad (también acepta el texto de una etiqueta GS1-128 escaneada)
  { metodo: 'get', ruta: '/trazabilidad', ejecutar: ({ consulta }) => trazabilidad.buscar(consulta.q) },

  // Herramientas de la demo (sólo con DEMO_MODE=true)
  { metodo: 'post', ruta: '/demo/reponer', soloDemo: true, esquema: V.reponer, ejecutar: ({ usuario, cuerpo }) => inventario.reponerStock(usuario, cuerpo) },
  { metodo: 'post', ruta: '/demo/reset', soloDemo: true, ejecutar: ({ usuario }) => reiniciarDemo(usuario) },
];

/** Arma el Router de Express a partir de la tabla. */
export function crearRouter() {
  const router = Router();
  for (const r of RUTAS) {
    router[r.metodo](r.ruta, async (req: Request, res: Response) => {
      if (r.soloDemo && !MODO_DEMO) throw noExiste('Ruta inexistente');
      // 1) ¿Quién es? (sesión)  2) ¿Puede? (rol)  3) ¿El pedido está bien formado? (Zod)  4) Ejecutar
      const usuario = r.publica ? (null as unknown as auth.UsuarioPublico) : await auth.usuarioDelToken(req.headers.authorization);
      if (r.roles && !r.roles.includes(usuario.rol)) {
        throw prohibido(`Tu perfil (${NOMBRE_ROL[usuario.rol]}) no tiene permiso para esta acción. Sólo puede hacerla: ${r.roles.map((x) => NOMBRE_ROL[x]).join(' o ')}.`);
      }
      let cuerpo = req.body ?? {};
      if (r.esquema) {
        const resultado = r.esquema.safeParse(cuerpo);
        if (!resultado.success) throw datosInvalidos(resultado.error.issues[0]?.message ?? 'Datos inválidos');
        cuerpo = resultado.data;
      }
      const datos = await r.ejecutar({ usuario, params: req.params as Record<string, string>, consulta: req.query as Record<string, unknown>, cuerpo });
      res.json(serializar(datos));
    });
  }
  return router;
}
