// Función de Vercel: toda la API (/api/...) la atiende la misma aplicación Express del servidor.
// Las pantallas (client/dist) las sirve Vercel como archivos estáticos.
import { crearApp } from '../server/dist/app.js';

process.env.TZ ||= 'America/Argentina/Cordoba'; // fechas y turnos en hora argentina

export default crearApp();
