/** Consulta · Catálogo de productos: el mismo de agrifood-argentina.com, con la receta y el palletizado que usa SIGTA. */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useDatos } from '../lib/useDatos';
import { useSesion } from '../contexto/Sesion';
import { useDialogos } from '../contexto/Dialogos';
import { num, pesoTexto } from '../lib/formato';
import { Cabecera, Cargando, Dato, ErrorCarga, Miga, Pill, Termino } from '../componentes/Comunes';
import { Icono } from '../componentes/Icono';

interface ProductoCatalogo {
  id: number; codigo: string; nombre: string; presentacion: string; presentacion_kg: number; gtin: string; vida_util_meses: number;
  unidades_por_caja: number | null; unidades_por_pallet: number; raciones: number | null; linea_nombre: string | null;
  ingredientes: string | null; alergenos: string | null; almacenamiento: string | null; embalaje: string | null; url_web: string | null;
  humedad_max: number; ph_min: number; ph_max: number; ufc_max: number; color_esperado: string;
  receta: { codigo: string; version: number; base_kg: number; items: { codigo: string; nombre: string; tipo: string; unidad: string; cantidad_base: number }[] } | null;
}
interface Categoria { id: number; codigo: string; nombre: string; familia: string; url_web: string | null; productos: ProductoCatalogo[] }

export function Catalogo() {
  const { puede } = useSesion();
  const { modal } = useDialogos();
  const { datos, error, recargar } = useDatos(() => api.get<Categoria[]>('/catalogo'));
  const [linea, setLinea] = useState('TODAS');
  const [texto, setTexto] = useState('');
  if (error) return <ErrorCarga error={error} reintentar={recargar} />;
  if (!datos) return <Cargando />;

  const t = texto.trim().toLowerCase();
  const visibles = datos
    .filter((c) => linea === 'TODAS' || c.codigo === linea)
    .map((c) => ({ ...c, productos: c.productos.filter((p) => !t || `${p.nombre} ${p.codigo} ${p.presentacion}`.toLowerCase().includes(t)) }))
    .filter((c) => c.productos.length);
  const total = datos.reduce((a, c) => a + c.productos.length, 0);

  const ficha = (p: ProductoCatalogo) => modal({
    titulo: `${p.nombre} · ${p.presentacion}`, ancho: 760,
    contenido: (<>
      <p className="sub" style={{ color: 'var(--texto-suave)' }}>{p.codigo} · GTIN {p.gtin} · Vida útil {p.vida_util_meses} meses · Se elabora en {p.linea_nombre}</p>
      <div className="rejilla col-2" style={{ marginTop: 14, gap: 14 }}>
        <Dato titulo="Ingredientes">{p.ingredientes ?? '—'}</Dato>
        <Dato titulo="Alérgenos">{p.alergenos ?? 'No declara'}</Dato>
        <Dato titulo="Almacenamiento">{p.almacenamiento ?? '—'}</Dato>
        <Dato titulo="Embalaje">{p.embalaje ?? '—'}</Dato>
        <Dato titulo="Palletizado">{num(p.unidades_por_pallet)} unidades ({num(p.unidades_por_pallet * p.presentacion_kg)} kg) por pallet{p.unidades_por_caja ? ` · cajas de ${p.unidades_por_caja}` : ''}</Dato>
        <Dato titulo="Especificación de Calidad (ejemplo)">Humedad ≤ {num(p.humedad_max, 1)} % · pH {num(p.ph_min, 1)} a {num(p.ph_max, 1)} · ≤ {num(p.ufc_max)} UFC/g · {p.color_esperado}</Dato>
      </div>
      {p.receta && (<>
        <h3 style={{ margin: '18px 0 8px', fontSize: 17 }}><Termino t="receta">Receta</Termino> {p.receta.codigo} · cada {num(p.receta.base_kg)} kg</h3>
        <table className="tabla"><thead><tr><th>Insumo</th><th>Cantidad</th></tr></thead>
          <tbody>{p.receta.items.map((i) => <tr key={i.codigo}><td><b>{i.nombre}</b><span className="peq">{i.codigo} · {i.tipo === 'MP' ? 'Materia prima' : 'Empaque'}</span></td><td className="num">{num(i.cantidad_base, i.cantidad_base % 1 ? 2 : 0)} {i.unidad}</td></tr>)}</tbody></table>
        <p className="sub" style={{ marginTop: 10, color: 'var(--texto-suave)' }}>La web publica los ingredientes; las proporciones son de ejemplo hasta validarlas con Producción.</p>
      </>)}
    </>),
    botones: [
      ...(p.url_web ? [{ texto: 'Ver en la web de Agrifood ↗', alHacer: () => { window.open(p.url_web!, '_blank', 'noopener'); return false; } }] : []),
      { texto: 'Cerrar', primario: true },
    ],
  });

  return (
    <>
      <Miga texto="Consultas / Catálogo de productos" />
      <Cabecera titulo="Catálogo de productos" sub={`Los ${total} productos de agrifood-argentina.com, con la receta y el palletizado que usa SIGTA.`}>
        <a className="btn" href="https://agrifood-argentina.com/productos.php" target="_blank" rel="noreferrer"><Icono n="flecha" /> Ir a la web</a>
      </Cabecera>
      <div className="pestanas">
        <button className={linea === 'TODAS' ? 'activa' : ''} onClick={() => setLinea('TODAS')}>Todas · {total}</button>
        {datos.map((c) => <button key={c.codigo} className={linea === c.codigo ? 'activa' : ''} onClick={() => setLinea(c.codigo)}>{c.nombre.replace('Línea ', '')} · {c.productos.length}</button>)}
        <label className="buscador"><Icono n="buscar" tam={18} /><input placeholder="Buscar producto" aria-label="Buscar producto" value={texto} onChange={(e) => setTexto(e.target.value)} /></label>
      </div>
      {visibles.map((c) => (
        <section key={c.codigo} className="tarjeta">
          <div className="tarjeta-cab">
            <div><h2>{c.nombre}</h2><p className="sub">{c.familia} · {c.productos.length} {c.productos.length === 1 ? 'producto' : 'productos'}</p></div>
            {c.url_web && <a className="enlace" href={c.url_web} target="_blank" rel="noreferrer">Ver la línea en la web ↗</a>}
          </div>
          <table className="tabla">
            <thead><tr><th>Producto</th><th>Presentación</th><th>Palletizado</th><th>Vida útil</th><th></th></tr></thead>
            <tbody>{c.productos.map((p) => (
              <tr key={p.id}>
                <td><b>{p.nombre}</b><span className="peq">{p.codigo}{p.alergenos ? ` · ${p.alergenos.split('.')[0]}` : ''}</span></td>
                <td>{p.presentacion}{p.raciones ? <span className="peq">{p.raciones} raciones</span> : null}</td>
                <td className="num">{num(p.unidades_por_pallet)} × {pesoTexto(p.presentacion_kg)}<span className="peq">{num(p.unidades_por_pallet * p.presentacion_kg)} kg por pallet</span></td>
                <td><Pill color="gris">{p.vida_util_meses} meses</Pill></td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button className="enlace" onClick={() => ficha(p)}>Ficha y receta →</button>
                  {puede('PRODUCCION') && <> · <Link className="enlace" to={`/ordenes/nueva?producto=${p.id}`}>Planificar →</Link></>}
                </td>
              </tr>
            ))}</tbody>
          </table>
        </section>
      ))}
    </>
  );
}
