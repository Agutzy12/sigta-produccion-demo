/** Error que el servidor convierte en una respuesta HTTP (400, 404, 409...). */
export class HttpError extends Error {
  constructor(public status: number, mensaje: string) {
    super(mensaje);
  }
}
export const datosInvalidos = (m: string) => new HttpError(400, m); // faltan datos o están mal
export const noAutorizado = (m: string) => new HttpError(401, m); // no inició sesión
export const prohibido = (m: string) => new HttpError(403, m); // su rol no lo permite
export const noExiste = (m: string) => new HttpError(404, m); // no se encontró lo pedido
export const noSePuede = (m: string) => new HttpError(409, m); // el estado actual no lo permite
export const bloqueado = (m: string) => new HttpError(423, m); // bloqueo lógico (lote no liberado)

/**
 * Errores que lanza PostgreSQL desde los triggers (ver migración reglas_de_negocio).
 * Se reconocen por el código SQLSTATE propio: SG423 (bloqueo lógico) o SG409 (registro inalterable).
 */
export function errorDeRegla(error: unknown): HttpError | null {
  const texto = error instanceof Error ? error.message : String(error ?? '');
  const meta = (error as { meta?: { code?: string; message?: string } })?.meta;
  const encontrado =
    texto.match(/code: "(SG4\d\d)", message: "((?:[^"\\]|\\.)+)"/) // consultas comunes de Prisma
    ?? texto.match(/Code: `(SG4\d\d)`\. Message: `(?:ERROR: )?([^`]+)`/) // consultas SQL directas
    ?? (meta?.code?.startsWith('SG4') ? [null, meta.code, String(meta.message ?? '')] : null);
  if (!encontrado) return null;
  const [, codigo, mensaje] = encontrado as [unknown, string, string];
  return codigo === 'SG423' ? bloqueado(mensaje) : noSePuede(mensaje);
}
