/**
 * Estructura de todas las pantallas: menú lateral (con los pasos numerados) + barra superior.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useSesion } from '../contexto/Sesion';
import { useDialogos } from '../contexto/Dialogos';
import { api } from '../lib/api';
import { fechaHora, fechaLarga } from '../lib/formato';
import { PASOS } from '../lib/proceso';
import { QUE_HACE, USUARIO_DE_ROL } from '../lib/demo';
import type { Pendientes, Rol } from '../lib/tipos';
import { Icono, IsotipoSigta, type NombreIcono } from './Icono';
import { Pill } from './Comunes';
import { BotonInstalar } from './InstalarApp';
import { LogoEmpresa, useTema } from '../contexto/Tema';

const activo = ({ isActive }: { isActive: boolean }) => (isActive ? 'activo' : '');
/** Área que registra cada paso (texto corto para el menú). */
const AREA: Record<Rol, string> = { PRODUCCION: 'Producción', CALIDAD: 'Calidad', DEPOSITO: 'Depósito', DIRECCION: 'Gerencia' };
const CUENTA_DE_PASO: Record<number, keyof Pendientes> = { 1: 'planificar', 2: 'elaborar', 3: 'calidad', 4: 'deposito' };

/** Módulos del informe que llegan en la versión completa. Hoy sólo se describen. */
const PROXIMOS: { texto: string; icono: NombreIcono; resumen: string; puntos: string[] }[] = [
  { texto: 'Proveedores y compras', icono: 'compras', resumen: 'Todo el circuito de abastecimiento, desde la necesidad hasta el pago.',
    puntos: ['Fichas de proveedores', 'Comparativa de presupuestos', 'Órdenes de compra y cuentas a pagar', 'Ingreso de materia prima con control de calidad (R.BPM.01V01)'] },
  { texto: 'Stock e inventarios', icono: 'inventario', resumen: 'Existencias en tiempo real en todos los depósitos.',
    puntos: ['Multi-depósito, silos y racks', 'Alarmas de stock mínimo', 'Auditoría cíclica con recuento a ciegas y ajustes autorizados'] },
  { texto: 'Clientes y ventas', icono: 'ventas', resumen: 'De los pedidos mayoristas al despacho, con el bloqueo de lotes ya funcionando.',
    puntos: ['Pedidos y verificación de crédito y stock', 'Remitos y hojas de ruta', 'Facturación electrónica'] },
  { texto: 'Reportes', icono: 'reportes', resumen: 'Tableros para decidir con datos.', puntos: ['Productividad y mermas', 'Rotación de inventarios', 'Compras y eficiencia operativa'] },
  { texto: 'Administración de usuarios', icono: 'usuarios', resumen: 'Alta y baja de usuarios y perfiles. El inicio de sesión y los permisos por rol ya funcionan en esta demo.',
    puntos: ['Alta, baja y cambio de contraseña', 'Asignación de perfiles', 'Consulta del registro de auditoría'] },
];

export function Marca() {
  return (
    <div className="marca">
      <div className="sigta-titulo"><IsotipoSigta /><b>SIGTA</b></div>
      <div className="bajada">Gestión y Trazabilidad Alimentaria</div>
      <div className="para"><span>para</span><LogoEmpresa /></div>
    </div>
  );
}

function Desplegable({ abierto, cerrar, children }: { abierto: boolean; cerrar: () => void; children: ReactNode }) {
  const caja = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => { if (!caja.current?.contains(e.target as Node)) cerrar(); };
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') cerrar(); };
    setTimeout(() => document.addEventListener('click', fuera), 0);
    document.addEventListener('keydown', tecla);
    return () => { document.removeEventListener('click', fuera); document.removeEventListener('keydown', tecla); };
  }, [abierto, cerrar]);
  return abierto ? <div className="desplegable" ref={caja}>{children}</div> : null;
}

export function Layout() {
  const { usuario, config, pendientes, recargarPendientes, salir, ingresarComo, nombreRol } = useSesion();
  const { modal, aviso, error, confirmar } = useDialogos();
  const { tema, cambiarTema } = useTema();
  const ubicacion = useLocation();
  const navegar = useNavigate();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [abierto, setAbierto] = useState<'' | 'usuario' | 'demo' | 'alertas'>('');
  const [vuelta, setVuelta] = useState(0); // al cambiar de usuario o reiniciar, la pantalla se vuelve a cargar
  const [alertas, setAlertas] = useState<{ id: number; detalle: string; usuario: string; fecha: string }[] | null>(null);

  // Cada vez que se cambia de pantalla: se actualizan los números del menú y se cierra el menú del celular
  useEffect(() => { recargarPendientes(); setMenuAbierto(false); setAbierto(''); window.scrollTo(0, 0); }, [ubicacion.pathname, ubicacion.search, recargarPendientes]);

  if (!usuario || !config) return null;

  const verProximo = (m: (typeof PROXIMOS)[number]) => modal({
    titulo: m.texto, ancho: 520,
    contenido: (<>
      <p><Pill color="ambar">Próximamente</Pill></p>
      <p style={{ margin: '14px 0 10px' }}>{m.resumen}</p>
      <ul className="lista-pronto">{m.puntos.map((x) => <li key={x}>{x}</li>)}</ul>
      <p className="sub" style={{ marginTop: 14, color: 'var(--texto-suave)' }}>Forma parte de la versión completa de SIGTA (ver Informe Técnico, sección 12).</p>
    </>),
  });

  const cambiarA = async (rol: Rol) => {
    setAbierto('');
    try {
      const u = await ingresarComo(USUARIO_DE_ROL[rol]);
      aviso(`Ahora estás como ${u.nombre} (${u.cargo})`, 'ok');
      setVuelta((v) => v + 1);
    } catch (e) { error(e); }
  };

  const abrirAlertas = async () => {
    setAbierto(abierto === 'alertas' ? '' : 'alertas');
    setAlertas(null);
    try { setAlertas(await api.get('/alertas')); } catch { setAlertas([]); }
  };

  const reponerStock = async () => {
    setAbierto('');
    try {
      const insumos = await api.get<{ id: number; bajo: boolean; stock_minimo: number }[]>('/insumos');
      const bajos = insumos.filter((i) => i.bajo);
      if (!bajos.length) return aviso('Ningún insumo está por debajo del mínimo.');
      for (const i of bajos) await api.post('/demo/reponer', { insumo_id: i.id, cantidad: i.stock_minimo * 3 });
      aviso(`Se repuso stock de ${bajos.length} insumo(s)`, 'ok');
      setVuelta((v) => v + 1);
      recargarPendientes();
    } catch (e) { error(e); }
  };

  const reiniciar = async () => {
    setAbierto('');
    if (!(await confirmar('Reiniciar la demo', 'Se borran todos los movimientos y se vuelven a cargar los datos de ejemplo. Tarda unos segundos.', 'Reiniciar'))) return;
    try {
      aviso('Reiniciando la demo…');
      await api.post('/demo/reset');
      aviso('Demo reiniciada', 'ok');
      navegar('/panel');
      setVuelta((v) => v + 1);
    } catch (e) { error(e); }
  };

  return (
    <div className={`app ${menuAbierto ? 'menu-abierto' : ''}`}>
      <div className="sidebar-fondo" onClick={() => setMenuAbierto(false)} />
      <aside className="sidebar" aria-label="Menú principal">
        <Marca />
        <nav className="menu" style={{ marginTop: 22 }}>
          <NavLink to="/panel" className={activo}><Icono n="panel" /><span>Panel</span></NavLink>
        </nav>
        <div className="menu-titulo" style={{ marginTop: 18 }}>Circuito de producción</div>
        <nav className="menu">
          {PASOS.map((p) => {
            const cuenta = pendientes?.[CUENTA_DE_PASO[p.n]] ?? 0;
            return (
              <NavLink key={p.n} to={p.ruta} className={activo} title={`${p.cu} · Lo registra: ${nombreRol(p.rol)}`}>
                <span className="paso-n">{p.n}</span>
                <span>{p.titulo}<span className="quien">{AREA[p.rol]}</span></span>
                {cuenta > 0 && <span className="cuenta" aria-label={`${cuenta} pendientes`}>{cuenta}</span>}
              </NavLink>
            );
          })}
        </nav>
        <div className="menu-titulo">Consultas</div>
        <nav className="menu">
          <NavLink to="/trazabilidad" className={activo}><Icono n="trazabilidad" /><span>Trazabilidad de lote</span></NavLink>
          <NavLink to="/catalogo" className={activo}><Icono n="caja" /><span>Catálogo de productos</span></NavLink>
        </nav>
        <div className="menu-titulo">Próximamente</div>
        <nav className="menu">
          {PROXIMOS.map((m) => <button key={m.texto} className="item apagado" onClick={() => verProximo(m)}><Icono n={m.icono} /><span>{m.texto}</span></button>)}
        </nav>
        <div className="espacio" />
        <NavLink to="/como-funciona" className={({ isActive }) => `ayuda ${isActive ? 'activo' : ''}`}><Icono n="ayuda" /><span>¿Cómo funciona SIGTA?</span></NavLink>
        <div className="version">SIGTA · v1.0 · {config.demo ? 'Demo' : 'Producción'}</div>
      </aside>

      <div className="principal">
        <header className="topbar">
          <button className="btn-icono btn-menu" aria-label="Abrir menú" onClick={() => setMenuAbierto(!menuAbierto)}><Icono n="menu" /></button>
          <div className="fecha">{config.planta} · {fechaLarga()}</div>
          <div className="derecha">
            <BotonInstalar />
            {config.demo && <button className="chip-demo" onClick={() => setAbierto(abierto === 'demo' ? '' : 'demo')}><span className="punto" />Datos de ejemplo</button>}
            <button className="btn-icono" type="button" onClick={cambiarTema} title={tema === 'oscuro' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              aria-label={tema === 'oscuro' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}><Icono n={tema === 'oscuro' ? 'sol' : 'luna'} /></button>
            <button className="campana" aria-label="Alertas" onClick={abrirAlertas}><Icono n="campana" />{pendientes && pendientes.alertas > 0 && <span className="n">{pendientes.alertas}</span>}</button>
            <button className="usuario" onClick={() => setAbierto(abierto === 'usuario' ? '' : 'usuario')} aria-label={`Usuario: ${usuario.nombre}`}>
              <span><b>{usuario.nombre}</b><small>{usuario.cargo}</small></span><span className="avatar">{usuario.iniciales}</span>
            </button>
          </div>

          <Desplegable abierto={abierto === 'usuario'} cerrar={() => setAbierto('')}>
            <h4>Sesión iniciada</h4>
            <div className="vacio" style={{ paddingTop: 0 }}><b style={{ color: 'var(--texto)' }}>{usuario.nombre}</b> · {usuario.email}<br />{QUE_HACE[usuario.rol]}</div>
            {config.demo && <>
              <hr /><h4>Cambiar de usuario (demo)</h4>
              {(Object.keys(USUARIO_DE_ROL) as Rol[]).filter((r) => r !== usuario.rol).map((r) => (
                <button key={r} className="op" onClick={() => cambiarA(r)}>
                  <Icono n="cambiar" /><span><b>{nombreRol(r)}</b><small>{QUE_HACE[r]}</small></span>
                </button>
              ))}
            </>}
            <hr />
            <button className="op" onClick={() => { salir(); navegar('/ingresar'); }}><Icono n="salir" /><span><b>Cerrar sesión</b></span></button>
          </Desplegable>

          <Desplegable abierto={abierto === 'demo'} cerrar={() => setAbierto('')}>
            <h4>Herramientas de la demo</h4>
            <button className="op" onClick={reponerStock}><Icono n="caja" /><span><b>Reponer stock de insumos</b><small>Simula la llegada de mercadería de Compras</small></span></button>
            <button className="op" onClick={reiniciar}><Icono n="reloj" /><span><b>Reiniciar la demo</b><small>Vuelve a cargar los datos de ejemplo</small></span></button>
          </Desplegable>

          <Desplegable abierto={abierto === 'alertas'} cerrar={() => setAbierto('')}>
            <h4>Alertas recientes</h4>
            {alertas === null ? <div className="vacio">Cargando…</div>
              : alertas.length ? alertas.map((a) => <div key={a.id} className="alerta-item">{a.detalle}<small>{a.usuario} · {fechaHora(a.fecha)}</small></div>)
                : <div className="vacio">No hay alertas.</div>}
          </Desplegable>
        </header>

        <main className="contenido">
          {usuario.rol === 'DIRECCION' && (
            <div className="aviso solo-lectura"><Icono n="info" /><div><b>Modo de sólo lectura</b>Estás como {usuario.cargo}: podés consultar todo, pero no registrar movimientos.</div></div>
          )}
          <div key={`${ubicacion.pathname}|${vuelta}|${usuario.id}`} className="pantalla-entra"><Outlet /></div>
        </main>
      </div>
    </div>
  );
}
