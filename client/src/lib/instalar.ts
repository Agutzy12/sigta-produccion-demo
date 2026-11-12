/**
 * SIGTA como aplicación instalable (PWA).
 * El navegador avisa que se puede instalar con el evento "beforeinstallprompt"; se guarda para usarlo
 * cuando la persona toca "Instalar". En iPhone no existe ese evento: se instala desde Compartir → Agregar a inicio.
 */
interface EventoInstalar extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

let evento: EventoInstalar | null = null;
const avisos = new Set<() => void>();

export function prepararApp() {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); evento = e as EventoInstalar; avisos.forEach((f) => f()); });
  window.addEventListener('appinstalled', () => { evento = null; avisos.forEach((f) => f()); });
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => { /* sin app instalable: la web sigue funcionando */ }); });
  }
}

export const sePuedeInstalar = () => evento !== null;
export const yaInstalada = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
export const esIphone = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
export const alCambiarInstalable = (funcion: () => void) => { avisos.add(funcion); return () => { avisos.delete(funcion); }; };

/** Abre el cuadro de instalación del navegador. Devuelve true si la persona aceptó. */
export async function instalar() {
  if (!evento) return false;
  await evento.prompt();
  const { outcome } = await evento.userChoice;
  evento = null;
  avisos.forEach((f) => f());
  return outcome === 'accepted';
}
