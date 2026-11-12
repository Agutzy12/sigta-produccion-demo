/** Ayuda: qué es SIGTA, el circuito de 4 pasos, quién hace cada cosa y el glosario. */
import { Link } from 'react-router-dom';
import { useSesion } from '../contexto/Sesion';
import { GLOSARIO } from '../lib/glosario';
import { PASOS } from '../lib/proceso';
import { Cabecera, Miga } from '../componentes/Comunes';
import { Icono } from '../componentes/Icono';

export function ComoFunciona() {
  const { nombreRol } = useSesion();
  return (
    <>
      <Miga texto="Ayuda / Cómo funciona SIGTA" />
      <Cabecera titulo="¿Cómo funciona SIGTA?" sub="El recorrido de un lote, desde que se planifica hasta que llega al cliente." />

      <section className="tarjeta">
        <h2>¿Para qué sirve?</h2>
        <p style={{ marginTop: 10, maxWidth: 900, color: 'var(--texto-2)' }}>
          SIGTA (Sistema Integral de Gestión y Trazabilidad Alimentaria) centraliza en una sola base de datos lo que hoy se registra en papel y en planillas de Excel:
          las órdenes de producción con sus recetas, el consumo de cada partida de insumo, el control de calidad de cada lote y su ingreso al depósito.
          Así se evita despachar por error un lote no liberado y se puede rastrear cualquier producto en segundos ante una auditoría o un reclamo.
        </p>
      </section>

      <h2 style={{ fontSize: 20, margin: '6px 0 12px' }}>El circuito en 4 pasos</h2>
      <div className="flujo" style={{ marginBottom: 22 }}>
        {PASOS.map((p) => (
          <div key={p.n} className="etapa-flujo">
            <div className="n">{p.n}</div>
            <h3>{p.titulo}</h3>
            <p>{p.que}</p>
            <p style={{ color: 'var(--texto-suave)' }}>→ {p.despues}</p>
            <span className="rol">{nombreRol(p.rol)} · {p.cu}</span>
            <div style={{ marginTop: 12 }}><Link className="enlace" to={p.ruta}>Ir a este paso →</Link></div>
          </div>
        ))}
      </div>

      <div className="rejilla col-2">
        <section className="tarjeta">
          <h2>Reglas que el sistema hace cumplir</h2>
          <ul className="lista-pronto" style={{ marginTop: 12 }}>
            <li>Un lote recién elaborado queda en <b>cuarentena</b>: no se puede guardar en depósito ni despachar.</li>
            <li>Sólo <b>Calidad</b> puede liberarlo. Un lote <b>rechazado</b> queda bloqueado y su orden pasa a Rechazada (Scrap).</li>
            <li>El bloqueo se verifica en <b>dos niveles</b>: en la aplicación y en la base de datos (triggers de PostgreSQL).</li>
            <li>El protocolo de calidad firmado y el registro de auditoría son <b>inalterables</b>.</li>
            <li>Planificar una orden <b>no descuenta stock</b>: se descuenta al finalizar la elaboración.</li>
            <li>Las partidas se sugieren por <b>FEFO</b> (primero vence, primero sale).</li>
            <li>Cada usuario sólo puede hacer lo que le corresponde a su <b>rol</b>.</li>
          </ul>
        </section>
        <section className="tarjeta">
          <h2>Quién hace qué</h2>
          <table className="tabla" style={{ marginTop: 12 }}>
            <tbody>
              <tr><td><b>{nombreRol('PRODUCCION')}</b></td><td>Planifica órdenes y registra la elaboración (pasos 1 y 2).</td></tr>
              <tr><td><b>{nombreRol('CALIDAD')}</b></td><td>Analiza los lotes y firma el dictamen (paso 3).</td></tr>
              <tr><td><b>{nombreRol('DEPOSITO')}</b></td><td>Recibe el producto liberado y despacha (paso 4).</td></tr>
              <tr><td><b>{nombreRol('DIRECCION')}</b></td><td>Consulta todo, sin modificar nada.</td></tr>
            </tbody>
          </table>
          <p className="sub" style={{ marginTop: 12 }}><Icono n="info" tam={16} /> En la demo podés cambiar de usuario desde tu nombre, arriba a la derecha.</p>
        </section>
      </div>

      <section className="tarjeta">
        <h2>Glosario</h2>
        <dl className="glosario">
          {Object.values(GLOSARIO).map(([termino, texto]) => <div key={termino}><dt>{termino}</dt><dd>{texto}</dd></div>)}
        </dl>
      </section>
    </>
  );
}
