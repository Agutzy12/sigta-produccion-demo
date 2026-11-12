/** Utilidades para las pruebas: iniciar sesión con cada rol y llamar a la API. */
import request from 'supertest';
import { crearApp } from '../src/app.js';
import { CLAVE_DEMO, USUARIOS_DEMO } from '../src/config.js';

export const app = crearApp();
export type RolPrueba = 'PRODUCCION' | 'CALIDAD' | 'DEPOSITO' | 'DIRECCION';
const tokens = new Map<RolPrueba, string>();

export async function token(rol: RolPrueba) {
  if (!tokens.has(rol)) {
    const email = USUARIOS_DEMO.find((u) => u.rol === rol)!.email;
    const r = await request(app).post('/api/auth/login').send({ email, password: CLAVE_DEMO });
    if (r.status !== 200) throw new Error(`No se pudo iniciar sesión como ${rol}: ${JSON.stringify(r.body)}`);
    tokens.set(rol, r.body.token);
  }
  return tokens.get(rol)!;
}

/** Llama a la API como un rol. Devuelve { estado, cuerpo }. */
export async function api(rol: RolPrueba, metodo: 'get' | 'post' | 'put', ruta: string, cuerpo?: object) {
  const pedido = request(app)[metodo](`/api${ruta}`).set('Authorization', `Bearer ${await token(rol)}`);
  const r = metodo === 'get' ? await pedido : await pedido.send(cuerpo ?? {});
  return { estado: r.status, cuerpo: r.body };
}
