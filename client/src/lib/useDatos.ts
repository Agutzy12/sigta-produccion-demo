import { useCallback, useEffect, useState } from 'react';

/** Carga datos de la API al abrir la pantalla. Devuelve { datos, error, cargando, recargar }. */
export function useDatos<T>(cargar: () => Promise<T>, dependencias: unknown[] = []) {
  const [estado, setEstado] = useState<{ datos?: T; error?: Error; cargando: boolean }>({ cargando: true });
  const [vuelta, setVuelta] = useState(0);
  useEffect(() => {
    let vigente = true;
    setEstado((e) => ({ ...e, cargando: true }));
    cargar()
      .then((datos) => { if (vigente) setEstado({ datos, cargando: false }); })
      .catch((error: Error) => { if (vigente) setEstado({ error, cargando: false }); });
    return () => { vigente = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencias, vuelta]);
  const recargar = useCallback(() => setVuelta((v) => v + 1), []);
  return { ...estado, recargar, setDatos: (datos: T) => setEstado({ datos, cargando: false }) };
}
