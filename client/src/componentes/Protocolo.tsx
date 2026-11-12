/** Protocolo de calidad firmado: ventana de consulta (se usa en Calidad y en Depósito). */
import { api } from '../lib/api';
import { useDialogos } from '../contexto/Dialogos';
import { fechaHora, num } from '../lib/formato';
import type { Especificacion, Protocolo, Resultados } from '../lib/tipos';
import { Pill } from './Comunes';
import { Icono } from './Icono';

export const Contraste = ({ ok }: { ok: boolean | null }) =>
  ok == null ? <Pill color="gris">Sin cargar</Pill> : ok ? <Pill color="verde">Conforme</Pill> : <Pill color="rojo">No conforme</Pill>;

/** Ventana con el protocolo firmado (también se usa desde Depósito). */
export function useVerProtocolo() {
  const { modal, error } = useDialogos();
  return async (loteId: number) => {
    try {
      const p = await api.get<{ protocolo: Protocolo; especificacion: Especificacion; resultados: Resultados; lote: { codigo: string; producto_nombre: string } }>(`/calidad/${loteId}/protocolo`);
      const c = p.protocolo, e = p.especificacion, r = p.resultados;
      const fila = (n: string, v: string, esp: string, ok: boolean | null) => <tr key={n}><td><b>{n}</b></td><td>{v}</td><td>{esp}</td><td><Contraste ok={ok} /></td></tr>;
      modal({
        titulo: `Protocolo ${c.protocolo}`, ancho: 720,
        contenido: (<>
          <p className="sub" style={{ color: 'var(--texto-suave)' }}>{c.formulario} · {p.lote.producto_nombre} · Lote {p.lote.codigo}</p>
          <table className="tabla" style={{ margin: '14px 0' }}><thead><tr><th>Determinación</th><th>Resultado</th><th>Especificación</th><th>Contraste</th></tr></thead>
            <tbody>
              {fila('Humedad', `${num(c.humedad, 1)} %`, `≤ ${num(e.humedad_max, 1)} %`, r.humedad)}
              {fila('pH', num(c.ph, 1), `${num(e.ph_min, 1)} a ${num(e.ph_max, 1)}`, r.ph)}
              {fila('Aroma', c.aroma, e.aroma.texto, r.aroma)}
              {fila('Color', c.color, e.color.texto, r.color)}
              {fila('Sabor', c.sabor, e.sabor.texto, r.sabor)}
              {fila('Recuento microbiológico', `${num(c.ufc)} UFC/g`, `≤ ${num(e.ufc_max)} UFC/g`, r.ufc)}
            </tbody></table>
          <p><b>Dictamen:</b> {c.dictamen === 'APROBAR_LIBERAR' ? 'Aprobado y liberado' : 'Rechazado y bloqueado'}</p>
          <p style={{ marginTop: 6 }}><b>Observaciones:</b> {c.observaciones || '—'}</p>
          <p style={{ marginTop: 6, color: 'var(--texto-suave)' }}><Icono n="candado" tam={14} /> Firmado por {c.analista} · {fechaHora(c.fecha)}. El protocolo firmado no se puede modificar.</p>
        </>),
      });
    } catch (e) { error(e); }
  };
}

