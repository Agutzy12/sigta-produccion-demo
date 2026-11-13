// Aplica las migraciones pendientes (npm run db:migrate).
// Las migraciones necesitan la conexión DIRECTA a la base: con la conexión "pooler" de Neon
// el bloqueo que usa Prisma para no aplicar dos veces lo mismo se corta por tiempo.
// Si no hay DATABASE_URL_UNPOOLED (o apunta al pooler), se arma la directa sacando "-pooler" del host.
import { execSync } from 'node:child_process';

if (!process.env.DATABASE_URL) {
  console.error('Falta DATABASE_URL: no se pueden aplicar las migraciones.');
  process.exit(1);
}
const directa = (url) => url.replace('-pooler.', '.').replace(/([?&])pgbouncer=true&?/, '$1').replace(/[?&]$/, '');
const base = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
process.env.DATABASE_URL_UNPOOLED = directa(base);
// Prisma toma un "advisory lock" para que dos procesos no migren a la vez. Una compilación que se cortó
// puede dejarlo tomado y trabar todas las siguientes. Acá nunca migran dos a la vez (sólo producción migra),
// así que se desactiva: cada migración igual corre dentro de su transacción y queda registrada.
process.env.PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK = '1';

// Si la base estaba "dormida" (Neon apaga las bases sin uso) el primer intento puede tardar: se reintenta
for (let intento = 1; intento <= 3; intento++) {
  try {
    execSync('npx prisma migrate deploy', { stdio: 'inherit', env: process.env });
    break;
  } catch (e) {
    if (intento === 3) throw e;
    console.warn(`La migración no respondió (intento ${intento} de 3). Reintentando en 5 segundos…`);
    execSync('sleep 5');
  }
}
