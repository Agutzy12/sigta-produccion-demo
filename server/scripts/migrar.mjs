// Aplica las migraciones pendientes (npm run db:migrate).
// En la nube la conexión directa (sin pool) va en DATABASE_URL_UNPOOLED; si no está, se usa DATABASE_URL.
import { execSync } from 'node:child_process';

if (!process.env.DATABASE_URL) {
  console.error('Falta DATABASE_URL: no se pueden aplicar las migraciones.');
  process.exit(1);
}
process.env.DATABASE_URL_UNPOOLED ||= process.env.DATABASE_URL;
execSync('npx prisma migrate deploy', { stdio: 'inherit', env: process.env });
