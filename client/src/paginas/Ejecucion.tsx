/** Paso 2 · Elaborar: ejecución de la orden y consumo real por partida (CU-P02). */
import { useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useDatos } from '../lib/useDatos';
import { useSesion } from '../contexto/Sesion';
import { useDialogos } from '../contexto/Dialogos';
import { fecha, fechaCorta, fechaHora, hoyTexto, kg, leerNumero, num, pesoTexto } from '../lib/formato';
import type { Color } from '../lib/estados';
import type { FilaConsumo, Orden, OrdenResumen } from '../lib/tipos';
import { Cabecera, Cargando, ConUnidad, Dato, ErrorCarga, Miga, Pill, PillOP, Termino, Vacio } from '../componentes/Comunes';
import { Proceso } from '../componentes/Proceso';
import { Icono } from '../componentes/Icono';

export function Ejecucion() {
  const { id } = useParams();
  return id ? <ConOrden id={Number(id)} /> : <ListaParaElegir />;
}

/* ---------- Sin orden elegida: lista para escoger ---------- */
function ListaParaElegir() {
  const navegar = useNavigate();
  const { datos, error, recargar } = useDatos(() => api.get<OrdenResumen[]>('/ordenes'));
  if (error) return <ErrorCarga error={error} reintentar={recargar} />;
  if (!datos) return <Cargando />;
  const utiles = datos.filter((o) => o.estado === 'PLANIFICADA' || o.estado === 'EN_PRODUCCION')
    .sort((a, b) => (a.fecha_proyectada + a.hora_prevista).localeCompare(b.fecha_proyectada + b.hora_prevista));
  return (
    <>
      <Miga texto="Circuito de producción / Paso 2 · Elaborar" />
      <Cabecera titulo="Elaborar" sub="Elegí la orden con la que vas a trabajar." />
      <Proceso actual={2} />
      <section className="tarjeta">
        {utiles.length ? (
          <table className="tabla clic">
            <thead><tr><th>Orden</th><th>Producto y línea</th><th>Programación</th><th>Estado</th><th></th></tr></thead>
            <tbody>{utiles.map((o) => (
              <tr key={o.id} onClick={() => navegar(`/ejecucion/${o.id}`)}>
                <td><b>{o.numero}</b></td><td><b>{o.producto_nombre}</b><span className="peq">{o.linea_nombre} · {kg(o.cantidad_kg)}</span></td>
                <td className="num">{fechaCorta(o.fecha_proyectada)} · {o.hora_prevista}</td>
                <td>{o.pausada ? <Pill color="rojo">Pausada</Pill> : <PillOP estado={o.estado} />}</td>
                <td><Link className="enlace" to={`/ejecucion/${o.id}`}>Abrir →</Link></td>
              </tr>))}</tbody>
          </table>
        ) : (
          <Vacio titulo="No hay órdenes para elaborar">Planificá una orden nueva para empezar.<br /><br /><Link className="btn primario" to="/ordenes/nueva">Nueva orden de producción</Link></Vacio>
        )}
      </section>
    </>
  );
}

function ConOrden({ id }: { id: number }) {
  const { datos: orden, error, recargar, setDatos } = useDatos(() => api.get<Orden>(`/ordenes/${id}`), [id]);
  if (error) return <ErrorCarga error={error} reintentar={recargar} />;
  if (!orden) return <Cargando />;
  if (orden.estado === 'CREADA') return <Navigate to={`/ordenes/${id}`} replace />;
  return (
    <>
      <Miga texto={`Circuito de producción / Paso 2 · Elaborar / ${orden.numero}`} />
      <CabeceraOrden orden={orden} />
      {orden.estado === 'PLANIFICADA' ? <VistaPlanificada orden={orden} alCambiar={setDatos} />
        : orden.estado === 'EN_PRODUCCION' ? <VistaEjecucion key={`${orden.id}-${orden.pausada}`} orden={orden} alCambiar={setDatos} />
          : <VistaCerrada orden={orden} />}
    </>
  );
}

/* ---------- Encabezado de la orden ---------- */
function CabeceraOrden({ orden: o }: { orden: Orden }) {
  const { modal, error } = useDialogos();
  const enProd = o.estado === 'EN_PRODUCCION';
  const transcurrido = () => {
    const min = Math.max(0, Math.round((Date.now() - new Date(o.inicio_real!).getTime()) / 60000));
    return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')} min`;
  };
  const verReceta = async () => {
    try {
      const r = await api.get<{ codigo: string; version: number; producto_nombre: string; base_kg: number; vigente_desde: string; items: { codigo: string; nombre: string; unidad: string; cantidad_base: number }[] }>(`/recetas/${o.receta_id}`);
      modal({
        titulo: `${r.codigo} · Versión ${r.version}`, ancho: 560,
        contenido: (<>
          <p className="sub" style={{ color: 'var(--texto-suave)' }}>{r.producto_nombre} · cantidades cada {num(r.base_kg)} kg · vigente desde {fecha(r.vigente_desde)}</p>
          <table className="tabla" style={{ marginTop: 12 }}><thead><tr><th>Insumo</th><th>Cantidad base</th></tr></thead>
            <tbody>{r.items.map((i) => <tr key={i.codigo}><td><b>{i.nombre}</b><span className="peq">{i.codigo}</span></td><td className="num">{num(i.cantidad_base)} {i.unidad}</td></tr>)}</tbody></table>
        </>),
      });
    } catch (e) { error(e); }
  };
  return (
    <>
      <Cabecera titulo="Elaborar" sub={`${o.producto_nombre} ${o.presentacion} · ${o.linea_nombre ?? ''} · ${o.hora_prevista < '14:00' ? 'Turno mañana' : 'Turno tarde'}`}>
        <button className="btn" onClick={verReceta}><Icono n="libro" /> Ver receta</button>
      </Cabecera>
      <Proceso actual={2} guia={o.estado === 'PLANIFICADA' || enProd} />
      <section className="tarjeta">
        <div className="tarjeta-cab">
          <div><h2>{o.numero}</h2><p className="sub">Receta {o.receta_codigo} v{o.receta_version} · Objetivo {kg(o.cantidad_kg)}</p></div>
          {enProd ? (o.pausada ? <Pill color="rojo">Pausada · {o.motivo_pausa}</Pill> : <Pill color="ambar">En curso · {transcurrido()}</Pill>) : <PillOP estado={o.estado} />}
        </div>
        <div className="rejilla col-3">
          <Dato titulo={enProd ? 'Inicio real' : 'Inicio previsto'}>{o.inicio_real ? fechaHora(o.inicio_real) : `${fecha(o.fecha_proyectada)} · ${o.hora_prevista}`}</Dato>
          <Dato titulo={<Termino t="lote">Lote</Termino>}>{o.lote_codigo_previsto || 'Se asigna al iniciar'}</Dato>
          <Dato titulo="Vencimiento previsto">{o.vencimiento_previsto ? fecha(o.vencimiento_previsto) : `${o.vida_util_meses} meses de vida útil`}</Dato>
        </div>
      </section>
    </>
  );
}

/* ---------- Orden PLANIFICADA: todavía no se empezó ---------- */
function VistaPlanificada({ orden: o, alCambiar }: { orden: Orden; alCambiar: (o: Orden) => void }) {
  const { puede, nombreRol } = useSesion();
  const { aviso, error, modal } = useDialogos();
  const navegar = useNavigate();
  const motivo = useRef<HTMLInputElement>(null);
  const habilitado = puede('PRODUCCION');
  const titulo = habilitado ? undefined : `Sólo ${nombreRol('PRODUCCION')} puede hacer esto.`;

  const iniciar = async () => {
    try {
      const actualizada = await api.post<Orden>(`/ordenes/${o.id}/iniciar`);
      aviso(`Elaboración iniciada · lote ${actualizada.lote_codigo_previsto}`, 'ok');
      alCambiar(actualizada);
    } catch (e) { error(e); }
  };
  const cancelar = () => modal({
    titulo: 'Cancelar la orden',
    contenido: <div className="campo"><label htmlFor="motivo-cancel">Motivo de la cancelación</label><input className="entrada" id="motivo-cancel" ref={motivo} placeholder="Ej.: cambio en el pedido del cliente" /></div>,
    botones: [{ texto: 'Volver' }, {
      texto: 'Cancelar orden', peligro: true, alHacer: async () => {
        try { await api.post(`/ordenes/${o.id}/cancelar`, { motivo: motivo.current?.value.trim() }); aviso('Orden cancelada', 'ok'); navegar('/panel'); } catch (e) { error(e); return false; }
      },
    }],
  });

  return (
    <>
      <section className="tarjeta"><h2>Insumos previstos</h2><p className="sub">Según la receta. Las <Termino t="partida">partidas</Termino> se eligen al iniciar.</p>
        <table className="tabla" style={{ marginTop: 16 }}><thead><tr><th>Insumo</th><th>Teórico</th></tr></thead>
          <tbody>{o.items.map((i) => (
            <tr key={i.insumo_id}><td><b>{i.nombre}</b><span className="peq">{i.codigo} · {i.tipo === 'MP' ? 'Materia prima' : 'Empaque crítico'}</span></td><td className="num">{num(i.cantidad_teorica)} {i.unidad}</td></tr>
          ))}</tbody></table>
      </section>
      <div className="barra-acciones"><span className="nota">Al iniciar se asigna el número de lote y su vencimiento.</span>
        <div className="botones">
          <button className="btn peligro" disabled={!habilitado} title={titulo} onClick={cancelar}>Cancelar orden</button>
          <button className="btn primario" disabled={!habilitado} title={titulo} onClick={iniciar}><Icono n="play" /> Iniciar elaboración</button>
        </div>
      </div>
    </>
  );
}

/* ---------- Orden ya elaborada (o cerrada): sólo resumen ---------- */
function VistaCerrada({ orden: o }: { orden: Orden }) {
  return (
    <section className="tarjeta">
      <Vacio titulo={o.estado === 'CANCELADA' ? 'La orden fue cancelada' : 'La elaboración ya fue registrada'}>
        {o.cantidad_real_kg ? <>Se elaboraron {kg(o.cantidad_real_kg)} netos ({num(o.bultos)} unidades de {pesoTexto(o.presentacion_kg)}). Merma de proceso: {num(o.merma_pct, 2)} %.<br /><br /></> : null}
        {o.estado !== 'CANCELADA' && <Link className="btn primario" to={`/trazabilidad?q=${encodeURIComponent(o.lote_codigo || o.numero)}`}><Icono n="trazabilidad" /> Ver trazabilidad del lote</Link>}
      </Vacio>
    </section>
  );
}

/* ---------- Orden EN_PRODUCCION: carga del consumo real ---------- */
interface Fila { insumo_id: number; partida_id: number | null; cantidad: string; teorico: number }

function filasIniciales(o: Orden): Fila[] {
  const sugeridas = o.consumo_sugerido ?? [];
  const base: FilaConsumo[] = o.avance?.consumos?.length ? o.avance.consumos : sugeridas; // si hay avance guardado, se retoma
  return base.map((f) => {
    const sug = sugeridas.find((s) => s.insumo_id === f.insumo_id && s.partida_id === f.partida_id);
    return { insumo_id: f.insumo_id, partida_id: f.partida_id, cantidad: String(f.cantidad ?? ''), teorico: sug ? sug.cantidad : 0 };
  });
}

function VistaEjecucion({ orden: o, alCambiar }: { orden: Orden; alCambiar: (o: Orden) => void }) {
  const { puede, nombreRol, config } = useSesion();
  const { aviso, error, modal, confirmar } = useDialogos();
  const navegar = useNavigate();
  const habilitado = puede('PRODUCCION');
  const editable = habilitado && !o.pausada;
  const titulo = habilitado ? undefined : `Sólo ${nombreRol('PRODUCCION')} puede hacer esto.`;
  const presentacion = o.presentacion_kg;

  const [filas, setFilas] = useState<Fila[]>(() => filasIniciales(o));
  const itemDe = (insumoId: number) => o.items.find((i) => i.insumo_id === insumoId)!;
  const partidaDe = (f: Fila) => itemDe(f.insumo_id).partidas?.find((p) => p.id === f.partida_id);
  const mpConsumidos = filas.filter((f) => itemDe(f.insumo_id).tipo === 'MP').reduce((a, f) => a + (leerNumero(f.cantidad) || 0), 0);

  // sugerencia: el 98 % del objetivo, redondeado a unidades enteras (en deshidratados, lo consumido es mucho más: es el agua que se evapora)
  const netoSugerido = Math.round(Math.round((o.cantidad_kg * 0.98) / presentacion) * presentacion * 1000) / 1000;
  const [neto, setNeto] = useState(String(o.avance?.cantidad_real_kg ?? netoSugerido));
  const [bolsas, setBolsas] = useState(String(o.avance?.bultos ?? Math.round(leerNumero(o.avance?.cantidad_real_kg ?? netoSugerido) / presentacion)));
  const [motivo, setMotivo] = useState(config?.motivos_pausa[0] ?? '');
  const [ocupado, setOcupado] = useState(false);
  const insumoDividir = useRef<HTMLSelectElement>(null);

  /** Validación de cada fila: [texto, color]. */
  const validar = (f: Fila): [string, Color] => {
    if (!f.partida_id) return ['Sin lote', 'rojo'];
    const p = partidaDe(f);
    if (!p) return ['Lote inválido', 'rojo'];
    const total = filas.filter((x) => x.partida_id === f.partida_id).reduce((a, x) => a + (leerNumero(x.cantidad) || 0), 0);
    if (p.vencimiento && p.vencimiento < hoyTexto()) return ['Lote vencido', 'rojo'];
    if (total > p.cantidad + 1e-9) return ['Saldo insuficiente', 'rojo'];
    if (!(leerNumero(f.cantidad) > 0)) return ['Falta cantidad', 'ambar'];
    return ['Lote válido', 'verde'];
  };
  const invalidas = filas.filter((f) => validar(f)[1] === 'rojo').length;
  const criticosSinLote = o.items.filter((i) => i.critico && !filas.some((f) => f.insumo_id === i.insumo_id && f.partida_id && leerNumero(f.cantidad) > 0)).length;
  const todoOk = invalidas === 0 && criticosSinLote === 0;
  const netoNum = leerNumero(neto) || 0;
  const mermaPct = mpConsumidos > 0 ? Math.max(0, ((mpConsumidos - netoNum) / mpConsumidos) * 100) : 0;

  const cambiarFila = (i: number, cambios: Partial<Fila>) => setFilas((fs) => fs.map((f, j) => (j === i ? { ...f, ...cambios } : f)));
  const cuerpo = () => ({
    consumos: filas.filter((f) => f.partida_id && leerNumero(f.cantidad) > 0).map((f) => ({ insumo_id: f.insumo_id, partida_id: f.partida_id, cantidad: leerNumero(f.cantidad) })),
    cantidad_real_kg: netoNum,
    bultos: Math.round(leerNumero(bolsas) || 0),
  });

  const dividir = () => {
    const opciones = o.items.filter((i) => (i.partidas?.length ?? 0) > 1);
    if (!opciones.length) return aviso('Ningún insumo tiene más de una partida disponible.');
    modal({
      titulo: 'Dividir consumo',
      contenido: <div className="campo"><label htmlFor="div-insumo">¿Qué insumo querés repartir entre dos partidas?</label>
        <select className="entrada" id="div-insumo" ref={insumoDividir}>{opciones.map((i) => <option key={i.insumo_id} value={i.insumo_id}>{i.nombre}</option>)}</select></div>,
      botones: [{ texto: 'Cancelar' }, {
        texto: 'Agregar partida', primario: true, alHacer: () => {
          const insumoId = Number(insumoDividir.current!.value);
          const usadas = filas.filter((f) => f.insumo_id === insumoId).map((f) => f.partida_id);
          const libre = itemDe(insumoId).partidas!.find((p) => !usadas.includes(p.id));
          if (!libre) { aviso('Ya usaste todas las partidas de ese insumo.', 'error'); return false; }
          const ultima = filas.map((f, i) => (f.insumo_id === insumoId ? i : -1)).filter((i) => i >= 0).pop()!;
          setFilas((fs) => [...fs.slice(0, ultima + 1), { insumo_id: insumoId, partida_id: libre.id, cantidad: '0', teorico: 0 }, ...fs.slice(ultima + 1)]);
        },
      }],
    });
  };

  const pausarOReanudar = async () => {
    try {
      const r = o.pausada ? await api.post<Orden>(`/ordenes/${o.id}/reanudar`) : await api.post<Orden>(`/ordenes/${o.id}/pausar`, { motivo });
      aviso(o.pausada ? 'Línea reanudada' : 'Línea pausada', 'ok');
      alCambiar({ ...r, avance: { consumos: cuerpo().consumos as FilaConsumo[], cantidad_real_kg: netoNum, bultos: Math.round(leerNumero(bolsas) || 0) } });
    } catch (e) { error(e); }
  };

  const guardarAvance = async () => {
    try {
      await api.put(`/ordenes/${o.id}/avance`, { ...cuerpo(), consumos: filas.map((f) => ({ insumo_id: f.insumo_id, partida_id: f.partida_id, cantidad: leerNumero(f.cantidad) || 0 })) });
      aviso('Avance guardado. No se descontó stock.', 'ok');
    } catch (e) { error(e); }
  };

  const finalizar = async () => {
    const c = cuerpo();
    if (!(c.cantidad_real_kg > 0)) return aviso('Ingresá la cantidad neta elaborada.', 'error');
    if (!(await confirmar('Finalizar elaboración', `Se descontarán los insumos del stock y el lote de ${num(c.cantidad_real_kg)} kg quedará en cuarentena hasta que Calidad lo libere.`, 'Finalizar y enviar a Calidad'))) return;
    setOcupado(true);
    try {
      const r = await api.post<{ orden: Orden; lote_id: number }>(`/ordenes/${o.id}/finalizar-elaboracion`, c);
      modal({
        titulo: 'Elaboración finalizada',
        contenido: <div className="aviso verde" style={{ margin: 0 }}><Icono n="checkCirculo" /><div><b>El lote {r.orden.lote_codigo} quedó en cuarentena</b>Siguiente paso: Calidad lo analiza y firma el protocolo. Mientras tanto no se puede guardar en depósito ni despachar.</div></div>,
        botones: [
          { texto: 'Volver al panel', alHacer: () => navegar('/panel') },
          { texto: 'Ir a Control de calidad', primario: true, alHacer: () => navegar(`/calidad/${r.lote_id}`) },
        ],
      });
      alCambiar(r.orden);
    } catch (e) { error(e); setOcupado(false); }
  };

  return (
    <>
      {o.pausada && <div className="aviso rojo"><Icono n="pausa" /><div><b>Línea pausada · {o.motivo_pausa}</b>Reanudá la línea para seguir cargando.</div></div>}
      <section className="tarjeta">
        <div className="tarjeta-cab">
          <div><h2>Consumo real por lote de origen</h2><p className="sub">SIGTA sugiere las partidas por <Termino t="fefo">FEFO</Termino>. Si usaste otra, cambiala. El stock se descuenta recién al finalizar.</p></div>
          <button className="btn" disabled={!editable} onClick={dividir}><Icono n="dividir" /> Dividir consumo</button>
        </div>
        <table className="tabla">
          <thead><tr><th>Insumo</th><th>Lote de origen</th><th>Teórico</th><th>Real</th><th></th></tr></thead>
          <tbody>{filas.map((f, i) => {
            const item = itemDe(f.insumo_id);
            const mismos = filas.map((x, j) => (x.insumo_id === f.insumo_id ? j : -1)).filter((j) => j >= 0);
            const p = partidaDe(f);
            const [texto, color] = validar(f);
            return (
              <tr key={`${f.insumo_id}-${i}`} data-insumo={item.codigo}>
                <td><b>{item.nombre}</b><span className="peq">{item.codigo}{mismos.length > 1 ? ` · Partida ${mismos.indexOf(i) + 1} de ${mismos.length}` : item.tipo === 'ME' ? ' · Empaque crítico' : ''}</span></td>
                <td style={{ minWidth: 230 }}>
                  <select className="entrada" aria-label={`Lote de origen de ${item.nombre}`} disabled={!editable} value={f.partida_id ?? ''} onChange={(e) => cambiarFila(i, { partida_id: Number(e.target.value) || null })}>
                    {!f.partida_id && <option value="">Elegí un lote</option>}
                    {(item.partidas ?? []).map((x) => <option key={x.id} value={x.id}>{x.nro_lote} · saldo {num(x.cantidad)}</option>)}
                  </select>
                  <span className="peq">{p?.vencimiento ? `Vence ${fecha(p.vencimiento)}` : ''}</span>
                </td>
                <td className="num">{f.teorico ? `${num(f.teorico)} ${item.unidad}` : '—'}</td>
                <td><ConUnidad unidad={item.unidad} ancho={130}><input className="entrada" inputMode="decimal" aria-label={`Cantidad real de ${item.nombre}`} disabled={!editable} value={f.cantidad} onChange={(e) => cambiarFila(i, { cantidad: e.target.value })} /></ConUnidad></td>
                <td><Pill color={color}>{texto}</Pill></td>
              </tr>
            );
          })}</tbody>
        </table>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, gap: 16, flexWrap: 'wrap' }}>
          <span style={{ color: todoOk ? 'var(--verde)' : 'var(--rojo)', fontWeight: 600, display: 'flex', gap: 8, alignItems: 'center' }}>
            <Icono n={todoOk ? 'checkCirculo' : 'info'} />{todoOk ? 'Todos los lotes son válidos' : `${invalidas + criticosSinLote} para revisar`}</span>
          <span style={{ color: 'var(--texto-suave)', fontSize: 14 }}>Total materias primas: {num(mpConsumidos)} kg</span>
        </div>
      </section>

      <div className="dos-col" style={{ gridTemplateColumns: 'minmax(0,1fr) 360px' }}>
        <section className="tarjeta"><h2>Resultado</h2>
          <div className="rejilla col-3" style={{ marginTop: 18 }}>
            <div className="campo"><label htmlFor="neto">Kg netos elaborados *</label>
              <ConUnidad unidad="kg"><input className="entrada" id="neto" inputMode="decimal" disabled={!editable} value={neto}
                onChange={(e) => { setNeto(e.target.value); setBolsas(String(Math.round((leerNumero(e.target.value) || 0) / presentacion))); }} /></ConUnidad></div>
            <div className="campo"><label htmlFor="bolsas">Unidades</label>
              <ConUnidad unidad={`× ${pesoTexto(presentacion)}`}><input className="entrada" id="bolsas" inputMode="numeric" disabled={!editable} value={bolsas} onChange={(e) => setBolsas(e.target.value)} /></ConUnidad></div>
            <div className="campo"><label><Termino t="merma">Merma</Termino></label>
              <div className="entrada" data-testid="merma" style={{ background: 'var(--ambar-suave)', borderColor: 'var(--ambar-suave)', color: 'var(--ambar-oscuro)', fontSize: 24, fontWeight: 600, padding: '8px 14px' }}>
                {num(mermaPct, 2)} % <small style={{ fontSize: 14, fontWeight: 600, marginLeft: 6 }}>{num(Math.max(0, mpConsumidos - netoNum), 1)} kg</small></div></div>
          </div>
          <p className="ayuda" style={{ marginTop: 14, color: 'var(--texto-suave)', fontSize: 13 }}>Merma = (kg consumidos − kg netos) / kg consumidos.</p>
        </section>
        <section className="tarjeta"><h2>Pausa de línea</h2>
          <div className="campo" style={{ marginTop: 14 }}><label htmlFor="motivo">Motivo para pausar *</label>
            <select className="entrada" id="motivo" disabled={o.pausada || !habilitado} value={motivo} onChange={(e) => setMotivo(e.target.value)}>
              {config?.motivos_pausa.map((m) => <option key={m}>{m}</option>)}</select></div>
          <div style={{ height: 12 }} />
          <button className={`btn ${o.pausada ? 'primario' : ''}`} disabled={!habilitado} title={titulo} onClick={pausarOReanudar}>
            <Icono n={o.pausada ? 'play' : 'pausa'} /> {o.pausada ? 'Reanudar línea' : 'Pausar línea'}</button>
        </section>
      </div>

      <div className="confirmacion"><Icono n="escudo" tam={22} /><div><b>Al finalizar, el lote queda en <Termino t="cuarentena">cuarentena</Termino></b>Se descuenta el stock de los insumos y el lote no se puede vender ni despachar hasta que Calidad lo libere.</div></div>
      <div className="barra-acciones"><span className="nota">Podés guardar el avance y seguir después.</span>
        <div className="botones">
          <button className="btn" disabled={!habilitado} title={titulo} onClick={guardarAvance}><Icono n="guardar" /> Guardar avance</button>
          <button className="btn primario" disabled={!editable || ocupado} title={titulo} onClick={finalizar}><Icono n="flecha" /> Finalizar y enviar a Calidad</button>
        </div>
      </div>
    </>
  );
}
