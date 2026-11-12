/**
 * Pantalla de ingreso: explica qué es SIGTA y permite iniciar sesión.
 * En modo demo muestra accesos rápidos con un usuario de cada rol.
 */
import { useEffect, useState, type FormEvent } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useSesion } from '../contexto/Sesion';
import { useDialogos } from '../contexto/Dialogos';
import { LogoEmpresa } from '../contexto/Tema';
import { api } from '../lib/api';
import { QUE_HACE } from '../lib/demo';
import { PASOS } from '../lib/proceso';
import type { Usuario } from '../lib/tipos';
import { IsotipoSigta } from '../componentes/Icono';

export function Ingresar() {
  const { usuario, iniciar, ingresarComo } = useSesion();
  const { error } = useDialogos();
  const navegar = useNavigate();
  const [parametros] = useSearchParams();
  const [email, setEmail] = useState('');
  const [clave, setClave] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [demo, setDemo] = useState<{ clave: string; usuarios: Usuario[] } | null>(null);
  const [sinServidor, setSinServidor] = useState<string | null>(null);
  const volver = parametros.get('volver') || '/panel';

  useEffect(() => {
    api.get('/salud').then(() => setSinServidor(null)).catch((e: Error) => setSinServidor(e.message));
    api.get<{ clave: string; usuarios: Usuario[] }>('/auth/demo').then(setDemo).catch(() => setDemo(null));
  }, []);

  if (usuario) return <Navigate to={volver} replace />;

  const entrar = async (accion: () => Promise<unknown>) => {
    setOcupado(true);
    try { await accion(); navegar(volver, { replace: true }); } catch (e) { error(e); setOcupado(false); }
  };
  const enviar = (e: FormEvent) => { e.preventDefault(); entrar(() => iniciar(email, clave)); };

  return (
    <div className="ingreso">
      <section className="presentacion">
        <div className="marca-grande"><IsotipoSigta claro /><b>SIGTA</b></div>
        <h1>Sistema Integral de Gestión y Trazabilidad Alimentaria</h1>
        <p>
          Reemplaza los formularios en papel y las planillas de Excel de la planta: planifica la producción con las recetas,
          controla la calidad de cada lote antes de que salga y permite saber, en segundos, de qué insumos está hecho
          un producto y a qué cliente llegó.
        </p>
        <div className="pasos-intro">
          {PASOS.map((p) => (
            <div key={p.n}><b><i>{p.n}</i>{p.titulo}</b>{p.que.split(':')[0].replace(/\.$/, '')}.</div>
          ))}
        </div>
        <div className="cliente"><LogoEmpresa alto={44} siempreClaro /><span>Desarrollado para Agrifood Argentina S.A.<br />Módulo de Producción y Trazabilidad · Demo</span></div>
      </section>

      <section className="formulario">
        <div>
          <h2>Ingresar</h2>
          <p className="sub" style={{ color: 'var(--texto-suave)', marginTop: 4 }}>Usá tu email y contraseña de SIGTA.</p>
        </div>
        {sinServidor && <div className="aviso rojo" role="alert"><div><b>El sistema no está disponible</b>{sinServidor}</div></div>}
        <form onSubmit={enviar} className="rejilla" style={{ gap: 16 }}>
          <div className="campo"><label htmlFor="email">Email</label>
            <input id="email" className="entrada" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <div className="campo"><label htmlFor="clave">Contraseña</label>
            <input id="clave" className="entrada" type="password" autoComplete="current-password" value={clave} onChange={(e) => setClave(e.target.value)} required /></div>
          <button className="btn primario" type="submit" disabled={ocupado}>Ingresar</button>
        </form>

        {demo && (
          <>
            <div className="separador">o entrá con un usuario de ejemplo</div>
            <div className="accesos">
              {demo.usuarios.map((u) => (
                <button key={u.id} className="acceso" disabled={ocupado} onClick={() => entrar(() => ingresarComo(u.email))}>
                  <span className="avatar">{u.iniciales}</span>
                  <span><b>{u.cargo}</b><small>{u.nombre} · {QUE_HACE[u.rol]}</small></span>
                </button>
              ))}
            </div>
            <p className="sub" style={{ color: 'var(--texto-suave)', fontSize: 13 }}>
              Demo: todos los usuarios de ejemplo tienen la contraseña <b>{demo.clave}</b>. Cada uno sólo puede hacer lo que le corresponde a su rol.
            </p>
          </>
        )}
      </section>
    </div>
  );
}
