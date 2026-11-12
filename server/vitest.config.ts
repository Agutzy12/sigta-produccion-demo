import { defineConfig, loadEnv } from 'vite';

// Las pruebas usan una base aparte (DATABASE_URL_TEST) que se vacía y se recarga en cada corrida.
const env = { ...loadEnv('test', process.cwd(), ''), ...process.env };
const urlTest = env.DATABASE_URL_TEST ?? 'postgresql://sigta:sigta@localhost:5432/sigta_test?schema=public';

export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: './test/preparar-base.ts',
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    env: { DATABASE_URL: urlTest, DATABASE_URL_UNPOOLED: urlTest, TZ: 'America/Argentina/Cordoba', DEMO_MODE: 'true', NODE_ENV: 'test' },
  },
});
