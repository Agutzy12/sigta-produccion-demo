/**
 * Pantalla de ingreso: explica qué es SIGTA y permite iniciar sesión.
 * En modo demo muestra accesos rápidos con un usuario de cada rol.
 */
import { useEffect, useState, type FormEvent } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useSesion } from '../contexto/Sesion';
import { useDialogos } from '../contexto/Dialogos';
import { LogoEmpresa, useTema } from '../contexto/Tema';
import { api } from '../lib/api';
import { QUE_HACE } from '../lib/demo';
import { PASOS } from '../lib/proceso';
import type { Usuario } from '../lib/tipos';
import { Icono, LogotipoSigta } from '../componentes/Icono';
import { FotoRol } from '../componentes/Rol';
import type { Rol } from '../lib/tipos';

const AREA: Record<Rol, string> = { PRODUCCION: 'Producción', CALIDAD: 'Calidad', DEPOSITO: 'Depósito', DIRECCION: 'Gerencia' };

export function Ingresar() {
  const { usuario, iniciar, ingresarComo } = useSesion();
  const { error } = useDialogos();
  const { tema, cambiarTema } = useTema();
  const navegar = useNavigate();
  const [parametros] = useSearchParams();
  const [email, setEmail] = useState('');
  const [clave, setClave] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [demo, setDemo] = useState<{ clave: string; usuarios: Usuario[] } | null>(null);
  const [sinServidor, setSinServidor] = useState<string | null>(null);
  const [entrando, setEntrando] = useState<string | null>(null);
  const volver = parametros.get('volver') || '/panel';

  useEffect(() => {
    api.get('/salud').then(() => setSinServidor(null)).catch((e: Error) => setSinServidor(e.message));
    api.get<{ clave: string; usuarios: Usuario[] }>('/auth/demo').then(setDemo).catch(() => setDemo(null));
  }, []);

  if (usuario) return <Navigate to={volver} replace />;

  const entrar = async (accion: () => Promise<unknown>) => {
    setOcupado(true);
    try { await accion(); navegar(volver, { replace: true }); } catch (e) { error(e); setOcupado(false); setEntrando(null); }
  };
  const enviar = (e: FormEvent) => { e.preventDefault(); entrar(() => iniciar(email, clave)); };

  return (
    <div className="ingreso">
      <button className="btn-icono ingreso-tema" type="button" onClick={cambiarTema}
        aria-label={tema === 'oscuro' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'} title={tema === 'oscuro' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}>
        <Icono n={tema === 'oscuro' ? 'sol' : 'luna'} /></button>
      <section className="presentacion">
        <div className="marca-grande"><LogotipoSigta alto={150} /></div>
        <h1>Sistema Integral de Gestión y Trazabilidad Alimentaria</h1>
        <p>Reemplaza los formularios en papel y las planillas de la planta: planifica la producción con las recetas, controla la calidad de cada lote antes de que salga y permite saber en segundos de qué insumos está hecho un producto y a qué cliente llegó.</p>
        <ol className="pasos-intro">
          {PASOS.map((p) => <li key={p.n}><i>{p.n}</i><span><b>{p.titulo} <em>· {AREA[p.rol]}</em></b>{p.que.split(':')[0].replace(/\.$/, '')}.</span></li>)}
        </ol>
        <div className="cliente"><LogoEmpresa alto={40} siempreClaro /><span>Para Agrifood Argentina S.A.<br />Módulo de Producción y Trazabilidad</span></div>
      </section>

      <section className="formulario">
        {sinServidor && <div className="aviso rojo" role="alert"><div><b>El sistema no está disponible</b>{sinServidor}</div></div>}

        {demo && (
          <div>
            <h2>Probar la demo</h2>
            <p className="sub" style={{ color: 'var(--texto-suave)', marginTop: 4 }}>Elegí con qué rol entrar. Cada uno sólo puede hacer lo suyo.</p>
            <div className="acceso-lista">
              {demo.usuarios.map((u) => (
                <button key={u.id} className="acceso" disabled={Boolean(entrando)} onClick={() => { setEntrando(u.email); entrar(() => ingresarComo(u.email)); }}>
                  <FotoRol rol={u.rol} />
                  <span className="acceso-texto"><b>{u.nombre}</b><span className="acceso-cargo">{u.cargo}</span><small>{QUE_HACE[u.rol]}</small></span>
                  <span className="acceso-ir">{entrando === u.email ? 'Entrando…' : <Icono n="chevDer" tam={18} />}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <details className="ingreso-manual" open>
          <summary>{demo ? 'Ingresar con email y contraseña' : 'Ingresar'}</summary>
          <form onSubmit={enviar} className="rejilla" style={{ gap: 14, marginTop: 14 }}>
            <div className="campo"><label htmlFor="email">Email</label>
              <input id="email" className="entrada" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
            <div className="campo"><label htmlFor="clave">Contraseña</label>
              <input id="clave" className="entrada" type="password" autoComplete="current-password" value={clave} onChange={(e) => setClave(e.target.value)} required /></div>
            <button className="btn primario" type="submit" disabled={ocupado}>{ocupado && !entrando ? 'Entrando…' : 'Ingresar'}</button>
            {demo && <p className="sub" style={{ color: 'var(--texto-suave)', fontSize: 13 }}>Usuarios de ejemplo: produccion@sigta.demo, calidad@sigta.demo, deposito@sigta.demo y gerencia@sigta.demo · contraseña <b>{demo.clave}</b></p>}
          </form>
        </details>
      </section>
    </div>
  );
}
