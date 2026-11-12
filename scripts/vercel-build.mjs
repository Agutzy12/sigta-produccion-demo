// Compilación en Vercel (vercel.json → buildCommand):
// 1) compila servidor y pantallas, 2) aplica las migraciones y 3) carga los datos de ejemplo si la base está vacía.
// Sin base configurada, publica igual las pantallas y avisa (la API responde "falta configurar la base").
import { execSync } from 'node:child_process';

const correr = (comando, env = {}) => execSync(comando, { stdio: 'inherit', env: { ...process.env, ...env } });

correr('npm run build');
if (!process.env.DATABASE_URL) {
  console.warn('\n⚠ Falta DATABASE_URL: se publicaron las pantallas, pero la API no va a funcionar hasta conectar la base (ver docs/DESPLIEGUE.md).\n');
} else {
  correr('npm run db:migrate -w server');
  correr('node server/dist/seed/cli.js --si-vacia', { TZ: 'America/Argentina/Cordoba' });
}
