/**
 * Llamadas a la API. Agrega el token de la sesión y convierte los errores en mensajes legibles.
 */
const CLAVE_TOKEN = 'sigta_token';

export const leerToken = () => { try { return localStorage.getItem(CLAVE_TOKEN); } catch { return null; } };
export const guardarToken = (token: string | null) => {
  try { if (token) localStorage.setItem(CLAVE_TOKEN, token); else localStorage.removeItem(CLAVE_TOKEN); } catch { /* sin almacenamiento */ }
};

export class ErrorApi extends Error {
  constructor(public estado: number, mensaje: string) { super(mensaje); }
}

/** Se llama cuando la sesión vence (401): la app vuelve a la pantalla de ingreso. */
let alVencerSesion: () => void = () => {};
export const cuandoVenceLaSesion = (funcion: () => void) => { alVencerSesion = funcion; };

async function pedir<T>(metodo: string, ruta: string, cuerpo?: unknown): Promise<T> {
  const token = leerToken();
  let respuesta: Response;
  try {
    respuesta = await fetch(`/api${ruta}`, {
      method: metodo,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: cuerpo === undefined || metodo === 'GET' ? undefined : JSON.stringify(cuerpo),
    });
  } catch {
    throw new ErrorApi(0, 'No hay conexión con el servidor. Revisá que esté encendido.');
  }
  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    if (respuesta.status === 401 && token && !ruta.startsWith('/auth/login')) alVencerSesion();
    throw new ErrorApi(respuesta.status, datos.error || 'Ocurrió un error inesperado');
  }
  return datos as T;
}

export const api = {
  get: <T>(ruta: string) => pedir<T>('GET', ruta),
  post: <T>(ruta: string, cuerpo: unknown = {}) => pedir<T>('POST', ruta, cuerpo),
  put: <T>(ruta: string, cuerpo: unknown = {}) => pedir<T>('PUT', ruta, cuerpo),
};
