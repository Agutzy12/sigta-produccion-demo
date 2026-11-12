/**
 * Usuarios, inicio de sesión y permisos.
 * Las contraseñas se guardan con bcrypt (nunca en texto plano) y la sesión es un token JWT.
 */
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { Rol, Usuario } from '@prisma/client';
import { db } from '../db.js';
import { DURACION_SESION, JWT_SECRET } from '../config.js';
import { noAutorizado } from '../errores.js';
import { auditar } from './comun.js';

export interface UsuarioPublico { id: number; email: string; nombre: string; cargo: string; iniciales: string; rol: Rol }

export const publico = (u: Usuario): UsuarioPublico =>
  ({ id: u.id, email: u.email, nombre: u.nombre, cargo: u.cargo, iniciales: u.iniciales, rol: u.rol });

export const cifrar = (clave: string) => bcrypt.hash(clave, 10);

export async function iniciarSesion(email: string, clave: string) {
  const usuario = await db().usuario.findUnique({ where: { email: email.trim().toLowerCase() } });
  // Mismo mensaje si no existe el usuario o si la clave está mal: no damos pistas a un atacante
  if (!usuario || !usuario.activo || !(await bcrypt.compare(clave, usuario.password_hash))) {
    throw noAutorizado('Email o contraseña incorrectos');
  }
  const token = jwt.sign({ sub: String(usuario.id), rol: usuario.rol }, JWT_SECRET, { expiresIn: DURACION_SESION });
  await auditar({ nombre: usuario.nombre, rol: usuario.rol }, 'INICIO_SESION', usuario.email, null);
  return { token, usuario: publico(usuario) };
}

/** Valida el token de la cabecera "Authorization: Bearer ..." y devuelve el usuario. */
export async function usuarioDelToken(cabecera: string | undefined) {
  const token = cabecera?.startsWith('Bearer ') ? cabecera.slice(7) : null;
  if (!token) throw noAutorizado('Iniciá sesión para operar en el sistema');
  let id: number;
  try {
    id = Number((jwt.verify(token, JWT_SECRET) as jwt.JwtPayload).sub);
  } catch {
    throw noAutorizado('La sesión venció o no es válida. Volvé a iniciar sesión.');
  }
  const usuario = await db().usuario.findUnique({ where: { id } });
  if (!usuario || !usuario.activo) throw noAutorizado('El usuario ya no está habilitado');
  return publico(usuario);
}

/** Usuarios de ejemplo para los accesos rápidos de la pantalla de ingreso (sólo en modo demo). */
export async function usuariosDemo() {
  const lista = await db().usuario.findMany({ where: { activo: true }, orderBy: { id: 'asc' } });
  return lista.map(publico);
}
