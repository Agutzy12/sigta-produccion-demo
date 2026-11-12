/** Términos del sistema explicados en una frase (se muestran al pasar el mouse y en "Cómo funciona"). */
export const GLOSARIO = {
  sigta: ['SIGTA', 'Sistema Integral de Gestión y Trazabilidad Alimentaria: el software que reemplaza las planillas en papel y Excel de la planta.'],
  op: ['Orden de Producción (OP)', 'Instrucción interna que autoriza a la planta a fabricar una cantidad de un producto con su receta vigente.'],
  receta: ['Receta', 'Cuánto de cada insumo lleva el producto, expresado cada 100 kg. El sistema la escala a la cantidad pedida.'],
  lote: ['Lote', 'Conjunto de bolsas fabricadas en las mismas condiciones (misma orden, turno y materias primas). Tiene un código único.'],
  cuarentena: ['Cuarentena', 'Estado de un lote recién elaborado: está bloqueado y no se puede guardar en depósito ni despachar hasta que Calidad lo libere.'],
  fefo: ['FEFO', '"Primero vence, primero sale": el sistema sugiere usar primero la partida de insumo que vence antes.'],
  partida: ['Partida de insumo', 'Cada entrega de un proveedor (por ejemplo, un camión de harina) con su número de lote y vencimiento.'],
  merma: ['Merma de proceso', 'Lo que se pierde al elaborar: (kg de materias primas consumidos − kg netos obtenidos) ÷ kg consumidos.'],
  rbpm: ['R.BPM.01V01', 'Formulario de control de calidad de la planta (Buenas Prácticas de Manufactura). En SIGTA se completa y firma digitalmente.'],
  ufc: ['UFC/g', 'Unidades formadoras de colonias por gramo: el recuento microbiológico del laboratorio.'],
  dictamen: ['Dictamen', 'Decisión firmada por Calidad: aprobar y liberar el lote, o rechazarlo y bloquearlo. Una vez firmado no se puede cambiar.'],
  bloqueo: ['Bloqueo lógico', 'El sistema impide despachar o guardar un lote que no esté liberado. Lo controla la aplicación y también la base de datos.'],
  pallet: ['Pallet', 'Tarima con hasta 25 bolsas. Cada pallet lleva su etiqueta GS1-128.'],
  gs1: ['GS1-128', 'Código de barras logístico estándar. Guarda el artículo (01), vencimiento (17), peso (3102) y lote (10) en una sola etiqueta.'],
  trazabilidad: ['Trazabilidad', 'Poder reconstruir de dónde vino cada insumo de un lote (hacia atrás) y a qué cliente llegó (hacia adelante).'],
  scrap: ['Rechazada (Scrap)', 'Orden cuyo lote fue rechazado por Calidad: el producto no se puede vender.'],
} as const;

export type ClaveGlosario = keyof typeof GLOSARIO;
