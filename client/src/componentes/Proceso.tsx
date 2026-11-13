/**
 * Barra con los 4 pasos del circuito y, debajo, la guía del paso actual:
 * qué se hace acá, quién lo hace y qué pasa después.
 */
import { PASOS } from '../lib/proceso';
import { useSesion } from '../contexto/Sesion';
import { useDialogos } from '../contexto/Dialogos';
import { USUARIO_DE_ROL } from '../lib/demo';
import { Icono } from './Icono';

export function Proceso({ actual, guia = true }: { actual: 1 | 2 | 3 | 4; guia?: boolean }) {
  const { usuario, nombreRol, config, ingresarComo } = useSesion();
  const { aviso, error } = useDialogos();
  const paso = PASOS[actual - 1];
  const esSuTurno = usuario?.rol === paso.rol;

  const cambiar = async () => {
    try {
      const u = await ingresarComo(USUARIO_DE_ROL[paso.rol]);
      aviso(`Ahora estás como ${u.nombre} (${u.cargo})`, 'ok');
    } catch (e) { error(e); }
  };

  return (
    <>
      <div className="proceso" aria-label="Pasos del circuito de producción">
        {PASOS.map((p) => {
          const clase = p.n < actual ? 'hecho' : p.n === actual ? 'activo' : '';
          return (
            <div key={p.n} className={`paso ${clase}`} aria-current={p.n === actual ? 'step' : undefined}>
              <span className="num">{p.n < actual ? '✓' : p.n}</span>{p.corto}
              <span className="flecha"><Icono n="chevDer" tam={16} /></span>
            </div>
          );
        })}
      </div>
      {guia && (
        <div className="guia-paso">
          <div className="guia-linea">
            <span><b>Paso {paso.n} de 4 · {paso.titulo}</b> · lo registra {nombreRol(paso.rol)}</span>
            <details className="guia-mas">
              <summary>¿Qué hago acá?</summary>
              <div>{paso.que}</div>
              <div className="sigue">Después: {paso.despues}</div>
            </details>
          </div>
          {!esSuTurno && usuario && (
            <div className="otro-rol">
              <Icono n="info" tam={16} /> Estás como {nombreRol(usuario.rol)}: podés mirar, pero este paso lo registra {nombreRol(paso.rol)}.{' '}
              {config?.demo && <button className="enlace" onClick={cambiar}>Cambiar a {nombreRol(paso.rol)} →</button>}
            </div>
          )}
        </div>
      )}
    </>
  );
}
