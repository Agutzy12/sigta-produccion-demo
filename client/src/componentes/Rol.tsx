/** Foto de cada perfil: el ícono de lo que hace, centrado en un círculo de su color. */
import type { Rol } from '../lib/tipos';
import { Icono, type NombreIcono } from './Icono';

export const ICONO_DE_ROL: Record<Rol, NombreIcono> = { PRODUCCION: 'rolProduccion', CALIDAD: 'rolCalidad', DEPOSITO: 'rolDeposito', DIRECCION: 'rolGerencia' };

export function FotoRol({ rol, tam = 46 }: { rol: Rol; tam?: number }) {
  return (
    <span className={`foto-rol ${rol.toLowerCase()}`} style={{ width: tam, height: tam }} aria-hidden="true">
      <Icono n={ICONO_DE_ROL[rol]} tam={Math.round(tam * 0.5)} />
    </span>
  );
}
