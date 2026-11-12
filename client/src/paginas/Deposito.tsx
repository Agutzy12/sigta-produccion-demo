/** Paso 4 · Ingresar a depósito: verificación física, pallets, ubicación y cierre de la OP (CU-P04). */
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useDatos } from '../lib/useDatos';
import { useSesion } from '../contexto/Sesion';
import { useDialogos } from '../contexto/Dialogos';
import { fecha, fechaHora, kg, leerNumero, num, plural } from '../lib/formato';
import type { Pallet, Protocolo } from '../lib/tipos';
import { Cabecera, Cargando, ConUnidad, Dato, ErrorCarga, Miga, Pill, Termino, Vacio } from '../componentes/Comunes';
import { Proceso } from '../componentes/Proceso';
import { Icono } from '../componentes/Icono';
import { useVerProtocolo } from '../componentes/Protocolo';
import { EtiquetaGS1 } from '../componentes/EtiquetaGS1';

interface Pendiente { op_id: number; op_numero: string; lote_id: number; lote_codigo: string; cantidad_kg: number; producto_nombre: string }
interface Recepcion {
  habilitado: boolean; motivo: string | null; comprobante: string;
  op: { id: number; numero: string };
  lote: { id: number; codigo: string; bultos: number; cantidad_kg: number; vencimiento: string };
  producto: { nombre: string; presentacion_kg: number };
  certificado: Protocolo | null;
  pallets_previstos: Pallet[];
}
interface FilaStock { id: number; lote_id: number; lote_codigo: string; producto_nombre: string; sector: string; rack: string; nivel: string; cantidad_kg: number; vencimiento: string }

const POR_PALLET = 25;

export function Deposito() {
  const { op } = useParams();
  const { datos, error, recargar } = useDatos(async () => {
    const pendientes = await api.get<Pendiente[]>('/depositos/pendientes');
    const id = op ? Number(op) : pendientes[0]?.op_id;
    const recepcion = id ? await api.get<Recepcion>(`/depositos/recepcion/${id}`) : null;
    return { pendientes, recepcion };
  }, [op]);
  if (error) return <ErrorCarga error={error} reintentar={recargar} />;
  if (!datos) return <Cargando />;
  const { pendientes, recepcion } = datos;
  return (
    <>
      <Miga texto={`Circuito de producción / Paso 4 · Ingresar a depósito${recepcion ? ` / ${recepcion.op.numero}` : ''}`} />
      <Cabecera titulo="Ingreso a depósito" sub="Controlá lo recibido, armá los pallets y asigná su ubicación.">
        {recepcion && <Pill color={recepcion.habilitado ? 'ambar' : 'rojo'}>{recepcion.habilitado ? 'Recepción pendiente' : 'Recepción no habilitada'}</Pill>}
      </Cabecera>
      <Proceso actual={4} />
      {recepcion ? <FormularioRecepcion key={recepcion.op.id} rec={recepcion} pendientes={pendientes} />
        : <section className="tarjeta"><Vacio titulo="No hay lotes liberados esperando recepción">Cuando Calidad apruebe un lote, aparece acá para su ingreso.<br /><br /><Link className="btn" to="/calidad">Ir a Control de calidad</Link></Vacio></section>}
      <StockPT />
    </>
  );
}

/** Reparte las bolsas en pallets de 25 (igual que el servidor) para mostrar la tabla en pantalla. */
function palletsPrevistos(rec: Recepcion, bultos: number, kgTotal: number): Pallet[] {
  const primero = rec.pallets_previstos[0]?.codigo ?? 'PAL-2026-00001';
  const [pre, anio, num0] = [primero.slice(0, 4), primero.slice(4, 8), Number(primero.slice(9))];
  const cantidad = Math.ceil(bultos / POR_PALLET);
  const lista: Pallet[] = [];
  let asignados = 0;
  for (let i = 0; i < cantidad; i++) {
    const enEste = i < cantidad - 1 ? POR_PALLET : bultos - POR_PALLET * (cantidad - 1);
    const kgEste = i === cantidad - 1 ? Math.round((kgTotal - asignados) * 100) / 100 : Math.round(((kgTotal * enEste) / bultos) * 100) / 100;
    asignados += kgEste;
    lista.push({ codigo: `${pre}${anio}-${String(num0 + i).padStart(5, '0')}`, bultos: enEste, kg: kgEste });
  }
  return lista;
}

function FormularioRecepcion({ rec, pendientes }: { rec: Recepcion; pendientes: Pendiente[] }) {
  const { puede, nombreRol, config } = useSesion();
  const { modal, error } = useDialogos();
  const navegar = useNavigate();
  const verProtocolo = useVerProtocolo();
  const U = config!.ubicaciones;
  const habilitado = puede('DEPOSITO') && rec.habilitado;
  const titulo = puede('DEPOSITO') ? (rec.habilitado ? undefined : rec.motivo ?? undefined) : `Sólo ${nombreRol('DEPOSITO')} puede hacer esto.`;
  const [f, setF] = useState({
    bultos: String(rec.lote.bultos), kg: String(rec.lote.cantidad_kg), danados: '0', merma: '0', just: '',
    deposito: U.depositos[0], sector: U.sectores[0], camara: U.camaras[0], rack: U.racks[0], nivel: U.niveles[0],
  });
  const [ocupado, setOcupado] = useState(false);
  const cambiar = (campo: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [campo]: e.target.value }));

  const bultos = Math.round(leerNumero(f.bultos) || 0);
  const kgOk = leerNumero(f.kg) || 0;
  const danados = Math.round(leerNumero(f.danados) || 0);
  const merma = leerNumero(f.merma) || 0;
  const pallets = bultos > 0 ? palletsPrevistos(rec, bultos, kgOk) : [];
  const diferencia = Math.round((rec.lote.cantidad_kg - kgOk - merma) * 100) / 100;
  const hayDesvio = danados > 0 || merma > 0 || diferencia > 0;
  const llevaCamara = U.sectoresConCamara.includes(f.sector);

  const cambiarLote = () => {
    const cerrar = modal({
      titulo: 'Elegir lote para recibir',
      contenido: pendientes.length ? (
        <table className="tabla clic"><tbody>{pendientes.map((p) => (
          <tr key={p.op_id} onClick={() => { cerrar(); navegar(`/deposito/${p.op_id}`); }}>
            <td><b>{p.lote_codigo}</b><span className="peq">{p.producto_nombre}</span></td><td>{kg(p.cantidad_kg)}</td><td>{p.op_numero}</td></tr>
        ))}</tbody></table>) : <p>No hay otros lotes liberados.</p>,
    });
  };

  const confirmar = async () => {
    setOcupado(true);
    try {
      const r = await api.post<{ comprobante: string; pallets: Pallet[] }>('/depositos/ingreso', {
        op_id: rec.op.id, bultos_recibidos: bultos, kg_conformes: kgOk, bultos_danados: danados, merma_kg: merma, justificacion: f.just.trim(),
        deposito: f.deposito, sector: f.sector, rack: f.rack, nivel: f.nivel, camara: llevaCamara ? f.camara : null,
      });
      modal({
        titulo: 'Ingreso confirmado', ancho: 760,
        contenido: (<>
          <div className="aviso verde"><Icono n="checkCirculo" /><div><b>Comprobante {r.comprobante}</b>La orden {rec.op.numero} quedó Finalizada y {kg(kgOk)} ingresaron al stock vendible en {plural(r.pallets.length, 'pallet')}. Circuito completo.</div></div>
          <p className="sub">Etiquetas <Termino t="gs1">GS1-128</Termino> para pegar en cada pallet:</p>
          <div className="etiquetas">{r.pallets.map((p) => <EtiquetaGS1 key={p.codigo} e={{ ...p, gs1: p.gs1!, producto: rec.producto.nombre, lote: rec.lote.codigo, vencimiento: rec.lote.vencimiento }} />)}</div>
        </>),
        botones: [
          { texto: 'Imprimir etiquetas', alHacer: () => { window.print(); return false; } },
          { texto: 'Volver al panel', alHacer: () => navegar('/panel') },
          { texto: 'Ver trazabilidad', primario: true, alHacer: () => navegar(`/trazabilidad?q=${encodeURIComponent(rec.lote.codigo)}`) },
        ],
      });
    } catch (e) { error(e); setOcupado(false); }
  };

  const { lote, producto, certificado: cert } = rec;
  return (
    <>
      {!rec.habilitado && <div className="aviso rojo"><Icono n="candado" tam={22} /><div><b>No se puede recibir este lote · <Termino t="bloqueo">bloqueo lógico</Termino></b>{rec.motivo}</div></div>}
      <section className="tarjeta">
        <div className="tarjeta-cab"><div><h2>{producto.nombre}</h2><p className="sub">{lote.bultos} bolsas de {producto.presentacion_kg} kg · lote liberado por Calidad</p></div>
          <button className="btn" onClick={cambiarLote}><Icono n="chevAbajo" tam={16} /> Cambiar lote</button></div>
        <div className="rejilla col-3"><Dato titulo="Lote">{lote.codigo}</Dato><Dato titulo="Orden">{rec.op.numero}</Dato><Dato titulo="Elaborado · Vencimiento">{kg(lote.cantidad_kg)} · {fecha(lote.vencimiento)}</Dato></div>
      </section>

      <div className="dos-col">
        <div>
          <section className="tarjeta"><h2>Verificación física</h2>
            <div className="rejilla col-3" style={{ marginTop: 18 }}>
              <div className="campo"><label htmlFor="bultos">Bolsas recibidas *</label><ConUnidad unidad="bolsas"><input className="entrada" id="bultos" inputMode="numeric" disabled={!habilitado} value={f.bultos} onChange={cambiar('bultos')} /></ConUnidad></div>
              <div className="campo"><label htmlFor="kg">Kg conformes *</label><ConUnidad unidad="kg"><input className="entrada" id="kg" inputMode="decimal" disabled={!habilitado} value={f.kg} onChange={cambiar('kg')} /></ConUnidad></div>
              <div className="campo"><label htmlFor="pallets"><Termino t="pallet">Pallets</Termino></label><ConUnidad unidad="pallets"><input className="entrada" id="pallets" readOnly value={pallets.length} /></ConUnidad></div>
            </div>
            <details className="plegable"><summary>Ver detalle de pallets</summary>
              <table className="tabla"><thead><tr><th>Pallet</th><th>Bolsas</th><th>Peso neto</th></tr></thead>
                <tbody>{pallets.length ? pallets.map((p) => <tr key={p.codigo}><td>{p.codigo}</td><td>{p.bultos} × {producto.presentacion_kg} kg</td><td>{kg(p.kg)}</td></tr>)
                  : <tr><td colSpan={3} style={{ color: 'var(--texto-suave)' }}>Ingresá los bultos recibidos.</td></tr>}</tbody></table>
            </details>
            <div className="rejilla col-2" style={{ marginTop: 20 }}>
              <div className="campo"><label htmlFor="danados">Bolsas dañadas</label><ConUnidad unidad="bolsas"><input className="entrada" id="danados" inputMode="numeric" disabled={!habilitado} value={f.danados} onChange={cambiar('danados')} /></ConUnidad></div>
              <div className="campo"><label htmlFor="merma">Merma secundaria</label><ConUnidad unidad="kg"><input className="entrada" id="merma" inputMode="decimal" disabled={!habilitado} value={f.merma} onChange={cambiar('merma')} /></ConUnidad></div>
            </div>
            {hayDesvio && (
              <div className="campo" style={{ marginTop: 18 }}><label htmlFor="just">Justificación *</label>
                <input className="entrada" id="just" disabled={!habilitado} placeholder="Explicá el daño, la merma o la diferencia de kilos" value={f.just} onChange={cambiar('just')} />
                <span className="ayuda" style={{ color: f.just.trim() ? undefined : 'var(--rojo)' }}>Obligatoria porque hay daño, merma o diferencia de kilos.</span></div>
            )}
          </section>

          <section className="tarjeta"><h2>Ubicación</h2><p className="sub">Se aplica {pallets.length > 1 ? 'a todos los pallets' : 'al pallet'}.</p>
            <div className="rejilla col-3" style={{ marginTop: 18 }}>
              <div className="campo"><label htmlFor="deposito">Depósito *</label><select className="entrada" id="deposito" disabled={!habilitado} value={f.deposito} onChange={cambiar('deposito')}>{U.depositos.map((d) => <option key={d}>{d}</option>)}</select></div>
              <div className="campo"><label htmlFor="sector">Sector *</label><select className="entrada" id="sector" disabled={!habilitado} value={f.sector} onChange={cambiar('sector')}>{U.sectores.map((d) => <option key={d}>{d}</option>)}</select></div>
              {llevaCamara && <div className="campo"><label htmlFor="camara">Cámara *</label><select className="entrada" id="camara" disabled={!habilitado} value={f.camara} onChange={cambiar('camara')}>{U.camaras.map((d) => <option key={d}>{d}</option>)}</select></div>}
            </div>
            <div className="rejilla col-2" style={{ marginTop: 18 }}>
              <div className="campo"><label htmlFor="rack">Rack *</label><select className="entrada" id="rack" disabled={!habilitado} value={f.rack} onChange={cambiar('rack')}>{U.racks.map((d) => <option key={d}>{d}</option>)}</select></div>
              <div className="campo"><label htmlFor="nivel">Nivel *</label><select className="entrada" id="nivel" disabled={!habilitado} value={f.nivel} onChange={cambiar('nivel')}>{U.niveles.map((d) => <option key={d}>{d}</option>)}</select></div>
            </div>
          </section>
        </div>

        <div>
          <section className="tarjeta"><h2>Certificado de calidad</h2>
            {cert ? (<>
              <div className="check" style={{ margin: '14px 0' }}><Icono n="escudo" /><b style={{ color: 'var(--verde)' }}>Liberación verificada</b></div>
              <div style={{ marginBottom: 12 }}><Dato titulo="Protocolo">{cert.protocolo}</Dato></div>
              <div style={{ marginBottom: 16 }}><Dato titulo="Firmado por">{cert.analista} · {fechaHora(cert.fecha)}</Dato></div>
              <button className="btn" onClick={() => verProtocolo(lote.id)}><Icono n="documento" /> Ver protocolo</button>
            </>) : <p className="sub">Sin protocolo firmado.</p>}
          </section>
          <section className="tarjeta"><h2>Ingreso al stock</h2>
            <div className="atencion-caja" style={{ margin: '16px 0 0' }}>
              <small style={{ color: 'var(--ambar-oscuro)' }}>Stock vendible a incrementar</small>
              <div style={{ fontSize: 34, fontWeight: 600, color: 'var(--ambar-oscuro)' }}>+{num(kgOk, Number.isInteger(kgOk) ? 0 : 1)} kg</div>
              <small style={{ color: 'var(--ambar-oscuro)' }}>{bultos} bolsas · {plural(pallets.length, 'pallet')} · {hayDesvio ? `Diferencia ${kg(Math.max(0, diferencia))}` : 'Sin diferencias'}</small>
            </div>
          </section>
        </div>
      </div>

      <div className="confirmacion"><Icono n="caja" tam={22} /><div><b>Al confirmar, la orden se cierra</b>Se suman {num(kgOk)} kg al stock vendible en {f.sector.split(' ·')[0]} / {f.rack} / {f.nivel}, se emite el comprobante {rec.comprobante} y las etiquetas GS1-128 de los pallets.</div></div>
      <div className="barra-acciones"><span className="nota">{hayDesvio ? 'Hay diferencias: escribí la justificación para confirmar.' : 'Todo conforme.'}</span>
        <div className="botones"><button className="btn primario" disabled={!habilitado || ocupado} title={titulo} onClick={confirmar}><Icono n="check" /> Confirmar ingreso y cerrar OP</button></div>
      </div>
    </>
  );
}

/* ---------- Stock vendible y despacho de ejemplo ---------- */
function StockPT() {
  const { puede, nombreRol } = useSesion();
  const { modal, aviso, error } = useDialogos();
  const { datos, recargar } = useDatos(() => api.get<FilaStock[]>('/stock-pt'));
  const [cliente, setCliente] = useState('Distribuidora Mayorista del Litoral S.R.L.');
  if (!datos) return null;
  const stock = datos.slice(-6).reverse(); // los 6 ingresos más recientes

  const despachar = (s: FilaStock) => {
    if (!puede('DEPOSITO')) return aviso(`Sólo ${nombreRol('DEPOSITO')} puede registrar despachos.`, 'error');
    let cantidad = String(Math.min(100, s.cantidad_kg));
    let nombre = cliente;
    modal({
      titulo: `Despacho de ejemplo · ${s.lote_codigo}`,
      contenido: (
        <div className="rejilla col-2">
          <div className="campo"><label htmlFor="d-cliente">Cliente</label><input className="entrada" id="d-cliente" defaultValue={nombre} onChange={(e) => { nombre = e.target.value; }} /></div>
          <div className="campo"><label htmlFor="d-kg">Cantidad (máx. {num(s.cantidad_kg)} kg)</label><ConUnidad unidad="kg"><input className="entrada" id="d-kg" defaultValue={cantidad} onChange={(e) => { cantidad = e.target.value; }} /></ConUnidad></div>
        </div>),
      botones: [{ texto: 'Cancelar' }, {
        texto: 'Despachar', primario: true, alHacer: async () => {
          try { await api.post('/despachos', { lote_id: s.lote_id, cliente: nombre.trim(), cantidad_kg: leerNumero(cantidad) }); setCliente(nombre); aviso('Despacho registrado', 'ok'); recargar(); } catch (e) { error(e); return false; }
        },
      }],
    });
  };

  return (
    <section className="tarjeta" style={{ marginTop: 22 }}>
      <div className="tarjeta-cab"><div><h2>Stock de producto terminado</h2><p className="sub">Últimos ingresos. Sólo los lotes liberados llegan acá.</p></div></div>
      {stock.length ? (
        <table className="tabla"><thead><tr><th>Lote</th><th>Producto</th><th>Ubicación</th><th>Stock</th><th>Vence</th><th></th></tr></thead>
          <tbody>{stock.map((s) => (
            <tr key={s.id}><td><b>{s.lote_codigo}</b></td><td>{s.producto_nombre}</td><td>{s.sector.split(' ·')[0]} / {s.rack} / {s.nivel}</td>
              <td className="num">{kg(s.cantidad_kg)}</td><td>{fecha(s.vencimiento)}</td>
              <td><button className="enlace" onClick={() => despachar(s)}>Registrar despacho →</button></td></tr>
          ))}</tbody></table>
      ) : <Vacio titulo="Todavía no hay stock vendible" />}
    </section>
  );
}
