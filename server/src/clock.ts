/**
 * Reloj del sistema. Todo el código pide la hora acá y no con `new Date()` suelto.
 * ¿Para qué? Para que los datos de ejemplo puedan "viajar en el tiempo":
 * el seed corre los mismos servicios fingiendo que pasaron varios días.
 */
let reloj: (() => Date) | null = null; // null = hora real

export const ahora = (): Date => (reloj ? reloj() : new Date());
export const fijarReloj = (funcion: () => Date) => { reloj = funcion; };
export const liberarReloj = () => { reloj = null; };
