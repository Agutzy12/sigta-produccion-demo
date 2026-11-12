import type { Rol } from './tipos';

/** Los 4 pasos del circuito de producción (casos de uso CU-P01 a CU-P04). */
export const PASOS: { n: 1 | 2 | 3 | 4; titulo: string; corto: string; cu: string; rol: Rol; ruta: string; que: string; despues: string }[] = [
  {
    n: 1, titulo: 'Planificar orden', corto: 'Planificación', cu: 'CU-P01', rol: 'PRODUCCION', ruta: '/ordenes/nueva',
    que: 'Elegí producto y cantidad: el sistema calcula los insumos con la receta y verifica que haya stock.',
    despues: 'La orden queda planificada y lista para elaborar. Planificar no descuenta stock.',
  },
  {
    n: 2, titulo: 'Elaborar', corto: 'Elaboración', cu: 'CU-P02', rol: 'PRODUCCION', ruta: '/ejecucion',
    que: 'Iniciá la orden, confirmá qué partida de cada insumo usaste y cargá los kilos obtenidos.',
    despues: 'Se descuenta el stock y el lote queda en cuarentena hasta que Calidad lo analice.',
  },
  {
    n: 3, titulo: 'Controlar calidad', corto: 'Control de calidad', cu: 'CU-P03', rol: 'CALIDAD', ruta: '/calidad',
    que: 'Cargá los resultados del laboratorio: el sistema los compara con la especificación. Después firmá el dictamen.',
    despues: 'Si se aprueba, Depósito puede recibirlo. Si se rechaza, el lote queda bloqueado para siempre.',
  },
  {
    n: 4, titulo: 'Ingresar a depósito', corto: 'Ingreso y cierre', cu: 'CU-P04', rol: 'DEPOSITO', ruta: '/deposito',
    que: 'Controlá lo recibido, armá los pallets y asigná la ubicación en el rack.',
    despues: 'El producto pasa a stock vendible, se imprimen las etiquetas GS1-128 y la orden se cierra.',
  },
];
