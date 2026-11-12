/**
 * Panel general de producción (indicadores y avisos) y contadores del menú.
 */
import { db } from '../db.js';
import { ahora } from '../clock.js';
import { OBJETIVO_DIARIO_KG, PLANTA } from '../config.js';
import { noExiste } from '../errores.js';
import { aFechaDb, auditar, fechaLocal, redondear, type UsuarioActual } from './comun.js';
import { stockInsumos } from './inventario.js';
import { lotesCuarentena } from './calidad.js';

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** Los últimos `cantidad` días hábiles (lunes a viernes) hasta hoy, del más viejo al más nuevo. */
function ultimosDiasHabiles(hoy: Date, cantidad: number, saltear = 0) {
  const dias: Date[] = [];
  const cursor = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  let salteados = 0;
  while (dias.length < cantidad) {
    const finDeSemana = cursor.getDay() === 0 || cursor.getDay() === 6;
    if (!finDeSemana) {
      if (salteados < saltear) salteados++;
      else dias.unshift(new Date(cursor));
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return dias;
}

function turnoTexto(fecha: Date) {
  const h = fecha.getHours();
  if (h >= 6 && h < 14) return 'Turno mañana · 06:00 a 14:00';
  if (h >= 14 && h < 22) return 'Turno tarde · 14:00 a 22:00';
  return 'Turno noche · 22:00 a 06:00';
}

export async function getPanel() {
  const hoy = ahora();
  const hoyTexto = fechaLocal(hoy);

  // Kilos netos elaborados por día (sin contar lotes rechazados)
  const lotes = await db().loteProduccion.findMany({ where: { estado: { not: 'RECHAZADO_BLOQUEADO' } }, select: { creado_en: true, cantidad_kg: true } });
  const kgPorDia = new Map<string, number>();
  for (const l of lotes) {
    const dia = fechaLocal(l.creado_en);
    kgPorDia.set(dia, (kgPorDia.get(dia) ?? 0) + l.cantidad_kg);
  }
  const kgHoy = redondear(kgPorDia.get(hoyTexto) ?? 0, 0);

  const recientes = ultimosDiasHabiles(hoy, 5).map((d) => {
    const clave = fechaLocal(d);
    return { fecha: clave, etiqueta: `${d.getDate()} ${MESES[d.getMonth()]}`, kg: redondear(kgPorDia.get(clave) ?? 0, 0), hoy: clave === hoyTexto };
  });
  const totalReciente = recientes.reduce((a, d) => a + d.kg, 0);
  const totalPrevio = ultimosDiasHabiles(hoy, 5, 5).reduce((a, d) => a + (kgPorDia.get(fechaLocal(d)) ?? 0), 0);
  const variacion = totalPrevio > 0 ? redondear(((totalReciente - totalPrevio) / totalPrevio) * 100, 1) : null;

  // Contadores de órdenes
  const porEstado = await db().ordenProduccion.groupBy({ by: ['estado'], _count: { _all: true } });
  const contar = (estado: string) => porEstado.find((e) => e.estado === estado)?._count._all ?? 0;
  const enProduccion = contar('EN_PRODUCCION');
  const planificadas = contar('PLANIFICADA');
  const creadas = contar('CREADA');
  const enCalidad = contar('EN_CONTROL_CALIDAD');

  const cuarentena = await lotesCuarentena();
  const bajoStock = (await stockInsumos()).filter((i) => i.bajo);

  const proximas = (await db().ordenProduccion.findMany({
    where: { fecha_proyectada: aFechaDb(hoyTexto), estado: { in: ['CREADA', 'PLANIFICADA'] } },
    orderBy: [{ hora_prevista: 'asc' }, { secuencia: 'asc' }], take: 4, include: { producto: true },
  })).map((o) => ({ hora: o.hora_prevista, numero: o.numero, cantidad_kg: o.cantidad_kg, estado: o.estado, producto_nombre: o.producto.nombre }));

  return {
    planta: PLANTA,
    hoy: hoyTexto,
    turno: turnoTexto(hoy),
    kpis: {
      activas: creadas + planificadas + enProduccion + enCalidad,
      enProduccion,
      planificadas,
      creadas,
      enCalidad,
      produccionHoyKg: kgHoy,
      objetivoKg: OBJETIVO_DIARIO_KG,
      objetivoPct: Math.round((kgHoy / OBJETIVO_DIARIO_KG) * 100),
      lotesCuarentena: cuarentena.length,
      cuarentenaSinAnalisis: cuarentena.filter((l) => !l.borrador).length,
      alertasAbastecimiento: bajoStock.length,
    },
    recientes: { dias: recientes, totalKg: totalReciente, variacionPct: variacion },
    proximas,
    atencion: {
      stockBajo: bajoStock.slice(0, 2).map((i) => ({ insumo_id: i.id, nombre: i.nombre, disponible: i.disponible, minimo: i.stock_minimo, unidad: i.unidad })),
      stockBajoTotal: bajoStock.length,
      cuarentena: cuarentena.slice(0, 1).map((l) => ({ id: l.id, codigo: l.codigo, cantidad_kg: l.cantidad_kg })),
      cuarentenaTotal: cuarentena.length,
    },
  };
}

/** Cuánto trabajo espera en cada paso del proceso (los números del menú). */
export async function pendientesPorPaso() {
  const [borradores, paraElaborar, enCuarentena, paraRecibir, alertas] = await Promise.all([
    db().ordenProduccion.count({ where: { estado: 'CREADA' } }),
    db().ordenProduccion.count({ where: { estado: { in: ['PLANIFICADA', 'EN_PRODUCCION'] } } }),
    db().loteProduccion.count({ where: { estado: 'CUARENTENA' } }),
    db().ordenProduccion.count({ where: { estado: 'EN_CONTROL_CALIDAD', lote: { estado: 'APROBADO_LIBERADO' } } }),
    db().auditoria.count({ where: { accion: { startsWith: 'ALERTA' } } }),
  ]);
  return { planificar: borradores, elaborar: paraElaborar, calidad: enCuarentena, deposito: paraRecibir, alertas: Math.min(alertas, 8) };
}

/** Botón "Avisar a Compras": deja registrado el aviso por stock bajo. */
export async function avisarCompras(usuario: UsuarioActual, insumoId: number) {
  const insumo = (await stockInsumos()).find((i) => i.id === Number(insumoId));
  if (!insumo) throw noExiste('Insumo inexistente');
  await auditar(usuario, 'ALERTA_COMPRAS', insumo.codigo,
    `Compras y Suministros: stock bajo de ${insumo.nombre} (${insumo.disponible} ${insumo.unidad}, mínimo ${insumo.stock_minimo})`);
  return { ok: true };
}

/** Últimas alertas (campanita de la barra superior). */
export const listAlertas = () => db().auditoria.findMany({ where: { accion: { startsWith: 'ALERTA' } }, orderBy: { id: 'desc' }, take: 8 });
