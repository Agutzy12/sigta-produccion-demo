// Levanta el servidor (API) y el cliente (pantallas) juntos:  npm run dev
import { spawn } from 'node:child_process';

const procesos = [
  ['API', ['run', 'dev', '-w', 'server']],
  ['WEB', ['run', 'dev', '-w', 'client']],
].map(([nombre, args]) => {
  const p = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, { stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32' });
  const escribir = (dato) => String(dato).split('\n').filter(Boolean).forEach((l) => console.log(`[${nombre}] ${l}`));
  p.stdout.on('data', escribir);
  p.stderr.on('data', escribir);
  p.on('exit', (codigo) => { console.log(`[${nombre}] terminó (${codigo})`); procesos.forEach((x) => x.kill()); process.exit(codigo ?? 0); });
  return p;
});
process.on('SIGINT', () => { procesos.forEach((p) => p.kill()); process.exit(0); });
