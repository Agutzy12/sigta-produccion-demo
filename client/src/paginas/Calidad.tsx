/** Paso 3 · Controlar calidad: determinaciones, contraste con la especificación y dictamen firmado (CU-P03). */
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useDatos } from '../lib/useDatos';
import { useSesion } from '../contexto/Sesion';
import { useDialogos } from '../contexto/Dialogos';
import { fecha, fechaHora, hora, hoyTexto, kg, leerNumero, num, plural } from '../lib/formato';
import type { Dictamen, Especificacion, LoteCalidad, Protocolo, Resultados } from '../lib/tipos';
import { Cabecera, Cargando, ConUnidad, Dato, ErrorCarga, Miga, Pill, Termino, Vacio } from '../componentes/Comunes';
import { Proceso } from '../componentes/Proceso';
import { Icono } from '../componentes/Icono';
import { Contraste, useVerProtocolo } from '../componentes/Protocolo';

type Valores = { humedad: string; ph: string; ufc: string; aroma: string; color: string; sabor: string };

/** Evalúa cada determinación contra la especificación. null = todavía sin cargar. */
function evaluar(e: Especificacion, v: Valores): Resultados {
  const h = leerNumero(v.humedad), ph = leerNumero(v.ph), ufc = leerNumero(v.ufc);
  return {
    humedad: Number.isNaN(h) ? null : h <= e.humedad_max,
    ph: Number.isNaN(ph) ? null : ph >= e.ph_min && ph <= e.ph_max,
    aroma: v.aroma ? v.aroma === e.aroma.esperado : null,
    color: v.color ? v.color === e.color.esperado : null,
    sabor: v.sabor ? v.sabor === e.sabor.esperado : null,
    ufc: Number.isNaN(ufc) ? null : ufc <= e.ufc_max,
  };
}

export function Calidad() {
  const { id } = useParams();
  const navegar = useNavigate();
  const { datos, error, recargar } = useDatos(() => Promise.all([
    api.get<LoteCalidad[]>('/calidad/pendientes'),
    api.get<(Protocolo & { lote_codigo: string; producto_nombre: string })[]>('/calidad/historial'),
  ]));
  const verProtocolo = useVerProtocolo();
  if (error) return <ErrorCarga error={error} reintentar={recargar} />;
  if (!datos) return <Cargando />;
  const [pendientes, historial] = datos;
  const lote = pendientes.find((l) => l.id === Number(id)) ?? pendientes[0] ?? null;
  const kgTotal = pendientes.reduce((a, l) => a + l.cantidad_kg, 0);

  return (
    <>
      <Miga texto="Circuito de producción / Paso 3 · Controlar calidad" />
      <Cabecera titulo="Control de calidad" sub="Cargá los resultados del lote y firmá el dictamen." />
      <Proceso actual={3} />
      <div className="calidad-grid">
        <div>
          <section className="tarjeta">
            <h2>En <Termino t="cuarentena">cuarentena</Termino></h2><p className="sub">{plural(pendientes.length, 'lote')} · {kg(kgTotal)}</p>
            <div style={{ height: 14 }} />
            {pendientes.length ? pendientes.map((l) => (
              <button key={l.id} className={`lote-item ${lote?.id === l.id ? 'sel' : ''}`} style={{ display: 'block', width: '100%', textAlign: 'left' }}
                onClick={() => navegar(`/calidad/${l.id}`, { replace: true })}>
                <span className="cod">{l.codigo}</span><b>{l.producto_nombre}</b>
                <small>{kg(l.cantidad_kg)} · {l.creado_en.slice(0, 10) === hoyTexto() ? 'Hoy' : fecha(l.creado_en).slice(0, 5)}, {hora(l.creado_en)}</small>
                <small className="est">{l.borrador ? 'Análisis en curso' : 'Análisis pendiente'}</small>
              </button>
            )) : <Vacio titulo="Sin lotes">No hay lotes en cuarentena.</Vacio>}
          </section>
        </div>
        <div>{lote ? <FormularioLote key={lote.id} lote={lote} alGuardar={recargar} />
          : <section className="tarjeta"><Vacio titulo="No hay lotes en cuarentena">Cuando Producción finalice una elaboración, el lote aparece acá para su análisis.</Vacio></section>}</div>
      </div>
      {historial.length > 0 && (
        <section className="tarjeta" style={{ marginTop: 6 }}><h2>Últimos dictámenes</h2>
          <table className="tabla" style={{ marginTop: 14 }}><thead><tr><th>Protocolo</th><th>Producto</th><th>Dictamen</th><th></th></tr></thead>
            <tbody>{historial.slice(0, 5).map((h) => (
              <tr key={h.id}><td><b>{h.protocolo}</b><span className="peq">{h.lote_codigo}</span></td><td>{h.producto_nombre}<span className="peq">{h.analista} · {fechaHora(h.fecha)}</span></td>
                <td>{h.dictamen === 'APROBAR_LIBERAR' ? <Pill color="verde">Aprobado</Pill> : <Pill color="rojo">Rechazado</Pill>}</td>
                <td><button className="enlace" onClick={() => verProtocolo(h.lote_id)}>Ver →</button></td></tr>
            ))}</tbody></table>
        </section>
      )}
    </>
  );
}

function FormularioLote({ lote, alGuardar }: { lote: LoteCalidad; alGuardar: () => void }) {
  const { puede, nombreRol, usuario } = useSesion();
  const { aviso, error, confirmar, modal } = useDialogos();
  const navegar = useNavigate();
  const e = lote.especificacion;
  const b = lote.borrador ?? {};
  const habilitado = puede('CALIDAD');
  const titulo = habilitado ? undefined : `Sólo ${nombreRol('CALIDAD')} puede hacer esto.`;
  const [v, setV] = useState<Valores>({
    humedad: String(b.humedad ?? ''), ph: String(b.ph ?? ''), ufc: String(b.ufc ?? ''),
    aroma: b.aroma || e.aroma.esperado, color: b.color || e.color.esperado, sabor: b.sabor || e.sabor.esperado,
  });
  const [dictamen, setDictamen] = useState<Dictamen>((b.dictamen as Dictamen) || 'APROBAR_LIBERAR');
  const [obs, setObs] = useState(String(b.observaciones ?? ''));
  const [ocupado, setOcupado] = useState(false);
  const r = evaluar(e, v);
  const conformes = Object.values(r).filter((x) => x === true).length;
  const fuera = Object.values(r).filter((x) => x === false).length;
  const cambiar = (campo: keyof Valores) => (ev: { target: { value: string } }) => setV((x) => ({ ...x, [campo]: ev.target.value }));

  const cuerpo = () => ({
    humedad: Number.isNaN(leerNumero(v.humedad)) ? '' : leerNumero(v.humedad), ph: Number.isNaN(leerNumero(v.ph)) ? '' : leerNumero(v.ph),
    ufc: Number.isNaN(leerNumero(v.ufc)) ? '' : leerNumero(v.ufc), aroma: v.aroma, color: v.color, sabor: v.sabor, dictamen, observaciones: obs.trim(),
  });
  const cargarEjemplo = () => {
    // valores dentro de la especificación de ESTE producto (cada línea tiene la suya)
    const humedad = (Math.round(e.humedad_max * 0.75 * 10) / 10).toString().replace('.', ',');
    const ph = (Math.round(((e.ph_min + e.ph_max) / 2) * 10) / 10).toString().replace('.', ',');
    setV({ humedad, ph, ufc: '320', aroma: e.aroma.esperado, color: e.color.esperado, sabor: e.sabor.esperado });
    if (!obs.trim()) setObs('Resultados dentro de la especificación de ejemplo. Evaluación sensorial conforme. Sin desvíos observados.');
  };
  const guardarBorrador = async () => {
    try { await api.put(`/calidad/${lote.id}/borrador`, cuerpo()); aviso('Borrador guardado. El lote sigue en cuarentena.', 'ok'); alGuardar(); } catch (err) { error(err); }
  };
  const firmar = async () => {
    if (Object.values(r).some((x) => x == null)) return aviso('Completá todas las determinaciones antes de firmar.', 'error');
    if (dictamen === 'APROBAR_LIBERAR' && fuera > 0) return aviso('Hay determinaciones fuera de especificación: no se puede aprobar el lote. Corregí los datos o rechazalo.', 'error');
    if (dictamen === 'RECHAZAR_BLOQUEAR' && !obs.trim()) return aviso('Para rechazar el lote escribí el motivo en las observaciones.', 'error');
    const aprobar = dictamen === 'APROBAR_LIBERAR';
    if (!(await confirmar('Firmar protocolo', aprobar ? 'El lote quedará aprobado y liberado. La firma no se puede modificar después.'
      : 'El lote quedará rechazado y bloqueado, y la orden pasará a Rechazada (Scrap). La firma no se puede modificar después.', 'Firmar', !aprobar))) return;
    setOcupado(true);
    try {
      const res = await api.post<{ protocolo: string }>(`/calidad/${lote.id}`, cuerpo());
      modal({
        titulo: aprobar ? 'Lote aprobado y liberado' : 'Lote rechazado y bloqueado',
        contenido: <div className={`aviso ${aprobar ? 'verde' : 'rojo'}`} style={{ margin: 0 }}><Icono n={aprobar ? 'checkCirculo' : 'candado'} />
          <div><b>Protocolo {res.protocolo} firmado</b>{aprobar ? 'Siguiente paso: Depósito ya puede recibir el lote. La orden se cierra recién al confirmar el ingreso.' : 'El lote quedó bloqueado: no puede ingresar a depósito ni despacharse. Se alertó a jefatura de planta.'}</div></div>,
        botones: aprobar
          ? [{ texto: 'Seguir en Calidad', alHacer: () => alGuardar() }, { texto: 'Ir a Ingreso a depósito', primario: true, alHacer: () => navegar(`/deposito/${lote.op_id}`) }]
          : [{ texto: 'Seguir en Calidad', alHacer: () => alGuardar() }, { texto: 'Ver trazabilidad', primario: true, alHacer: () => navegar(`/trazabilidad?q=${encodeURIComponent(lote.codigo)}`) }],
      });
    } catch (err) { error(err); setOcupado(false); }
  };

  const Opciones = ({ lista }: { lista: string[] }) => <>{lista.map((o) => <option key={o}>{o}</option>)}</>;
  return (
    <>
      <section className="tarjeta">
        <div className="tarjeta-cab"><div><h2>{lote.producto_nombre}</h2><p className="sub">Protocolo <Termino t="rbpm">R.BPM.01V01</Termino> · Pendiente de firma</p></div><Pill color="ambar">Cuarentena</Pill></div>
        <div className="rejilla col-3"><Dato titulo="Lote">{lote.codigo}</Dato><Dato titulo="Orden">{lote.op_numero}</Dato><Dato titulo="Cantidad · Vencimiento">{kg(lote.cantidad_kg)} · {fecha(lote.vencimiento)}</Dato></div>
      </section>

      <section className="tarjeta">
        <div className="tarjeta-cab"><div><h2>Determinaciones</h2><p className="sub">El sistema compara cada resultado con la especificación del producto (valores de ejemplo, no son límites normativos).</p></div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Pill color={fuera ? 'rojo' : conformes === 6 ? 'verde' : 'gris'}>{conformes}/6 conformes</Pill>
            <button className="btn chico" disabled={!habilitado} title="Completa resultados dentro de especificación para agilizar la demo" onClick={cargarEjemplo}>Cargar ejemplo</button>
          </div></div>
        <table className="tabla">
          <thead><tr><th>Determinación</th><th style={{ width: 240 }}>Resultado</th><th>Debe ser</th><th></th></tr></thead>
          <tbody>
            <tr><td><b>Humedad</b></td><td><ConUnidad unidad="%"><input className="entrada" id="humedad" inputMode="decimal" disabled={!habilitado} value={v.humedad} onChange={cambiar('humedad')} /></ConUnidad></td><td>≤ {num(e.humedad_max, 1)} %</td><td><Contraste ok={r.humedad} /></td></tr>
            <tr><td><b>pH</b></td><td><ConUnidad unidad="pH"><input className="entrada" id="ph" inputMode="decimal" disabled={!habilitado} value={v.ph} onChange={cambiar('ph')} /></ConUnidad></td><td>{num(e.ph_min, 1)} a {num(e.ph_max, 1)}</td><td><Contraste ok={r.ph} /></td></tr>
            <tr><td><b>Aroma</b></td><td><select className="entrada" id="aroma" disabled={!habilitado} value={v.aroma} onChange={cambiar('aroma')}><Opciones lista={e.aroma.opciones} /></select></td><td>{e.aroma.texto}</td><td><Contraste ok={r.aroma} /></td></tr>
            <tr><td><b>Color</b></td><td><select className="entrada" id="color" disabled={!habilitado} value={v.color} onChange={cambiar('color')}><Opciones lista={e.color.opciones} /></select></td><td>{e.color.texto}</td><td><Contraste ok={r.color} /></td></tr>
            <tr><td><b>Sabor</b></td><td><select className="entrada" id="sabor" disabled={!habilitado} value={v.sabor} onChange={cambiar('sabor')}><Opciones lista={e.sabor.opciones} /></select></td><td>{e.sabor.texto}</td><td><Contraste ok={r.sabor} /></td></tr>
            <tr><td><b>Microbiología</b></td><td><ConUnidad unidad="UFC/g"><input className="entrada" id="ufc" inputMode="numeric" disabled={!habilitado} value={v.ufc} onChange={cambiar('ufc')} /></ConUnidad></td><td>≤ {num(e.ufc_max)} <Termino t="ufc">UFC/g</Termino></td><td><Contraste ok={r.ufc} /></td></tr>
          </tbody>
        </table>
      </section>

      <section className="tarjeta"><h2><Termino t="dictamen">Dictamen</Termino></h2>
        <div className="opciones-dictamen">
          {([['APROBAR_LIBERAR', 'Aprobar y liberar', 'Depósito puede recibir el lote.'], ['RECHAZAR_BLOQUEAR', 'Rechazar y bloquear', 'La orden pasa a Rechazada (Scrap).']] as const).map(([valor, t, d]) => (
            <label key={valor} className={`opcion-dictamen ${dictamen === valor ? 'sel' : ''}`}>
              <b><input type="radio" name="dictamen" value={valor} disabled={!habilitado} checked={dictamen === valor} onChange={() => setDictamen(valor)} /> {t}</b><span>{d}</span>
            </label>
          ))}
        </div>
        {dictamen === 'APROBAR_LIBERAR' && fuera > 0 && <div className="aviso rojo"><Icono n="info" /><div><b>No se puede aprobar</b>Hay {plural(fuera, 'determinación', 'determinaciones')} fuera de especificación. Corresponde rechazar y bloquear el lote.</div></div>}
        <div className="campo"><label htmlFor="obs">Observaciones</label>
          <textarea className="entrada" id="obs" rows={3} disabled={!habilitado} placeholder="Obligatorias si rechazás el lote." value={obs} onChange={(ev) => setObs(ev.target.value)} /></div>
        <p className="sub" style={{ marginTop: 14 }}><Icono n="firma" tam={16} /> Firma: {habilitado ? usuario!.nombre : nombreRol('CALIDAD')} · Una vez firmado, el protocolo no se puede modificar (lo protege la base de datos).</p>
      </section>

      <div className="barra-acciones"><span className="nota">El lote sigue en cuarentena hasta que firmes.</span>
        <div className="botones">
          <button className="btn" disabled={!habilitado} title={titulo} onClick={guardarBorrador}><Icono n="guardar" /> Guardar borrador</button>
          <button className="btn primario" disabled={!habilitado || ocupado} title={titulo} onClick={firmar}><Icono n="firma" /> Firmar protocolo</button>
        </div>
      </div>
    </>
  );
}
