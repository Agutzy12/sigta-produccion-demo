/**
 * Etiqueta logística GS1-128 de un pallet, con el código de barras real (bwip-js).
 * La librería se carga sólo cuando hace falta, para que la app abra rápido.
 */
import { useEffect, useState } from 'react';
import { fecha, kg } from '../lib/formato';

export interface DatosEtiqueta { codigo: string; gs1: string; bultos: number; kg: number; producto: string; lote: string; vencimiento: string }

export function EtiquetaGS1({ e }: { e: DatosEtiqueta }) {
  const [svg, setSvg] = useState<string>('');
  const [fallo, setFallo] = useState(false);
  useEffect(() => {
    let vigente = true;
    import('bwip-js/browser')
      .then(({ default: bwip }) => {
        if (!vigente) return;
        setSvg(bwip.toSVG({ bcid: 'gs1-128', text: e.gs1, height: 14, includetext: false }));
      })
      .catch(() => setFallo(true));
    return () => { vigente = false; };
  }, [e.gs1]);
  return (
    <div className="etiqueta" data-gs1={e.gs1}>
      <div className="cab"><span>{e.producto}</span><span>{e.codigo}</span></div>
      <div className="barras-svg" aria-label={`Código de barras GS1-128 ${e.gs1}`} dangerouslySetInnerHTML={{ __html: fallo ? '' : svg }} />
      <div className="texto-gs1">{e.gs1}</div>
      <div className="datos">
        <div><span>Lote (10): </span><b>{e.lote}</b></div>
        <div><span>Vence (17): </span><b>{fecha(e.vencimiento)}</b></div>
        <div><span>Peso neto (3102): </span><b>{kg(e.kg)}</b></div>
        <div><span>Bolsas: </span><b>{e.bultos}</b></div>
      </div>
    </div>
  );
}
