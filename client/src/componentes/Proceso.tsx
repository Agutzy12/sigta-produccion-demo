/**
 * Guía del circuito, en la columna derecha: los 4 pasos en vertical, qué se hace
 * en el paso actual, quién lo registra y qué pasa después.
 */
import { PASOS } from '../lib/proceso';
import { useSesion } from '../contexto/Sesion';
import { useDialogos } from '../contexto/Dialogos';
import { USUARIO_DE_ROL } from '../lib/demo';
import { Icono } from './Icono';
import { EnLateral } from './Lateral';
import { FotoRol } from './Rol';

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
    <EnLateral>
      <section className="guia" aria-label="Pasos del circuito de producción">
        <div className="guia-titulo">Circuito de producción</div>
        <ol className="pasos-v">
          {PASOS.map((p) => {
            const clase = p.n < actual ? 'hecho' : p.n === actual ? 'activo' : '';
            return (
              <li key={p.n} className={clase} aria-current={p.n === actual ? 'step' : undefined}>
                <span className="num">{p.n < actual ? <Icono n="check" tam={14} /> : p.n}</span>
                <span className="txt"><b>{p.corto}</b><small>{nombreRol(p.rol)}</small></span>
              </li>
            );
          })}
        </ol>
        {guia && (
          <div className="guia-detalle">
            <div className="guia-etiqueta">Paso {paso.n} de 4</div>
            <h3>{paso.titulo}</h3>
            <p>{paso.que}</p>
            <div className="guia-sigue"><span>Después</span>{paso.despues}</div>
            <div className="guia-quien"><FotoRol rol={paso.rol} tam={30} /><span>Lo registra<b>{nombreRol(paso.rol)}</b></span></div>
          </div>
        )}
        {guia && !esSuTurno && usuario && (
          <div className="guia-rol">
            <p>Estás como <b>{nombreRol(usuario.rol)}</b>: podés mirar, pero este paso lo registra {nombreRol(paso.rol)}.</p>
            {config?.demo && <button className="btn primario chico" onClick={cambiar}><Icono n="cambiar" tam={16} /> Cambiar a {nombreRol(paso.rol)}</button>}
          </div>
        )}
      </section>
    </EnLateral>
  );
}
