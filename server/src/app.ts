/**
 * Aplicación Express: API REST en /api y, en producción, las pantallas ya compiladas (client/dist).
 */
import express, { type NextFunction, type Request, type Response } from 'express';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { crearRouter } from './rutas.js';
import { HttpError, errorDeRegla } from './errores.js';

export function crearApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '200kb' }));
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'same-origin');
    next();
  });

  app.use('/api', crearRouter());
  app.use('/api', (_req, res) => { res.status(404).json({ error: 'Ruta inexistente' }); });

  // Pantallas compiladas (npm run build). En desarrollo las sirve Vite en otro puerto.
  const cliente = fileURLToPath(new URL('../../client/dist', import.meta.url));
  if (existsSync(cliente)) {
    app.use(express.static(cliente, { maxAge: '1h', index: false }));
    app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile('index.html', { root: cliente }));
  }

  // Manejo de errores: todo error termina en una respuesta JSON { error: "mensaje" }
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof HttpError) return res.status(error.status).json({ error: error.message });
    const regla = errorDeRegla(error); // triggers de la base (bloqueo lógico, protocolo inalterable)
    if (regla) return res.status(regla.status).json({ error: regla.message });
    if ((error as { type?: string })?.type === 'entity.parse.failed') return res.status(400).json({ error: 'El pedido no es un JSON válido' });
    console.error(error);
    return res.status(500).json({ error: 'Ocurrió un error interno en el servidor' });
  });
  return app;
}
