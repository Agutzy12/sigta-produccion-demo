/**
 * Huecos de la estructura de pantalla que las páginas pueden llenar sin cambiar su JSX:
 * - cabecera: miga + título, a todo el ancho (arriba de la columna central y de la derecha)
 * - lateral: columna derecha (la guía del paso)
 * Si la página se muestra fuera de la estructura, el contenido queda en su lugar.
 */
import { createContext, useContext, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export const LateralContexto = createContext<{ lateral: HTMLElement | null; cabecera: HTMLElement | null } | null>(null);

export function EnLateral({ children }: { children: ReactNode }) {
  const destino = useContext(LateralContexto)?.lateral;
  return destino ? createPortal(children, destino) : null;
}

export function EnCabecera({ children }: { children: ReactNode }) {
  const huecos = useContext(LateralContexto);
  if (!huecos) return <>{children}</>;
  return huecos.cabecera ? createPortal(children, huecos.cabecera) : null;
}
