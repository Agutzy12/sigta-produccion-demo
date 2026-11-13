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
import { Icono, IsotipoSigta, type NombreIcono } from '../componentes/Icono';
import type { Rol } from '../lib/tipos';

const ICONO_ROL: Record<Rol, NombreIcono> = { PRODUCCION: 'ejecucion', CALIDAD: 'calidad', DEPOSITO: 'deposito', DIRECCION: 'reportes' };
const AREA: Record<Rol, string> = { PRODUCCION: 'Producción', CALIDAD: 'Calidad', DEPOSITO: 'Depósito', DIRECCION: 'Gerencia' };

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
      <section className="presentacion">
        <div className="marca-grande"><IsotipoSigta claro /><b>SIGTA</b></div>
        <h1>Gestión y Trazabilidad Alimentaria</h1>
        <p>Del pedido de producción al cliente, cada lote queda registrado: qué insumos usó, quién lo aprobó y dónde está.</p>
        <ol className="pasos-intro">
          {PASOS.map((p) => <li key={p.n}><i>{p.n}</i><span><b>{p.titulo}</b>{AREA[p.rol]}</span></li>)}
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
                  <span className={`acceso-icono ${u.rol.toLowerCase()}`}><Icono n={ICONO_ROL[u.rol]} tam={20} /></span>
                  <span className="acceso-texto"><b>{u.cargo}</b><small>{QUE_HACE[u.rol]}</small></span>
                  <span className="acceso-ir">{entrando === u.email ? 'Entrando…' : <Icono n="chevDer" tam={18} />}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <details className="ingreso-manual" open={!demo}>
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
