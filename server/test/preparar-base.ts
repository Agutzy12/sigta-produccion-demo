// Antes de las pruebas: aplica las migraciones en la base de pruebas.
import { execSync } from 'node:child_process';
import { loadEnv } from 'vite';

export default function preparar() {
  const env = { ...loadEnv('test', process.cwd(), ''), ...process.env };
  const url = env.DATABASE_URL_TEST ?? 'postgresql://sigta:sigta@localhost:5432/sigta_test?schema=public';
  execSync('npx prisma migrate deploy', { stdio: 'pipe', env: { ...process.env, DATABASE_URL: url, DATABASE_URL_UNPOOLED: url } });
}
