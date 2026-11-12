/**
 * Punto de entrada del servidor:  npm run dev  (desarrollo)  ·  npm start  (producción)
 */
process.env.TZ ||= 'America/Argentina/Cordoba';

const { crearApp } = await import('./app.js');
const { asegurarDatos } = await import('./seed/seed.js');
const { prisma } = await import('./db.js');

const PUERTO = Number(process.env.PORT) || 3000;

try {
  await asegurarDatos(); // la primera vez carga los datos de ejemplo
} catch (error) {
  console.error('\nNo se pudo conectar con la base de datos. ¿Está levantado PostgreSQL (npm run db:up) y aplicadas las migraciones (npm run setup)?\n');
  console.error(error);
  process.exit(1);
}

const servidor = crearApp().listen(PUERTO, () => {
  console.log(`SIGTA · API escuchando en http://localhost:${PUERTO}`);
});

const cerrar = async () => { servidor.close(); await prisma.$disconnect(); process.exit(0); };
process.on('SIGINT', cerrar);
process.on('SIGTERM', cerrar);
