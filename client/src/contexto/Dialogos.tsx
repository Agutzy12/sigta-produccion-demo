/**
 * Avisos flotantes ("tostadas") y ventanas modales, disponibles en toda la app con useDialogos().
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

type TipoAviso = '' | 'ok' | 'error';
interface Boton { texto: string; primario?: boolean; peligro?: boolean; alHacer?: () => unknown }
interface OpcionesModal { titulo: string; contenido: ReactNode; botones?: Boton[]; ancho?: number }

interface Dialogos {
  aviso: (texto: string, tipo?: TipoAviso) => void;
  error: (e: unknown) => void;
  modal: (opciones: OpcionesModal) => () => void;
  confirmar: (titulo: string, texto: ReactNode, textoBoton?: string, peligro?: boolean) => Promise<boolean>;
}

const Contexto = createContext<Dialogos | null>(null);
export const useDialogos = () => useContext(Contexto)!;

function Modal({ o, cerrar }: { o: OpcionesModal; cerrar: () => void }) {
  const caja = useRef<HTMLDivElement>(null);
  const [ocupado, setOcupado] = useState(false);
  useEffect(() => {
    const primerCampo = caja.current?.querySelector<HTMLElement>('input, select, textarea');
    (primerCampo ?? caja.current)?.focus();
  }, []);
  const botones = o.botones ?? [{ texto: 'Cerrar' }];
  return (
    <div className="cortina" onMouseDown={(e) => { if (e.target === e.currentTarget) cerrar(); }}
      onKeyDown={(e) => { if (e.key === 'Escape') cerrar(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={o.titulo} ref={caja} tabIndex={-1} style={o.ancho ? { maxWidth: o.ancho } : undefined}>
        <h2>{o.titulo}</h2>
        <div className="cuerpo">{o.contenido}</div>
        <div className="pie-modal">
          {botones.map((b) => (
            <button key={b.texto} className={`btn ${b.primario ? 'primario' : ''} ${b.peligro ? 'peligro' : ''}`} disabled={ocupado}
              onClick={async () => {
                if (!b.alHacer) return cerrar();
                setOcupado(true);
                try {
                  const sigue = await b.alHacer();
                  if (sigue !== false) cerrar();
                } finally { setOcupado(false); }
              }}>{b.texto}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ProveedorDialogos({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<{ id: number; texto: string; tipo: TipoAviso }[]>([]);
  const [modales, setModales] = useState<{ id: number; o: OpcionesModal }[]>([]);
  const contador = useRef(0);

  const aviso = useCallback((texto: string, tipo: TipoAviso = '') => {
    const id = ++contador.current;
    setAvisos((a) => [...a, { id, texto, tipo }]);
    setTimeout(() => setAvisos((a) => a.filter((x) => x.id !== id)), tipo === 'error' ? 6500 : 3800);
  }, []);
  const error = useCallback((e: unknown) => aviso(e instanceof Error ? e.message : String(e), 'error'), [aviso]);
  const modal = useCallback((o: OpcionesModal) => {
    const id = ++contador.current;
    setModales((m) => [...m, { id, o }]);
    return () => setModales((m) => m.filter((x) => x.id !== id));
  }, []);
  const confirmar = useCallback((titulo: string, texto: ReactNode, textoBoton = 'Confirmar', peligro = false) => new Promise<boolean>((resolver) => {
    let respondido = false;
    const responder = (valor: boolean) => { if (!respondido) { respondido = true; resolver(valor); } };
    const cerrar = modal({
      titulo,
      contenido: <p>{texto}</p>,
      botones: [
        { texto: 'Cancelar', alHacer: () => { responder(false); } },
        { texto: textoBoton, primario: !peligro, peligro, alHacer: () => { responder(true); } },
      ],
    });
    void cerrar;
  }), [modal]);

  const valor = useMemo(() => ({ aviso, error, modal, confirmar }), [aviso, error, modal, confirmar]);
  return (
    <Contexto.Provider value={valor}>
      {children}
      {modales.map(({ id, o }) => <Modal key={id} o={o} cerrar={() => setModales((m) => m.filter((x) => x.id !== id))} />)}
      <div className="tostadas" role="status" aria-live="polite">
        {avisos.map((a) => <div key={a.id} className={`tostada ${a.tipo}`}>{a.texto}</div>)}
      </div>
    </Contexto.Provider>
  );
}
