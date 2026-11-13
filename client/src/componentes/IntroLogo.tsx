/**
 * Logo de SIGTA animado para el ingreso: la media hoja cae hamacándose, se apoya en su lugar
 * y después las letras se dibujan (contorno y relleno) de la A a la S, como saliendo de la hoja.
 * Usa el mismo archivo del logo (/img/logo-sigta.svg) y termina exactamente en el logo quieto.
 */
import { useEffect, useRef } from 'react';

const NS = 'http://www.w3.org/2000/svg';
/** Tallito prolijo: nace en la punta de la hoja siguiendo su borde y se afina hacia la punta. */
const TALLO = 'M123 63C116.6 52.4 108.8 44.2 98.8 38.3C91.8 34.2 83.8 32.7 76.8 34C75.5 34.3 75.5 35.9 76.8 36.1C83.5 35.5 90.3 37.5 95.9 41.2C102.6 45.7 107.2 52.3 110 58L114 64Z';

const suave = (a: number, b: number, t: number) => { const u = Math.min(1, Math.max(0, (t - a) / (b - a))); return u * u * (3 - 2 * u); };

/**
 * Caída de una hoja: baja frenando hasta apoyarse, se hamaca inclinándose hacia donde va
 * y el vaivén termina antes de apoyarse (el último tramo es una bajada recta y suave).
 */
function caida(vaivenes: number, alto: number, ancho: number, giro: number): Keyframe[] {
  const k: Keyframe[] = [], N = 200, finVaiven = 0.8;
  for (let n = 0; n <= N; n++) {
    const t = n / N;
    const apaga = 1 - suave(0.25, finVaiven, t);
    const fase = 2 * Math.PI * vaivenes * Math.min(t / finVaiven, 1);
    const x = ancho * apaga * Math.sin(fase);
    const r = -giro * apaga * Math.cos(fase) * suave(0, 0.18, t);
    const y = -alto * Math.pow(1 - t, 2.2);
    k.push({ transform: `translate(${x.toFixed(2)}px,${y.toFixed(2)}px) rotate(${r.toFixed(2)}deg)`, opacity: Math.min(1, t * 8), offset: t });
  }
  k[N].transform = 'translate(0px,0px) rotate(0deg)';
  return k;
}

export function IntroLogo({ alto = 150 }: { alto?: number }) {
  const caja = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const animaciones: Animation[] = [];
    let cancelado = false;
    fetch('/img/logo-sigta.svg').then((r) => r.text()).then((texto) => {
      const div = caja.current;
      if (cancelado || !div) return;
      div.innerHTML = texto;
      const svg = div.querySelector('svg')!;
      svg.setAttribute('aria-label', 'SIGTA'); svg.setAttribute('role', 'img');
      Object.assign(svg.style, { height: `${alto}px`, width: 'auto', overflow: 'visible', display: 'block' });

      const letras = svg.querySelector('g[clip-path]') as SVGGElement;
      const hojaG = [...svg.querySelectorAll('g')].find((g) => /translate\(19 56\)/.test(g.getAttribute('transform') || '')) as SVGGElement;
      const tallo = hojaG.querySelector('path[fill="none"]');
      if (tallo) {
        tallo.setAttribute('d', TALLO);
        tallo.setAttribute('fill', tallo.getAttribute('stroke') || '#1fa34a');
        ['stroke', 'stroke-width', 'stroke-linecap'].forEach((a) => tallo.removeAttribute(a));
      }
      // la hoja va dentro de un grupo propio: se anima el grupo y la hoja conserva su posición final
      const hoja = document.createElementNS(NS, 'g');
      hojaG.parentNode!.insertBefore(hoja, hojaG); hoja.appendChild(hojaG);
      Object.assign(hoja.style, { transformBox: 'fill-box', transformOrigin: '50% 20%' });
      // cada letra en su grupo, invisible hasta que empieza su dibujo
      const color = letras.getAttribute('fill') || '#1fa34a';
      const grupos = [...letras.querySelectorAll('path')].map((p) => {
        const g = document.createElementNS(NS, 'g'); p.parentNode!.insertBefore(g, p); g.appendChild(p);
        const L = Math.ceil(p.getTotalLength()) + 2;
        Object.assign(p.style, { stroke: color, strokeWidth: '1.4', strokeLinejoin: 'round', strokeDasharray: `${L} ${L}`, strokeDashoffset: `${L}`, fillOpacity: '0' });
        g.style.opacity = '0';
        return { g, p, L };
      });

      const dur = 4200;
      animaciones.push(hoja.animate(caida(2, 300, 60, 24), { duration: dur, easing: 'linear', fill: 'both' }));
      [...grupos].reverse().forEach(({ g, p, L }, i) => {
        const d = dur + 400 + i * 260;
        animaciones.push(g.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 120, delay: d, fill: 'both' }));
        animaciones.push(p.animate([{ strokeDashoffset: L }, { strokeDashoffset: 0 }], { duration: 1300, delay: d, easing: 'ease-in-out', fill: 'both' }));
        animaciones.push(p.animate([{ fillOpacity: 0 }, { fillOpacity: 1 }], { duration: 700, delay: d + 1000, easing: 'ease-out', fill: 'both' }));
        animaciones.push(p.animate([{ strokeOpacity: 1 }, { strokeOpacity: 0 }], { duration: 500, delay: d + 1300, fill: 'both' }));
      });
    }).catch(() => { /* sin el archivo, queda el espacio vacío: el resto del ingreso funciona igual */ });
    return () => { cancelado = true; animaciones.forEach((a) => a.cancel()); };
  }, [alto]);

  // reserva el lugar del logo para que nada se mueva mientras carga
  return <div ref={caja} className="intro-logo" style={{ height: alto, aspectRatio: '270 / 238' }} />;
}
