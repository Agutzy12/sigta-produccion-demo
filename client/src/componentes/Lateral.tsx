/**
 * Columna derecha de la pantalla. Cada página puede "mandar" ahí contenido
 * (por ejemplo, la guía del paso) sin cambiar la estructura de su JSX.
 */
import { createContext, useContext, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export const LateralContexto = createContext<HTMLElement | null>(null);

export function EnLateral({ children }: { children: ReactNode }) {
  const destino = useContext(LateralContexto);
  return destino ? createPortal(children, destino) : null;
}
