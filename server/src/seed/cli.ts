// Reinicia la base con los datos de ejemplo:  npm run db:seed
process.env.TZ ||= 'America/Argentina/Cordoba';
// Con --si-vacia sólo los carga si la base está vacía (lo usa el despliegue en Vercel).
const { asegurarDatos, reiniciarDemo } = await import('./seed.js');
const { prisma } = await import('../db.js');

const inicio = Date.now();
if (process.argv.includes('--si-vacia')) await asegurarDatos();
else await reiniciarDemo({ nombre: 'Sistema', rol: 'SISTEMA' });
console.log(`Datos de ejemplo listos en ${((Date.now() - inicio) / 1000).toFixed(1)} s.`);
await prisma.$disconnect();
