/** Rutas de la aplicación. Todas, menos la de ingreso, requieren haber iniciado sesión. */
import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useSesion } from './contexto/Sesion';
import { Layout } from './componentes/Layout';
import { Cargando } from './componentes/Comunes';
import { Ingresar } from './paginas/Ingresar';
import { Panel } from './paginas/Panel';
import { NuevaOrden } from './paginas/NuevaOrden';
import { Ejecucion } from './paginas/Ejecucion';
import { Calidad } from './paginas/Calidad';
import { Deposito } from './paginas/Deposito';
import { Trazabilidad } from './paginas/Trazabilidad';
import { ComoFunciona } from './paginas/ComoFunciona';
import { Catalogo } from './paginas/Catalogo';

const TITULOS: [RegExp, string][] = [
  [/^\/ingresar/, 'Ingresar'], [/^\/panel/, 'Panel de producción'], [/^\/ordenes/, 'Planificar orden'],
  [/^\/ejecucion/, 'Elaboración'], [/^\/calidad/, 'Control de calidad'], [/^\/deposito/, 'Ingreso a depósito'],
  [/^\/trazabilidad/, 'Trazabilidad de lote'], [/^\/catalogo/, 'Catálogo de productos'], [/^\/como-funciona/, 'Cómo funciona'],
];

function RequiereSesion({ children }: { children: React.ReactNode }) {
  const { usuario } = useSesion();
  const ubicacion = useLocation();
  if (!usuario) return <Navigate to={`/ingresar?volver=${encodeURIComponent(ubicacion.pathname + ubicacion.search)}`} replace />;
  return children;
}

export function App() {
  const { listo } = useSesion();
  const { pathname } = useLocation();
  useEffect(() => {
    const titulo = TITULOS.find(([re]) => re.test(pathname))?.[1];
    document.title = titulo ? `${titulo} · SIGTA` : 'SIGTA · Gestión y Trazabilidad Alimentaria';
  }, [pathname]);

  if (!listo) return <div className="contenido"><Cargando /></div>;
  return (
    <Routes>
      <Route path="/ingresar" element={<Ingresar />} />
      <Route element={<RequiereSesion><Layout /></RequiereSesion>}>
        <Route path="/panel" element={<Panel />} />
        <Route path="/ordenes/nueva" element={<NuevaOrden />} />
        <Route path="/ordenes/:id" element={<NuevaOrden />} />
        <Route path="/ejecucion" element={<Ejecucion />} />
        <Route path="/ejecucion/:id" element={<Ejecucion />} />
        <Route path="/calidad" element={<Calidad />} />
        <Route path="/calidad/:id" element={<Calidad />} />
        <Route path="/deposito" element={<Deposito />} />
        <Route path="/deposito/:op" element={<Deposito />} />
        <Route path="/trazabilidad" element={<Trazabilidad />} />
        <Route path="/catalogo" element={<Catalogo />} />
        <Route path="/como-funciona" element={<ComoFunciona />} />
      </Route>
      <Route path="*" element={<Navigate to="/panel" replace />} />
    </Routes>
  );
}
