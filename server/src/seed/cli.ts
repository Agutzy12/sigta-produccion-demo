// Reinicia la base con los datos de ejemplo:  npm run db:seed
process.env.TZ ||= 'America/Argentina/Cordoba';
const { reiniciarDemo } = await import('./seed.js');
const { prisma } = await import('../db.js');

const inicio = Date.now();
await reiniciarDemo({ nombre: 'Sistema', rol: 'SISTEMA' });
console.log(`Base cargada con los datos de ejemplo en ${((Date.now() - inicio) / 1000).toFixed(1)} s.`);
await prisma.$disconnect();
