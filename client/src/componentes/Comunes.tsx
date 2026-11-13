/** Piezas chicas que se repiten en todas las pantallas. */
import type { ReactNode } from 'react';
import { EnCabecera } from './Lateral';
import { ESTADOS_LOTE, ESTADOS_OP, type Color } from '../lib/estados';
import { GLOSARIO, type ClaveGlosario } from '../lib/glosario';
import type { EstadoLote, EstadoOP } from '../lib/tipos';

export const Pill = ({ color = 'gris', children }: { color?: Color; children: ReactNode }) =>
  <span className={`pill ${color}`}><span className="punto" />{children}</span>;
export const PillOP = ({ estado }: { estado: EstadoOP }) => { const [t, c] = ESTADOS_OP[estado] ?? [estado, 'gris']; return <Pill color={c}>{t}</Pill>; };
export const PillLote = ({ estado }: { estado: EstadoLote }) => { const [t, c] = ESTADOS_LOTE[estado] ?? [estado, 'gris']; return <Pill color={c}>{t}</Pill>; };

/** Palabra del glosario: al pasar el mouse (o con el teclado) explica qué significa. */
export function Termino({ t, children }: { t: ClaveGlosario; children?: ReactNode }) {
  const [titulo, texto] = GLOSARIO[t];
  return (
    <span className="termino" tabIndex={0} aria-label={`${titulo}: ${texto}`}>
      {children ?? titulo}
      <span className="explica" role="tooltip"><b>{titulo}</b>{texto}</span>
    </span>
  );
}

export function Cabecera({ titulo, sub, children }: { titulo: string; sub?: ReactNode; children?: ReactNode }) {
  return (
    <EnCabecera>
      <div className="cabecera">
        <div><h1>{titulo}</h1>{sub && <p>{sub}</p>}</div>
        {children && <div className="acciones">{children}</div>}
      </div>
    </EnCabecera>
  );
}

export const Miga = ({ texto }: { texto: string }) => <EnCabecera><div className="miga">{texto}</div></EnCabecera>;

export const Dato = ({ titulo, children }: { titulo: ReactNode; children: ReactNode }) =>
  <div className="dato"><small>{titulo}</small><b>{children}</b></div>;

export function Cargando() {
  return <div className="cargando" aria-label="Cargando"><i /><i /><i /></div>;
}

export function Vacio({ titulo, children }: { titulo: string; children?: ReactNode }) {
  return <div className="vacio-grande"><h3>{titulo}</h3>{children}</div>;
}

export function ErrorCarga({ error, reintentar }: { error: Error; reintentar?: () => void }) {
  return (
    <section className="tarjeta">
      <Vacio titulo="No se pudieron cargar los datos">
        {error.message}
        {reintentar && <><br /><br /><button className="btn" onClick={reintentar}>Reintentar</button></>}
      </Vacio>
    </section>
  );
}

/** Campo con la unidad a la derecha ("kg", "%", "unidades"). */
export function ConUnidad({ unidad, children, ancho }: { unidad: ReactNode; children: ReactNode; ancho?: number }) {
  return <div className="con-unidad" style={ancho ? { width: ancho } : undefined}>{children}<span>{unidad}</span></div>;
}
