/** Modo claro (por defecto) u oscuro. Se recuerda en el navegador. */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type Tema = 'claro' | 'oscuro';
const leer = (): Tema => { try { return localStorage.getItem('sigta_tema') === 'oscuro' ? 'oscuro' : 'claro'; } catch { return 'claro'; } };

const Contexto = createContext<{ tema: Tema; cambiarTema: () => void }>({ tema: 'claro', cambiarTema: () => {} });
export const useTema = () => useContext(Contexto);

export function ProveedorTema({ children }: { children: ReactNode }) {
  const [tema, setTema] = useState<Tema>(leer);
  useEffect(() => { document.documentElement.dataset.tema = tema; }, [tema]);
  const cambiarTema = useCallback(() => {
    setTema((actual) => {
      const nuevo: Tema = actual === 'oscuro' ? 'claro' : 'oscuro';
      try { localStorage.setItem('sigta_tema', nuevo); } catch { /* sin almacenamiento */ }
      return nuevo;
    });
    document.documentElement.classList.add('cambiando-tema');
    setTimeout(() => document.documentElement.classList.remove('cambiando-tema'), 450);
  }, []);
  const valor = useMemo(() => ({ tema, cambiarTema }), [tema, cambiarTema]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

/** Logo de Agrifood Argentina: en modo oscuro se usa la versión con fondo transparente. */
export function LogoEmpresa({ alto = 34, siempreClaro = false }: { alto?: number; siempreClaro?: boolean }) {
  const { tema } = useTema();
  const oscuro = tema === 'oscuro' && !siempreClaro;
  return <img src={oscuro ? '/img/logo-oscuro.png' : '/img/logo.png'} alt="Agrifood Argentina" style={{ height: alto, width: 'auto' }} />;
}
