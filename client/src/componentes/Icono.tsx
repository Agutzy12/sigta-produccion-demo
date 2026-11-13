/** Íconos SVG simples, todos del mismo estilo (trazo de 1,7). */
const ICONOS = {
  panel: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  ordenes: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h3"/>',
  ejecucion: '<path d="M3 21V10l5 3V8l5 3V6l5 3v12z"/><path d="M3 21h18"/>',
  calidad: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-9V3"/><path d="M8 15h8"/>',
  deposito: '<path d="M4 8l8-4 8 4v12H4z"/><path d="M8 12h8M8 16h8"/>',
  trazabilidad: '<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><path d="M4 12h16"/>',
  compras: '<path d="M3 4h2l2.4 11h10.2L20 7H6"/><circle cx="9" cy="19" r="1.3"/><circle cx="17" cy="19" r="1.3"/>',
  inventario: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/>',
  ventas: '<path d="M3 6h11v10H3zM14 9h4l3 3v4h-7"/><circle cx="7" cy="18" r="1.5"/><circle cx="17" cy="18" r="1.5"/>',
  reportes: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  usuarios: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 3-6 6.5-6s6.5 2.4 6.5 6M16 4.5a3.5 3.5 0 010 7M18 14.5c2.2.6 3.5 2.4 3.5 5.5"/>',
  ayuda: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01"/>',
  chevAbajo: '<path d="M6 9l6 6 6-6"/>',
  chevDer: '<path d="M9 6l6 6-6 6"/>',
  chevIzq: '<path d="M15 6l-6 6 6 6"/>',
  campana: '<path d="M6 17V11a6 6 0 0 1 12 0v6l1.5 2h-15zM10 21h4"/>',
  mas: '<path d="M12 5v14M5 12h14"/>',
  buscar: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  filtro: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  checkCirculo: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>',
  candado: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  guardar: '<path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7V4M8 20v-6h8v6"/>',
  libro: '<path d="M12 6c-2-1.5-5-2-8-2v14c3 0 6 .5 8 2 2-1.5 5-2 8-2V4c-3 0-6 .5-8 2zM12 6v14"/>',
  pausa: '<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>',
  play: '<path d="M7 5l12 7-12 7z"/>',
  flecha: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  dividir: '<path d="M12 21v-8M12 13L6 6M12 13l6-7M6 6v4M6 6h4M18 6v4M18 6h-4"/>',
  escudo: '<path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  caja: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/>',
  documento: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 13h6M9 17h4"/>',
  descargar: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
  barras: '<path d="M5 5v14M8 5v14M12 5v14M15 5v14M19 5v14"/>',
  firma: '<path d="M4 20h16M6 15c2-1 3-5 5-7s3 2 2 4-2 4 0 4 3-3 5-3"/>',
  trigo: '<path d="M12 21V9M12 9c-3 0-4-2-4-5 3 0 4 2 4 5zM12 9c3 0 4-2 4-5-3 0-4 2-4 5zM12 15c-3 0-4-2-4-5 3 0 4 2 4 5zM12 15c3 0 4-2 4-5-3 0-4 2-4 5z"/>',
  camion: '<path d="M3 6h11v10H3zM14 9h4l3 3v4h-7"/><circle cx="7" cy="18" r="1.5"/><circle cx="17" cy="18" r="1.5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>',
  sol: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>',
  luna: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  reloj: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  salir: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H4"/>',
  cambiar: '<path d="M7 4L3 8l4 4M3 8h13a4 4 0 0 1 0 8h-2M17 20l4-4-4-4"/>',
  imprimir: '<path d="M6 9V3h12v6M6 18H4v-7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v7h-2"/><rect x="6" y="14" width="12" height="7" rx="1"/>',
} as const;

export type NombreIcono = keyof typeof ICONOS;

export function Icono({ n, tam }: { n: NombreIcono; tam?: number }) {
  return (
    <svg className="ico" viewBox="0 0 24 24" aria-hidden="true" style={tam ? { width: tam, height: tam } : undefined}
      dangerouslySetInnerHTML={{ __html: ICONOS[n] }} />
  );
}

/** Isotipo de SIGTA: un recorrido que une origen, planta y destino (la trazabilidad). */
/** Isotipo de SIGTA: la hoja roja tapando "SIG / TA" sobre fondo negro. */
export function IsotipoSigta(_: { claro?: boolean } = {}) {
  return <img className="isotipo-sigta" src="/img/sigta-icono.svg" alt="" aria-hidden="true" />;
}

/** Logotipo completo (rojo, sin fondo) para usar en grande. */
export function LogotipoSigta({ alto = 120 }: { alto?: number }) {
  return <img className="logotipo-sigta" src="/img/logo-sigta.svg" alt="SIGTA" style={{ height: alto }} />;
}
