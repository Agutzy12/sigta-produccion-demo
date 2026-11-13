/** Consulta · Trazabilidad de lote: hacia atrás (insumos y proveedores) y hacia adelante (depósito y clientes). */
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, ErrorApi } from '../lib/api';
import { useSesion } from '../contexto/Sesion';
import { useDialogos } from '../contexto/Dialogos';
import { LogoEmpresa } from '../contexto/Tema';
import { fecha, fechaHora, hora, kg, leerNumero, num, pesoTexto, plural } from '../lib/formato';
import { ESTADOS_LOTE } from '../lib/estados';
import type { EstadoLote, Pallet } from '../lib/tipos';
import { Cabecera, Cargando, ConUnidad, Dato, Miga, Pill, PillLote, Termino, Vacio } from '../componentes/Comunes';
import { Icono, IsotipoSigta, type NombreIcono } from '../componentes/Icono';
import { EtiquetaGS1 } from '../componentes/EtiquetaGS1';

interface Ficha {
  tipo: 'LOTE';
  lote: { id: number; codigo: string; estado: EstadoLote; cantidad_kg: number; bultos: number; vencimiento: string; creado_en: string; producto_codigo: string; producto_nombre: string; presentacion_kg: number; presentacion: string; url_web: string | null; categoria_nombre: string | null };
  op: { numero: string; inicio_real: string | null; merma_pct: number | null; linea_nombre: string | null };
  origen: { insumo_id: number; insumo_nombre: string; unidad: string; total: number; proveedores: string[]; lotes: { nro_lote: string; cantidad: number; documento_origen: string | null }[] }[];
  resumen_origen: { insumos: number; partidas: number };
  kg_consumidos: number;
  calidad: { protocolo: string; fecha: string; analista: string; dictamen: string; formulario: string } | null;
  ingreso: { rack: string; nivel: string; sector: string; kg_recibidos: number; comprobante: string } | null;
  pallets: (Pallet & { gs1: string })[];
  stock_vendible_kg: number;
  despachos: { id: number; cliente: string; cantidad_kg: number; fecha: string }[];
  despachado_kg: number;
  historial: { fecha: string; evento: string; usuario: string; resultado: string | null }[];
}
interface Lista { tipo: 'LISTA'; lotes: { id: number; codigo: string; estado: EstadoLote; cantidad_kg: number; producto_nombre: string }[] }
interface Partidas {
  tipo: 'PARTIDA';
  partidas: { id: number; nro_lote: string; insumo_nombre: string; proveedor: string | null; documento_origen: string | null; cantidad: number;
    lotes: { id: number; codigo: string; estado: EstadoLote; producto_nombre: string; despachos: { cliente: string; cantidad_kg: number }[] }[] }[];
}
type Resultado = Ficha | Lista | Partidas;

export function Trazabilidad() {
  const { puede, nombreRol } = useSesion();
  const { modal, aviso, error } = useDialogos();
  const [parametros, setParametros] = useSearchParams();
  const q = parametros.get('q') ?? '';
  const [texto, setTexto] = useState(q);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [fallo, setFallo] = useState<string | null>(null);
  const [buscando, setBuscando] = useState(true);
  const [vuelta, setVuelta] = useState(0);
  const despachoKg = useRef<HTMLInputElement>(null);
  const despachoCliente = useRef<HTMLInputElement>(null);
  const codigoPegado = useRef<HTMLInputElement>(null);

  // Si no se pidió nada, se muestra el último lote ingresado a depósito
  useEffect(() => {
    let vigente = true;
    (async () => {
      setBuscando(true);
      setFallo(null);
      try {
        let consulta = q;
        if (!consulta) {
          const stock = await api.get<{ lote_codigo: string }[]>('/stock-pt');
          consulta = stock.at(-1)?.lote_codigo ?? '';
          if (!consulta) { setResultado(null); return; }
        }
        const r = await api.get<Resultado>(`/trazabilidad?q=${encodeURIComponent(consulta)}`);
        if (vigente) { setResultado(r); setTexto(r.tipo === 'LOTE' ? r.lote.codigo : consulta); }
      } catch (e) {
        if (vigente) { setResultado(null); setFallo(e instanceof Error ? e.message : String(e)); }
      } finally { if (vigente) setBuscando(false); }
    })();
    return () => { vigente = false; };
  }, [q, vuelta]);

  const buscar = (valor: string) => { const v = valor.trim(); if (v === q) setVuelta((x) => x + 1); else setParametros(v ? { q: v } : {}); };
  const enviar = (e: FormEvent) => { e.preventDefault(); buscar(texto); };

  /** Simulación del lector: se "escanea" la etiqueta GS1-128 de un pallet y el sistema la interpreta. */
  const escanear = async () => {
    try {
      const stock = await api.get<{ lote_codigo: string }[]>('/stock-pt');
      const codigos = [...new Set(stock.slice(-4).map((s) => s.lote_codigo))].reverse();
      const etiquetas: { gs1: string; lote: string; pallet: string }[] = [];
      for (const c of codigos) {
        const f = await api.get<Ficha>(`/trazabilidad?q=${encodeURIComponent(c)}`);
        if (f.pallets[0]) etiquetas.push({ gs1: f.pallets[0].gs1, lote: c, pallet: f.pallets[0].codigo });
      }
      const cerrar = modal({
        titulo: 'Escanear etiqueta GS1-128', ancho: 640,
        contenido: (<>
          <p style={{ marginBottom: 12, color: 'var(--texto-suave)' }}>Simulación del lector de códigos (colectoras Zebra). Elegí un pallet: el sistema lee el código <Termino t="gs1">GS1-128</Termino> y encuentra su lote.</p>
          <table className="tabla clic"><tbody>{etiquetas.map((e) => (
            <tr key={e.pallet} onClick={() => { cerrar(); aviso(`Etiqueta leída: ${e.gs1}`); setParametros({ q: e.gs1 }); }}>
              <td><Icono n="barras" tam={18} /> <b>{e.pallet}</b><span className="peq" style={{ fontFamily: 'monospace' }}>{e.gs1}</span></td></tr>
          ))}</tbody></table>
          <div className="campo" style={{ marginTop: 16 }}><label htmlFor="codigo-pegado">…o pegá el texto de una etiqueta</label>
            <input className="entrada" id="codigo-pegado" ref={codigoPegado} placeholder="(01)…(17)…(3102)…(10)…" /></div>
        </>),
        botones: [{ texto: 'Cancelar' }, { texto: 'Leer código', primario: true, alHacer: () => { const v = codigoPegado.current?.value.trim(); if (v) setParametros({ q: v }); } }],
      });
    } catch (e) { error(e); }
  };

  const despacho = (f: Ficha) => {
    if (!puede('DEPOSITO')) return aviso(`Sólo ${nombreRol('DEPOSITO')} puede registrar despachos.`, 'error');
    modal({
      titulo: `Despacho de ejemplo · ${f.lote.codigo}`,
      contenido: (<>
        <p style={{ marginBottom: 14, color: 'var(--texto-suave)' }}>Si el lote no está aprobado y liberado, el sistema bloquea el despacho (<Termino t="bloqueo">bloqueo lógico</Termino>).</p>
        <div className="rejilla col-2">
          <div className="campo"><label htmlFor="d-cliente">Cliente</label><input className="entrada" id="d-cliente" ref={despachoCliente} defaultValue="Distribuidora Mayorista del Litoral S.R.L." /></div>
          <div className="campo"><label htmlFor="d-kg">Cantidad</label><ConUnidad unidad="kg"><input className="entrada" id="d-kg" ref={despachoKg} defaultValue={Math.max(1, Math.min(100, Math.floor(f.stock_vendible_kg || 100)))} /></ConUnidad></div>
        </div>
      </>),
      botones: [{ texto: 'Cancelar' }, {
        texto: 'Despachar', primario: true, alHacer: async () => {
          try {
            await api.post('/despachos', { lote_id: f.lote.id, cliente: despachoCliente.current!.value.trim(), cantidad_kg: leerNumero(despachoKg.current!.value) });
            aviso('Despacho registrado', 'ok');
          } catch (e) {
            error(e);
            if (!(e instanceof ErrorApi && e.estado === 423)) return false;
          }
          setVuelta((v) => v + 1); // el intento bloqueado también queda en el historial
        },
      }],
    });
  };

  return (
    <>
      <div className="solo-impresion"><div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><span style={{ width: 40, display: 'inline-block' }}><IsotipoSigta /></span><b style={{ fontSize: 22 }}>SIGTA</b><LogoEmpresa alto={40} siempreClaro /></div>
        <div style={{ textAlign: 'right' }}><b>Ficha de trazabilidad de lote</b><br /><small>Emitida el {fecha(new Date().toISOString())} · {hora(new Date())} · Datos de ejemplo</small></div></div>
      <Miga texto="Consultas / Trazabilidad de lote" />
      <Cabecera titulo="Trazabilidad de lote" sub="Seguí un lote desde sus insumos hasta el cliente.">
        <button className="btn" onClick={() => window.print()}><Icono n="imprimir" /> Imprimir ficha</button>
      </Cabecera>
      <form className="buscar-barra" onSubmit={enviar}>
        <Icono n="trazabilidad" tam={26} />
        <div className="caja"><small>Lote, orden, pallet, lote de origen o etiqueta GS1</small>
          <input value={texto} onChange={(e) => setTexto(e.target.value)} autoComplete="off" aria-label="Código a buscar" placeholder="Ej.: L-MRC01-202646-01 u OP-2026-00128" /></div>
        <button className="btn primario" type="submit"><Icono n="buscar" /> Buscar</button>
        <button className="btn" type="button" onClick={escanear}><Icono n="barras" /> Escanear código</button>
      </form>

      {buscando ? <Cargando />
        : fallo ? <section className="tarjeta"><Vacio titulo="No encontramos resultados">{fallo}</Vacio></section>
          : !resultado ? <section className="tarjeta"><Vacio titulo="Ingresá un código para empezar">Podés buscar por lote, orden de producción, pallet o lote de origen de un insumo.</Vacio></section>
            : resultado.tipo === 'LISTA' ? <ListaLotes r={resultado} buscar={buscar} />
              : resultado.tipo === 'PARTIDA' ? <FichaPartida r={resultado} buscar={buscar} />
                : <FichaLote f={resultado} buscar={buscar} despacho={() => despacho(resultado)} />}
    </>
  );
}

function ListaLotes({ r, buscar }: { r: Lista; buscar: (q: string) => void }) {
  return (
    <section className="tarjeta"><h2>Varios lotes coinciden</h2><p className="sub">Elegí uno para ver su recorrido.</p>
      <table className="tabla clic" style={{ marginTop: 14 }}><tbody>{r.lotes.map((l) => (
        <tr key={l.id} onClick={() => buscar(l.codigo)}><td><b>{l.codigo}</b><span className="peq">{l.producto_nombre}</span></td><td>{kg(l.cantidad_kg)}</td><td><PillLote estado={l.estado} /></td></tr>
      ))}</tbody></table>
    </section>
  );
}

/** Búsqueda por lote de origen: de un insumo del proveedor hacia los lotes que lo usaron. */
function FichaPartida({ r, buscar }: { r: Partidas; buscar: (q: string) => void }) {
  return (<>{r.partidas.map((p) => (
    <section className="tarjeta" key={p.id}>
      <div className="tarjeta-cab"><div><div className="codigo" style={{ fontSize: 12, textTransform: 'uppercase' }}><Termino t="partida">Lote de origen</Termino> · Insumo</div>
        <h2>{p.insumo_nombre} · {p.nro_lote}</h2>
        <p className="sub">{p.proveedor || 'Proveedor no informado'} · Remito {p.documento_origen || '—'} · Saldo actual {num(p.cantidad)}</p></div></div>
      <h3 style={{ margin: '8px 0 10px', fontSize: 17 }}>Hacia adelante · Lotes elaborados con esta partida</h3>
      {p.lotes.length ? (
        <table className="tabla clic"><thead><tr><th>Lote</th><th>Producto</th><th>Estado</th><th>Destino</th></tr></thead>
          <tbody>{p.lotes.map((l) => (
            <tr key={l.id} onClick={() => buscar(l.codigo)}><td><b>{l.codigo}</b></td><td>{l.producto_nombre}</td><td><PillLote estado={l.estado} /></td>
              <td>{l.despachos.length ? l.despachos.map((d, i) => <div key={i}>{d.cliente} · {kg(d.cantidad_kg)}</div>) : 'Sin despachos'}</td></tr>
          ))}</tbody></table>
      ) : <p className="sub">Esta partida todavía no se usó en ningún lote.</p>}
    </section>
  ))}</>);
}

const Etapa = ({ icono, titulo, sel, children }: { icono: NombreIcono; titulo: string; sel?: boolean; children: React.ReactNode }) =>
  <div className={`etapa ${sel ? 'sel' : ''}`}><div className="tt"><Icono n={icono} tam={18} /> {titulo}</div>{children}</div>;

function FichaLote({ f, buscar, despacho }: { f: Ficha; buscar: (q: string) => void; despacho: () => void }) {
  const { lote, op, calidad: cal, ingreso } = f;
  const [texto, color] = ESTADOS_LOTE[lote.estado];
  return (
    <>
      <section className="tarjeta">
        <div className="tarjeta-cab"><div><div className="codigo" style={{ fontSize: 12, textTransform: 'uppercase' }}>{lote.producto_codigo} · {lote.categoria_nombre ?? 'Producto terminado'}</div>
          <h2 style={{ fontSize: 28, margin: '4px 0' }}>{lote.producto_nombre} · {lote.presentacion}</h2><p className="sub">{lote.codigo} · {op.numero}{lote.url_web && <> · <a className="enlace" href={lote.url_web} target="_blank" rel="noreferrer">Ficha en la web de Agrifood ↗</a></>}</p></div>
          <Pill color={color}>{texto}</Pill></div>
        <div className="rejilla col-3">
          <Dato titulo="Elaborado · Vence">{fecha(op.inicio_real || lote.creado_en)} · {fecha(lote.vencimiento)}</Dato>
          <Dato titulo="Cantidad">{kg(lote.cantidad_kg)} · {num(lote.bultos)} unidades de {pesoTexto(lote.presentacion_kg)}</Dato>
          <Dato titulo="Stock vendible">{kg(f.stock_vendible_kg)}</Dato>
        </div>
      </section>

      <h2 className="titulo-seccion">Recorrido del lote</h2>
      <div className="recorrido">
        <Etapa icono="trigo" titulo="Origen"><h3>{plural(f.resumen_origen.insumos, 'insumo')}</h3><p>{plural(f.resumen_origen.partidas, 'partida')} de proveedores.</p></Etapa>
        <Etapa icono="ejecucion" titulo="Producción" sel><h3>{op.numero}</h3><p>{kg(f.kg_consumidos)} → {kg(lote.cantidad_kg)}. Merma {num(op.merma_pct, 1)} %.</p></Etapa>
        <Etapa icono="calidad" titulo="Calidad">{cal
          ? <><h3>{cal.protocolo}</h3><p>{fecha(cal.fecha)} · {cal.analista}</p><Pill color={cal.dictamen === 'APROBAR_LIBERAR' ? 'verde' : 'rojo'}>{cal.dictamen === 'APROBAR_LIBERAR' ? 'Aprobado y liberado' : 'Rechazado y bloqueado'}</Pill></>
          : <><h3>Pendiente</h3><p>En cuarentena, esperando análisis.</p><Pill color="ambar">Cuarentena</Pill></>}</Etapa>
        <Etapa icono="deposito" titulo="Depósito">{ingreso
          ? <><h3>{ingreso.rack} / {ingreso.nivel}</h3><p>{kg(ingreso.kg_recibidos)} recibidos · {ingreso.comprobante}</p><Pill color="verde">Stock vendible</Pill></>
          : <><h3>Sin ingreso</h3><p>{lote.estado === 'APROBADO_LIBERADO' ? 'Liberado, espera recepción.' : lote.estado === 'RECHAZADO_BLOQUEADO' ? 'Bloqueado: no puede ingresar.' : 'Todavía no puede ingresar.'}</p></>}</Etapa>
        <Etapa icono="camion" titulo="Destino"><h3>{f.despachos.length ? plural(f.despachos.length, 'despacho') : 'Sin despachos'}</h3><p>{f.despachos.length ? `${kg(f.despachado_kg)} despachados.` : 'Todavía no salió.'}</p></Etapa>
      </div>

      <section className="tarjeta"><h2>Hacia atrás · Insumos y proveedores</h2>
        {f.origen.length ? (
          <table className="tabla" style={{ marginTop: 14 }}><thead><tr><th>Insumo</th><th>Proveedor</th><th>Lote de origen</th><th>Consumo</th></tr></thead>
            <tbody>{f.origen.map((g) => (
              <tr key={g.insumo_id}><td><b>{g.insumo_nombre}</b></td><td>{g.proveedores.join(', ') || '—'}</td>
                <td className="apilado">{g.lotes.map((l, i) => <div key={i}><button className="enlace" onClick={() => buscar(l.nro_lote)}>{l.nro_lote} · {num(l.cantidad)} {g.unidad}</button><span className="peq">{l.documento_origen}</span></div>)}</td>
                <td className="num">{num(g.total)} {g.unidad}</td></tr>
            ))}</tbody></table>
        ) : <p className="sub">Esta orden no tiene consumos registrados.</p>}
      </section>

      <section className="tarjeta">
        <div className="tarjeta-cab"><div><h2>Hacia adelante · Destino</h2>
          <p className="sub">{f.despachos.length ? f.despachos.map((d) => <span key={d.id} style={{ display: 'block' }}>{d.cliente} · {kg(d.cantidad_kg)} · {fecha(d.fecha)}</span>) : 'Este lote todavía no tiene despachos.'}</p></div>
          <button className="btn" onClick={despacho}><Icono n="camion" /> Registrar despacho de ejemplo</button></div>
        {f.pallets.length > 0 && (
          <details className="plegable"><summary>Ver etiquetas GS1-128 de los pallets ({f.pallets.length})</summary>
            <div className="etiquetas">{f.pallets.map((p) => <EtiquetaGS1 key={p.codigo} e={{ ...p, producto: lote.producto_nombre, lote: lote.codigo, vencimiento: lote.vencimiento }} />)}</div>
          </details>
        )}
        <details className="plegable"><summary>Ver historial del lote (auditoría)</summary>
          <table className="tabla"><thead><tr><th>Fecha y hora</th><th>Evento</th><th>Usuario</th><th>Resultado</th></tr></thead>
            <tbody>{f.historial.map((h, i) => <tr key={i}><td className="num">{fechaHora(h.fecha)}</td><td>{h.evento}</td><td>{h.usuario}</td><td>{h.resultado}</td></tr>)}</tbody></table>
        </details>
      </section>
    </>
  );
}
