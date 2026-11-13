/** Paso 1 · Planificar orden de producción (CU-P01). También completa un borrador (/ordenes/:id). */
import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useDatos } from '../lib/useDatos';
import { useSesion } from '../contexto/Sesion';
import { useDialogos } from '../contexto/Dialogos';
import { hoyTexto, leerNumero, num, pesoTexto } from '../lib/formato';
import type { Linea, Orden, Producto, Verificacion } from '../lib/tipos';
import { Cabecera, Cargando, ConUnidad, Dato, ErrorCarga, Miga, Pill, Termino } from '../componentes/Comunes';
import { Proceso } from '../componentes/Proceso';
import { Icono } from '../componentes/Icono';

const HORAS = Array.from({ length: 33 }, (_, i) => `${String(6 + Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`);
/** Cantidad sugerida al elegir un producto (lo habitual de cada línea, en kg de producto terminado). */
const CANTIDAD_SUGERIDA: Record<string, number> = { DESHIDRATADOS: 200, FRUTOS_SECOS: 240, PRE_ELABORADOS: 400, PRE_MEZCLAS: 600, PASTAS_SECAS: 1000 };
/** Agrupa los productos por línea comercial, en el orden del catálogo. */
const porLinea = (productos: Producto[]) => productos.reduce<[string, Producto[]][]>((grupos, p) => {
  const nombre = p.categoria_nombre ?? 'Otros';
  const grupo = grupos.find(([n]) => n === nombre);
  if (grupo) grupo[1].push(p); else grupos.push([nombre, [p]]);
  return grupos;
}, []);
const horaSugerida = () => {
  const d = new Date();
  const ahora = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return HORAS.find((h) => h > ahora) || '08:00';
};

export function NuevaOrden() {
  const { id } = useParams();
  const { datos, error, recargar } = useDatos(async () => {
    const [productos, lineas] = await Promise.all([api.get<Producto[]>('/productos'), api.get<Linea[]>('/lineas')]);
    const borrador = id ? await api.get<Orden>(`/ordenes/${id}`) : null;
    const numero = borrador ? borrador.numero : (await api.get<{ numero: string }>('/ordenes/proximo-numero')).numero;
    return { productos, lineas, borrador, numero };
  }, [id]);
  if (error) return <ErrorCarga error={error} reintentar={recargar} />;
  if (!datos) return <Cargando />;
  if (datos.borrador && datos.borrador.estado !== 'CREADA') return <Navigate to={`/ejecucion/${datos.borrador.id}`} replace />;
  return <Formulario {...datos} />;
}

function Formulario({ productos, lineas, borrador, numero }: { productos: Producto[]; lineas: Linea[]; borrador: Orden | null; numero: string }) {
  const { puede, nombreRol } = useSesion();
  const { aviso, error } = useDialogos();
  const navegar = useNavigate();
  const habilitado = puede('PRODUCCION');
  const [parametros] = useSearchParams();
  const inicial = productos.find((p) => p.id === Number(parametros.get('producto'))) ?? productos.find((p) => p.codigo === 'COD500') ?? productos[0];
  const [form, setForm] = useState({
    producto_id: borrador?.producto_id ?? inicial?.id,
    linea_id: borrador?.linea_id ?? inicial?.linea_id,
    cantidad: String(borrador?.cantidad_kg ?? CANTIDAD_SUGERIDA[inicial?.categoria_codigo ?? ''] ?? 1000),
    fecha: borrador?.fecha_proyectada ?? hoyTexto(),
    hora: borrador?.hora_prevista ?? horaSugerida(),
    observaciones: borrador?.observaciones ?? '',
  });
  const [verificacion, setVerificacion] = useState<Verificacion | null>(null);
  const [guardando, setGuardando] = useState(false);
  const producto = productos.find((p) => p.id === Number(form.producto_id))!;
  const kgPedidos = leerNumero(form.cantidad);
  const titulo = (r: string) => (habilitado ? undefined : `Sólo ${nombreRol('PRODUCCION')} puede ${r}.`);

  // Cada vez que cambia el producto o la cantidad, se recalculan los insumos (con una pequeña espera mientras se escribe)
  useEffect(() => {
    if (!(kgPedidos > 0)) { setVerificacion(null); return; }
    const espera = setTimeout(() => {
      api.post<Verificacion>('/ordenes/verificar', { producto_id: form.producto_id, cantidad_kg: kgPedidos }).then(setVerificacion).catch(error);
    }, 180);
    return () => clearTimeout(espera);
  }, [form.producto_id, kgPedidos, error]);

  const cambiar = (campo: keyof typeof form, valor: string | number) => setForm((f) => ({ ...f, [campo]: valor }));
  const elegirProducto = (idProducto: number) => {
    const p = productos.find((x) => x.id === idProducto)!;
    // se sugiere la línea de elaboración del producto y, en una orden nueva, la cantidad habitual de su línea
    setForm((f) => ({ ...f, producto_id: idProducto, linea_id: p.linea_id, cantidad: borrador ? f.cantidad : String(CANTIDAD_SUGERIDA[p.categoria_codigo ?? ''] ?? f.cantidad) }));
  };

  const guardar = async (accion: 'PLANIFICAR' | 'BORRADOR') => {
    const cuerpo = {
      producto_id: Number(form.producto_id), linea_id: Number(form.linea_id), cantidad_kg: kgPedidos,
      fecha_proyectada: form.fecha, hora_prevista: form.hora, observaciones: form.observaciones.trim(), accion,
    };
    setGuardando(true);
    try {
      const orden = borrador ? await api.put<Orden>(`/ordenes/${borrador.id}`, cuerpo) : await api.post<Orden>('/ordenes', cuerpo);
      if (accion === 'PLANIFICAR') {
        aviso(`${orden.numero} planificada. Siguiente paso: elaborar.`, 'ok');
        navegar(`/ejecucion/${orden.id}`);
      } else {
        aviso(verificacion?.hayFaltantes ? `${orden.numero} guardada como borrador. Se avisó a Compras por los faltantes.` : `${orden.numero} guardada como borrador`, 'ok');
        navegar('/panel');
      }
    } catch (e) { error(e); setGuardando(false); }
  };

  const unidades = kgPedidos > 0 ? Math.round(kgPedidos / producto.presentacion_kg) : 0;
  const pallets = unidades ? Math.ceil(unidades / producto.unidades_por_pallet) : 0;

  return (
    <>
      <Miga texto={`Circuito de producción / Paso 1 · Planificar orden${borrador ? ` / ${borrador.numero}` : ''}`} />
      <Cabecera titulo={borrador ? 'Completar orden de producción' : 'Nueva orden de producción'} sub="Elegí qué fabricar y verificá que haya insumos." />
      <Proceso actual={1} />

      <section className="tarjeta">
        <div className="tarjeta-cab"><div><h2>Datos de la orden</h2></div><Pill color="ambar">{numero}</Pill></div>
        <div className="rejilla col-3">
          <div className="campo"><label htmlFor="producto">Producto terminado *</label>
            <select className="entrada" id="producto" disabled={!habilitado} value={form.producto_id} onChange={(e) => elegirProducto(Number(e.target.value))}>
              {porLinea(productos).map(([linea, lista]) => (
                <optgroup key={linea} label={linea}>{lista.map((p) => <option key={p.id} value={p.id}>{p.nombre} · {p.presentacion} ({p.codigo})</option>)}</optgroup>
              ))}
            </select></div>
          <div className="campo"><label htmlFor="receta"><Termino t="receta">Receta</Termino> vigente</label>
            <ConUnidad unidad={<Icono n="candado" tam={16} />}><input className="entrada" id="receta" readOnly value={`${producto.receta_codigo} · Versión ${producto.receta_version}`} /></ConUnidad></div>
          <div className="campo"><label htmlFor="linea">Línea *</label>
            <select className="entrada" id="linea" disabled={!habilitado} value={form.linea_id ?? ''} onChange={(e) => cambiar('linea_id', Number(e.target.value))}>
              {lineas.map((l) => <option key={l.id} value={l.id}>{l.nombre}</option>)}
            </select></div>
        </div>
        <div className="rejilla col-3" style={{ marginTop: 20 }}>
          <div className="campo"><label htmlFor="cantidad">Cantidad *</label>
            <ConUnidad unidad="kg"><input className="entrada" id="cantidad" inputMode="decimal" disabled={!habilitado} value={form.cantidad} onChange={(e) => cambiar('cantidad', e.target.value)} /></ConUnidad></div>
          <div className="campo"><label htmlFor="fecha">Fecha *</label>
            <input type="date" className="entrada" id="fecha" min={hoyTexto()} disabled={!habilitado} value={form.fecha} onChange={(e) => cambiar('fecha', e.target.value)} /></div>
          <div className="campo"><label htmlFor="hora">Hora de inicio *</label>
            <select className="entrada" id="hora" disabled={!habilitado} value={form.hora} onChange={(e) => cambiar('hora', e.target.value)}>
              {HORAS.map((h) => <option key={h}>{h}</option>)}
            </select></div>
        </div>
        <div className="campo" style={{ marginTop: 20 }}><label htmlFor="obs">Observaciones</label>
          <input className="entrada" id="obs" maxLength={200} placeholder="Opcional" disabled={!habilitado} value={form.observaciones} onChange={(e) => cambiar('observaciones', e.target.value)} /></div>
      </section>

      <section className="tarjeta" data-testid="ficha-producto">
        <div className="tarjeta-cab">
          <div><h2>{producto.nombre} · {producto.presentacion}</h2>
            <p className="sub">{producto.categoria_nombre} · {producto.familia} · Vida útil {producto.vida_util_meses} meses · {producto.unidades_por_pallet} unidades por pallet{producto.unidades_por_caja ? ` · cajas de ${producto.unidades_por_caja}` : ''}</p></div>
          {producto.url_web && <a className="btn chico" href={producto.url_web} target="_blank" rel="noreferrer">Ver en la web de Agrifood ↗</a>}
        </div>
        <details className="plegable" style={{ marginTop: 0 }}><summary>Ver ficha técnica (ingredientes, alérgenos, almacenamiento y embalaje)</summary>
          <div className="rejilla col-2" style={{ marginTop: 10, gap: 14 }}>
            <Dato titulo="Ingredientes">{producto.ingredientes ?? '—'}</Dato>
            <Dato titulo="Alérgenos">{producto.alergenos ?? 'No declara'}</Dato>
            <Dato titulo="Almacenamiento">{producto.almacenamiento ?? '—'}</Dato>
            <Dato titulo="Embalaje">{producto.embalaje ?? '—'}</Dato>
          </div>
        </details>
      </section>

      <section className="tarjeta">
        <div className="tarjeta-cab">
          <div><h2>Insumos</h2>
            <p className="sub">{kgPedidos > 0 ? `Receta para ${num(kgPedidos)} kg · se obtienen unas ${num(unidades)} unidades de ${pesoTexto(producto.presentacion_kg)} (${pallets} ${pallets === 1 ? 'pallet' : 'pallets'})` : 'Ingresá una cantidad para calcular.'}</p></div>
          {verificacion && kgPedidos > 0 && <span><span className="fraccion" style={{ fontSize: 30 }}>{verificacion.criticosOk}/{verificacion.criticosTotal}</span> <span style={{ color: 'var(--texto-suave)' }}>disponibles</span></span>}
        </div>
        {!(kgPedidos > 0) ? null : !verificacion ? <Cargando /> : (<>
          <div className={`aviso ${verificacion.planificable ? 'verde' : 'rojo'}`} style={{ marginBottom: 0 }}>
            <Icono n={verificacion.planificable ? 'checkCirculo' : 'info'} />
            <div><b>{verificacion.planificable ? 'Sin faltantes' : 'Hay faltantes críticos'}</b>
              {verificacion.planificable ? 'Hay stock de todos los insumos críticos: podés planificar la orden.' : 'No se puede planificar. Guardá un borrador: se avisa a Compras automáticamente.'}</div>
          </div>
          {verificacion.items.some((i) => !i.ok) && (
            <table className="tabla" style={{ marginTop: 16 }}>
              <thead><tr><th>Insumo con faltante</th><th>Requerido</th><th>Disponible</th><th>Falta</th></tr></thead>
              <tbody>{verificacion.items.filter((i) => !i.ok).map((i) => (
                <tr key={i.insumo_id}><td><b>{i.nombre}</b><span className="peq">{i.critico ? 'Crítico: bloquea la planificación' : 'No crítico'}</span></td>
                  <td className="num">{num(i.requerido)} {i.unidad}</td><td className="num">{num(Math.max(0, i.disponible))} {i.unidad}</td>
                  <td className="num"><Pill color="rojo">{num(i.faltante)} {i.unidad}</Pill></td></tr>))}</tbody>
            </table>
          )}
          <details className="plegable"><summary>Ver los {verificacion.items.length} insumos de la receta ({num(verificacion.kgMateriaPrima)} kg de materias primas)</summary>
            <table className="tabla">
              <thead><tr><th>Materia prima / empaque</th><th>Requerido</th><th>Disponible</th><th></th></tr></thead>
              <tbody>{verificacion.items.map((i) => (
                <tr key={i.insumo_id}>
                  <td><b>{i.nombre}</b><span className="peq">{i.codigo} · {i.tipo === 'MP' ? 'Materia prima' : 'Empaque'}</span></td>
                  <td className="num">{num(i.requerido)} {i.unidad}</td><td className="num">{num(Math.max(0, i.disponible))} {i.unidad}</td>
                  <td>{i.ok ? <Pill color="verde">Suficiente</Pill> : <Pill color="rojo">Faltante</Pill>}</td>
                </tr>))}</tbody>
            </table>
          </details>
        </>)}
      </section>

      <div className="barra-acciones"><span className="nota">Planificar reserva los insumos pero no descuenta stock.</span>
        <div className="botones">
          <Link className="btn" to="/panel">Cancelar</Link>
          <button className="btn" disabled={!habilitado || guardando || !(kgPedidos > 0)} title={titulo('guardar órdenes')} onClick={() => guardar('BORRADOR')}><Icono n="guardar" /> Guardar borrador</button>
          <button className="btn primario" disabled={!habilitado || guardando || !verificacion?.planificable} title={titulo('planificar órdenes')} onClick={() => guardar('PLANIFICAR')}><Icono n="check" /> Confirmar y planificar</button>
        </div>
      </div>
    </>
  );
}
