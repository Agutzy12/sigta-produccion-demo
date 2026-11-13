/** Modo claro (por defecto) u oscuro. Se recuerda en el navegador. */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';

type Tema = 'claro' | 'oscuro';
const leer = (): Tema => { try { return localStorage.getItem('sigta_tema') === 'oscuro' ? 'oscuro' : 'claro'; } catch { return 'claro'; } };

const Contexto = createContext<{ tema: Tema; cambiarTema: () => void }>({ tema: 'claro', cambiarTema: () => {} });
export const useTema = () => useContext(Contexto);

export function ProveedorTema({ children }: { children: ReactNode }) {
  const [tema, setTema] = useState<Tema>(leer);
  const actual = useRef(tema);
  useEffect(() => { document.documentElement.dataset.tema = tema; actual.current = tema; }, [tema]);

  /**
   * Cambio de tema animado y parejo: se saca una "foto" de la pantalla, se aplica el tema nuevo de una sola vez
   * y el navegador funde una foto con la otra. Así fondos, bordes y letras cambian juntos en la misma animación
   * (antes cada texto animaba su color por su cuenta y quedaba un instante sin contraste).
   */
  const cambiarTema = useCallback(() => {
    const nuevo: Tema = actual.current === 'oscuro' ? 'claro' : 'oscuro';
    try { localStorage.setItem('sigta_tema', nuevo); } catch { /* sin almacenamiento */ }
    const raiz = document.documentElement;
    const aplicar = () => {
      raiz.dataset.tema = nuevo;
      actual.current = nuevo;
      flushSync(() => setTema(nuevo));
    };
    raiz.classList.add('cambiando-tema'); // sin transiciones propias durante el cambio
    const sinMovimiento = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const doc = document as Document & { startViewTransition?: (f: () => void) => { finished: Promise<void> } };
    if (doc.startViewTransition && !sinMovimiento) {
      doc.startViewTransition(aplicar).finished.finally(() => raiz.classList.remove('cambiando-tema'));
    } else {
      aplicar();
      requestAnimationFrame(() => requestAnimationFrame(() => raiz.classList.remove('cambiando-tema')));
    }
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
