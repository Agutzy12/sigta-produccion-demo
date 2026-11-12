/** Panel general de producción: indicadores, avisos, tarea sugerida y lista de órdenes. */
import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useDatos } from '../lib/useDatos';
import { useSesion } from '../contexto/Sesion';
import { useDialogos } from '../contexto/Dialogos';
import { fecha, fechaCorta, kg, num, plural } from '../lib/formato';
import { ESTADOS_OP } from '../lib/estados';
import type { EstadoOP, Linea, OrdenResumen, Pendientes, Rol } from '../lib/tipos';
import { Cabecera, Cargando, Dato, ErrorCarga, Miga, PillOP, Termino, Vacio } from '../componentes/Comunes';
import { Icono, type NombreIcono } from '../componentes/Icono';

interface DatosPanel {
  turno: string;
  kpis: { activas: number; enProduccion: number; planificadas: number; produccionHoyKg: number; objetivoKg: number; objetivoPct: number; lotesCuarentena: number };
  atencion: {
    stockBajo: { insumo_id: number; nombre: string; disponible: number; minimo: number; unidad: string }[]; stockBajoTotal: number;
    cuarentena: { id: number; codigo: string; cantidad_kg: number }[]; cuarentenaTotal: number;
  };
}

const POR_PAGINA = 8;
const PESTANAS: [string, string, (o: OrdenResumen) => boolean][] = [
  ['todas', 'Todas', () => true],
  ['curso', 'En curso', (o) => o.estado === 'PLANIFICADA' || o.estado === 'EN_PRODUCCION'],
  ['cc', 'En calidad', (o) => o.estado === 'EN_CONTROL_CALIDAD'],
];

/** Qué dice el enlace de cada fila y a dónde lleva. */
function accionDeOrden(o: OrdenResumen): { texto: string; url?: string } {
  const traza = `/trazabilidad?q=${encodeURIComponent(o.lote_codigo || o.numero)}`;
  switch (o.estado) {
    case 'CREADA': return { texto: 'Completar', url: `/ordenes/${o.id}` };
    case 'PLANIFICADA': return { texto: 'Elaborar', url: `/ejecucion/${o.id}` };
    case 'EN_PRODUCCION': return { texto: 'Ver avance', url: `/ejecucion/${o.id}` };
    case 'EN_CONTROL_CALIDAD': return o.lote_estado === 'APROBADO_LIBERADO' ? { texto: 'Recibir', url: `/deposito/${o.id}` } : { texto: 'Analizar', url: `/calidad/${o.lote_id}` };
    case 'FINALIZADA': return { texto: 'Ver cierre', url: traza };
    case 'RECHAZADA_SCRAP': return { texto: 'Ver motivo', url: traza };
    default: return { texto: 'Ver detalle' };
  }
}

/** La tarea que conviene hacer ahora, según el rol de quien ingresó. */
function tareaSugerida(rol: Rol, p: Pendientes | undefined): { icono: NombreIcono; titulo: string; texto: string; boton: string; url: string } {
  const n = p ?? { planificar: 0, elaborar: 0, calidad: 0, deposito: 0, alertas: 0 };
  switch (rol) {
    case 'PRODUCCION':
      return n.elaborar > 0
        ? { icono: 'ejecucion', titulo: `${plural(n.elaborar, 'orden lista', 'órdenes listas')} para elaborar`, texto: 'Iniciá la elaboración y registrá qué partida de cada insumo usaste.', boton: 'Ir a Elaborar', url: '/ejecucion' }
        : { icono: 'ordenes', titulo: 'Planificá una nueva orden', texto: 'Elegí producto y cantidad: SIGTA calcula los insumos y verifica el stock.', boton: 'Nueva orden', url: '/ordenes/nueva' };
    case 'CALIDAD':
      return { icono: 'calidad', titulo: n.calidad ? `${plural(n.calidad, 'lote espera', 'lotes esperan')} tu análisis` : 'No hay lotes en cuarentena', texto: 'Cargá los resultados del laboratorio y firmá el dictamen (R.BPM.01V01).', boton: 'Ir a Control de calidad', url: '/calidad' };
    case 'DEPOSITO':
      return { icono: 'deposito', titulo: n.deposito ? `${plural(n.deposito, 'lote liberado', 'lotes liberados')} para recibir` : 'No hay lotes liberados para recibir', texto: 'Controlá lo recibido, armá los pallets y asigná su ubicación.', boton: 'Ir a Ingreso a depósito', url: '/deposito' };
    default:
      return { icono: 'trazabilidad', titulo: 'Consultá el recorrido de cualquier lote', texto: 'De qué insumos y proveedores está hecho, quién lo aprobó y a qué cliente llegó.', boton: 'Ir a Trazabilidad', url: '/trazabilidad' };
  }
}

export function Panel() {
  const { usuario, pendientes, puede, nombreRol } = useSesion();
  const { modal, aviso, error } = useDialogos();
  const { datos, error: errorCarga, recargar } = useDatos(() => Promise.all([
    api.get<DatosPanel>('/panel'), api.get<OrdenResumen[]>('/ordenes'), api.get<Linea[]>('/lineas'),
  ]));
  const [pestana, setPestana] = useState('todas');
  const [pagina, setPagina] = useState(1);
  const [texto, setTexto] = useState('');
  const [filtros, setFiltros] = useState({ estado: '', linea: '', desde: '', hasta: '' });
  const refs = { estado: useRef<HTMLSelectElement>(null), linea: useRef<HTMLSelectElement>(null), desde: useRef<HTMLInputElement>(null), hasta: useRef<HTMLInputElement>(null) };

  const ordenes = useMemo(() => [...(datos?.[1] ?? [])].sort((a, b) =>
    (b.fecha_proyectada + b.hora_prevista + String(b.secuencia).padStart(6, '0')).localeCompare(a.fecha_proyectada + a.hora_prevista + String(a.secuencia).padStart(6, '0'))), [datos]);

  if (errorCarga) return <ErrorCarga error={errorCarga} reintentar={recargar} />;
  if (!datos) return <Cargando />;
  const [panel, , lineas] = datos;
  const k = panel.kpis;
  const tarea = tareaSugerida(usuario!.rol, pendientes ?? undefined);

  const filtro = PESTANAS.find((p) => p[0] === pestana)![2];
  const t = texto.trim().toLowerCase();
  const lista = ordenes.filter((o) => filtro(o)
    && (!t || `${o.numero} ${o.producto_nombre} ${o.producto_codigo}`.toLowerCase().includes(t))
    && (!filtros.estado || o.estado === filtros.estado)
    && (!filtros.linea || String(o.linea_id) === filtros.linea)
    && (!filtros.desde || o.fecha_proyectada >= filtros.desde)
    && (!filtros.hasta || o.fecha_proyectada <= filtros.hasta));
  const paginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, paginas);
  const visibles = lista.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA);
  const desde = lista.length ? (paginaActual - 1) * POR_PAGINA + 1 : 0;
  const hayFiltros = Object.values(filtros).some(Boolean);

  const abrirFiltros = () => modal({
    titulo: 'Filtrar órdenes',
    contenido: (
      <div className="rejilla col-2">
        <div className="campo"><label htmlFor="f-estado">Estado</label><select id="f-estado" className="entrada" ref={refs.estado} defaultValue={filtros.estado}>
          <option value="">Todos</option>{(Object.keys(ESTADOS_OP) as EstadoOP[]).map((e) => <option key={e} value={e}>{ESTADOS_OP[e][0]}</option>)}</select></div>
        <div className="campo"><label htmlFor="f-linea">Línea</label><select id="f-linea" className="entrada" ref={refs.linea} defaultValue={filtros.linea}>
          <option value="">Todas</option>{lineas.map((l) => <option key={l.id} value={l.id}>{l.nombre}</option>)}</select></div>
        <div className="campo"><label htmlFor="f-desde">Desde</label><input id="f-desde" type="date" className="entrada" ref={refs.desde} defaultValue={filtros.desde} /></div>
        <div className="campo"><label htmlFor="f-hasta">Hasta</label><input id="f-hasta" type="date" className="entrada" ref={refs.hasta} defaultValue={filtros.hasta} /></div>
      </div>
    ),
    botones: [
      { texto: 'Limpiar', alHacer: () => { setFiltros({ estado: '', linea: '', desde: '', hasta: '' }); setPagina(1); } },
      { texto: 'Aplicar', primario: true, alHacer: () => {
        setFiltros({ estado: refs.estado.current!.value, linea: refs.linea.current!.value, desde: refs.desde.current!.value, hasta: refs.hasta.current!.value });
        setPagina(1);
      } },
    ],
  });

  const detalle = (o: OrdenResumen) => modal({
    titulo: o.numero,
    contenido: (<>
      <p><PillOP estado={o.estado} /></p>
      <div className="rejilla col-2" style={{ marginTop: 14 }}>
        <Dato titulo="Producto">{o.producto_nombre}</Dato><Dato titulo="Objetivo">{kg(o.cantidad_kg)}</Dato>
        <Dato titulo="Programada">{fecha(o.fecha_proyectada)} · {o.hora_prevista}</Dato><Dato titulo="Creada por">{o.creado_por}</Dato>
      </div>
      <p style={{ marginTop: 14, color: 'var(--texto-suave)' }}>{o.observaciones || 'Sin observaciones.'}</p>
    </>),
  });

  const avisarCompras = async () => {
    if (!puede('PRODUCCION')) return aviso(`Sólo ${nombreRol('PRODUCCION')} puede avisar a Compras.`, 'error');
    try {
      for (const i of panel.atencion.stockBajo) await api.post('/panel/avisar-compras', { insumo_id: i.insumo_id });
      aviso('Compras y Suministros fue notificado', 'ok');
    } catch (e) { error(e); }
  };

  const stock = panel.atencion.stockBajo;
  const cuarentena = panel.atencion.cuarentena[0];
  return (
    <>
      <Miga texto="Inicio / Panel de producción" />
      <Cabecera titulo="Panel de producción" sub={`Lo que pasa hoy en planta. ${panel.turno}.`}>
        {puede('PRODUCCION') && <Link className="btn primario" to="/ordenes/nueva" style={{ padding: '14px 22px' }}><Icono n="mas" /> Nueva orden</Link>}
      </Cabecera>

      <div className="tarea" data-testid="tarea-sugerida">
        <div className="icono"><Icono n={tarea.icono} tam={24} /></div>
        <div className="texto"><small>Hola, {usuario!.nombre.split(' ')[0]} · Tu próxima tarea</small><b>{tarea.titulo}</b><span>{tarea.texto}</span></div>
        <Link className="btn" to={tarea.url}>{tarea.boton} <Icono n="flecha" tam={18} /></Link>
      </div>

      <div className="kpis kpis-3">
        <div className="kpi"><div className="t">Órdenes activas</div><div className="v">{k.activas}</div><div className="d">{k.enProduccion} en producción · {k.planificadas} planificadas</div></div>
        <div className="kpi destacado"><div className="t">Producción de hoy</div><div className="v">{num(k.produccionHoyKg)} kg</div><div className="d">{k.objetivoPct} % del objetivo de {num(k.objetivoKg)} kg</div></div>
        <div className="kpi"><div className="t">Lotes en <Termino t="cuarentena">cuarentena</Termino></div><div className="v">{k.lotesCuarentena}</div><div className="d">Esperan el dictamen de Calidad</div></div>
      </div>

      {(stock.length > 0 || cuarentena) && (
        <section className="tarjeta atencion">
          <h2>Para resolver</h2>
          {stock.length > 0 && (
            <div className="atencion-caja"><b>Stock bajo · {plural(panel.atencion.stockBajoTotal, 'insumo')}</b>
              {stock.map((i) => <div key={i.insumo_id}>{i.nombre}: {num(i.disponible)} {i.unidad} (mínimo {num(i.minimo)})</div>)}
              <button className="enlace" onClick={avisarCompras} style={{ marginTop: 6 }}>Avisar a Compras →</button></div>
          )}
          {cuarentena && (
            <div className="atencion-caja neutra"><b>{plural(panel.atencion.cuarentenaTotal, 'lote esperando', 'lotes esperando')} dictamen</b>
              <div>{cuarentena.codigo} · {kg(cuarentena.cantidad_kg)}{panel.atencion.cuarentenaTotal > 1 ? ` y ${panel.atencion.cuarentenaTotal - 1} más` : ''}</div>
              <Link className="enlace" to="/calidad">Ir a Control de calidad →</Link></div>
          )}
        </section>
      )}

      <section className="tarjeta">
        <div className="tarjeta-cab"><div><h2>Órdenes de producción</h2><p className="sub"><Termino t="op">Órdenes</Termino> de los últimos días. El enlace de cada fila lleva al paso que sigue.</p></div>
          <button className="btn" onClick={abrirFiltros}><Icono n="filtro" /> Filtrar{hayFiltros ? ' · activo' : ''}</button></div>
        <div className="pestanas">
          {PESTANAS.map(([id, nombre, f]) => (
            <button key={id} className={id === pestana ? 'activa' : ''} onClick={() => { setPestana(id); setPagina(1); }}>{nombre} · {ordenes.filter(f).length}</button>
          ))}
          <label className="buscador"><Icono n="buscar" tam={18} /><input placeholder="Buscar OP o producto" aria-label="Buscar OP o producto" value={texto} onChange={(e) => { setTexto(e.target.value); setPagina(1); }} /></label>
        </div>
        <table className="tabla">
          <thead><tr><th>Orden</th><th>Producto</th><th>Objetivo</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {visibles.length ? visibles.map((o) => {
              const a = accionDeOrden(o);
              return (
                <tr key={o.id}>
                  <td><b>{o.numero}</b></td>
                  <td><b>{o.producto_nombre}</b><span className="peq">{fechaCorta(o.fecha_proyectada)} · {o.hora_prevista} · {o.linea_nombre}{o.estado === 'EN_PRODUCCION' && o.pausada ? ` · Pausada: ${o.motivo_pausa}` : ''}</span></td>
                  <td className="num">{kg(o.cantidad_kg)}</td>
                  <td><PillOP estado={o.estado} /></td>
                  <td>{a.url ? <Link className="enlace" to={a.url}>{a.texto} →</Link> : <button className="enlace" onClick={() => detalle(o)}>{a.texto} →</button>}</td>
                </tr>
              );
            }) : <tr><td colSpan={5}><Vacio titulo="No hay órdenes para mostrar">Probá con otro filtro o creá una nueva orden.</Vacio></td></tr>}
          </tbody>
        </table>
        <div className="paginado">
          <span>Mostrando {desde ? `${desde}–${desde + visibles.length - 1}` : 0} de {lista.length} órdenes</span>
          <div className="paginas">
            <button disabled={paginaActual === 1} onClick={() => setPagina(paginaActual - 1)} aria-label="Página anterior"><Icono n="chevIzq" tam={16} /></button>
            {Array.from({ length: paginas }, (_, i) => <button key={i} className={i + 1 === paginaActual ? 'activa' : ''} onClick={() => setPagina(i + 1)}>{i + 1}</button>)}
            <button disabled={paginaActual === paginas} onClick={() => setPagina(paginaActual + 1)} aria-label="Página siguiente"><Icono n="chevDer" tam={16} /></button>
          </div>
        </div>
      </section>
    </>
  );
}
