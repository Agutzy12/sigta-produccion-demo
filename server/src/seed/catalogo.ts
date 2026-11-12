/**
 * Catálogo de Agrifood Argentina tomado de su sitio web (agrifood-argentina.com/productos.php).
 * Nombres, líneas, presentaciones, vida útil, ingredientes, embalaje y palletizado son los publicados.
 *
 * Lo que la web NO publica y acá es de ejemplo (a validar con la empresa):
 * - códigos internos (COD500, NUE120...) y GTIN,
 * - las cantidades de cada receta (la web lista los ingredientes, no las proporciones),
 * - los valores de especificación de Calidad,
 * - el palletizado de frutos secos y pre elaborados.
 * Seis fichas (zapallo en cubos, nueces 5 kg, pasas 5 kg, arroz 240 g, guiso 8 kg y puré 4,5 kg)
 * se completaron a partir de su presentación hermana porque el sitio no las devolvió al consultarlo.
 */

const WEB = 'https://agrifood-argentina.com';

export type CodigoCategoria = 'DESHIDRATADOS' | 'FRUTOS_SECOS' | 'PRE_ELABORADOS' | 'PRE_MEZCLAS' | 'PASTAS_SECAS';

export const CATEGORIAS: { id: number; codigo: CodigoCategoria; nombre: string; familia: string; url_web: string }[] = [
  { id: 1, codigo: 'DESHIDRATADOS', nombre: 'Línea Deshidratados', familia: 'Línea Tierra', url_web: `${WEB}/linea-deshidratados.php` },
  { id: 2, codigo: 'FRUTOS_SECOS', nombre: 'Línea Frutos Secos', familia: 'Línea Tierra', url_web: `${WEB}/linea-frutos-secos.php` },
  { id: 3, codigo: 'PRE_ELABORADOS', nombre: 'Línea Pre Elaborados', familia: 'Línea Tierra', url_web: `${WEB}/linea-pre-elaborados.php` },
  { id: 4, codigo: 'PRE_MEZCLAS', nombre: 'Línea Pre Mezclas', familia: 'Línea Molino', url_web: `${WEB}/linea-pre-mezclas.php` },
  { id: 5, codigo: 'PASTAS_SECAS', nombre: 'Línea Pastas Secas', familia: 'Línea Molino', url_web: `${WEB}/linea-pastas-secas.php` },
];

/** Líneas de elaboración de la planta. */
export const LINEAS = [
  { id: 1, nombre: 'Línea de mezclado', proceso: 'Dosificado, mezclado y envasado' },
  { id: 2, nombre: 'Línea de pastas', proceso: 'Amasado, extrusión, secado y envasado' },
  { id: 3, nombre: 'Deshidratadora', proceso: 'Lavado, cortado, deshidratado y molienda' },
  { id: 4, nombre: 'Línea de fraccionamiento', proceso: 'Selección y envasado' },
];

/** Especificación de ejemplo para Calidad, por línea (no son límites normativos). */
export const ESPECIFICACION: Record<CodigoCategoria, { humedad_max: number; ph_min: number; ph_max: number; ufc_max: number; linea_id: number }> = {
  DESHIDRATADOS: { humedad_max: 7, ph_min: 5, ph_max: 7, ufc_max: 10000, linea_id: 3 },
  FRUTOS_SECOS: { humedad_max: 18, ph_min: 3.5, ph_max: 7, ufc_max: 10000, linea_id: 4 },
  PRE_ELABORADOS: { humedad_max: 10, ph_min: 5.5, ph_max: 7, ufc_max: 10000, linea_id: 1 },
  PRE_MEZCLAS: { humedad_max: 14, ph_min: 5.5, ph_max: 7.5, ufc_max: 10000, linea_id: 1 },
  PASTAS_SECAS: { humedad_max: 13, ph_min: 5.5, ph_max: 7, ufc_max: 10000, linea_id: 2 },
};

type U = 'kg' | 'un.' | 'rollos';
/** Insumos: [id, código, nombre, tipo, unidad, crítico, stock mínimo] */
export const INSUMOS: [number, string, string, 'MP' | 'ME', U, boolean, number][] = [
  [1, 'MP-HAR000', 'Harina de trigo 000', 'MP', 'kg', true, 1000],
  [2, 'MP-SEMOLA', 'Sémola de trigo candeal', 'MP', 'kg', true, 800],
  [3, 'MP-AZUCAR', 'Azúcar', 'MP', 'kg', true, 200],
  [4, 'MP-SAL', 'Sal fina', 'MP', 'kg', true, 50],
  [5, 'MP-ALMIDON', 'Almidón de maíz', 'MP', 'kg', true, 50],
  [6, 'MP-HUEVO', 'Huevo en polvo', 'MP', 'kg', true, 40],
  [7, 'MP-LECHE', 'Leche entera en polvo', 'MP', 'kg', true, 50],
  [8, 'MP-LEVAD', 'Levadura deshidratada', 'MP', 'kg', true, 15],
  [9, 'MP-LEUD', 'Leudante químico (bicarbonato y fosfato)', 'MP', 'kg', true, 15],
  [10, 'MP-CACAO', 'Cacao en polvo', 'MP', 'kg', true, 30],
  [11, 'MP-GLUCO', 'Glucosa en polvo', 'MP', 'kg', true, 15],
  [12, 'MP-COND', 'Condimentos (perejil, orégano, pimienta, nuez moscada)', 'MP', 'kg', true, 10],
  [13, 'MP-ARROZ', 'Arroz parboil', 'MP', 'kg', true, 300],
  [14, 'MP-LENTE', 'Lentejas', 'MP', 'kg', true, 200],
  [15, 'MP-CEBOL', 'Cebolla deshidratada', 'MP', 'kg', true, 30],
  [16, 'MP-MORRON', 'Pimiento morrón rojo deshidratado', 'MP', 'kg', true, 15],
  [17, 'MP-HARARR', 'Harina de arroz', 'MP', 'kg', true, 30],
  [18, 'MP-MALTO', 'Maltodextrina', 'MP', 'kg', true, 30],
  [19, 'MP-AJOF', 'Ajo fresco', 'MP', 'kg', true, 500],
  [20, 'MP-ESPF', 'Espinaca fresca', 'MP', 'kg', true, 800],
  [21, 'MP-PAPAF', 'Papa fresca', 'MP', 'kg', true, 1000],
  [22, 'MP-ZANAF', 'Zanahoria fresca', 'MP', 'kg', true, 800],
  [23, 'MP-ZAPF', 'Zapallo fresco', 'MP', 'kg', true, 800],
  [24, 'MP-ZAPC', 'Zapallo concentrado', 'MP', 'kg', true, 200],
  [25, 'MP-TOMC', 'Tomate concentrado doble', 'MP', 'kg', true, 300],
  [26, 'MP-NUEZ', 'Nueces peladas a granel', 'MP', 'kg', true, 100],
  [27, 'MP-PASA', 'Pasas de uva morochas a granel', 'MP', 'kg', true, 100],
  [28, 'MP-ARAN', 'Arándanos deshidratados a granel', 'MP', 'kg', true, 80],
  [29, 'MP-PAPAD', 'Papa deshidratada (de planta)', 'MP', 'kg', true, 100],
  [30, 'MP-ZANAD', 'Zanahoria deshidratada (de planta)', 'MP', 'kg', true, 30],
  [31, 'MP-TOMD', 'Tomate deshidratado (de planta)', 'MP', 'kg', true, 30],
  [32, 'MP-ZAPD', 'Zapallo deshidratado (de planta)', 'MP', 'kg', true, 30],
  [33, 'MP-ESPD', 'Espinaca deshidratada (de planta)', 'MP', 'kg', true, 20],
  [34, 'ENV-BOPP', 'Bolsa de polipropileno biorientado impresa 500 g', 'ME', 'un.', true, 1000],
  [35, 'ENV-POUCH', 'Bolsa pouch laminada (consumo)', 'ME', 'un.', true, 500],
  [36, 'ENV-INST', 'Bolsa institucional de polietileno', 'ME', 'un.', true, 50],
  [37, 'ENV-KRAFT', 'Bolsa de papel kraft multipliego con interior de polietileno', 'ME', 'un.', true, 50],
  [38, 'ENV-FLOW', 'Film flow pack 120 g', 'ME', 'un.', true, 1000],
  [39, 'CAJ-24', 'Caja de cartón corrugado x24', 'ME', 'un.', true, 100],
  [40, 'CAJ-10K', 'Caja de cartón 10 kg (frutos secos)', 'ME', 'un.', true, 30],
  [41, 'ETQ-LOTE', 'Etiqueta de lote', 'ME', 'un.', true, 200],
  [42, 'FIL-STR', 'Film estirable para pallets', 'ME', 'rollos', false, 20],
];

/** Partidas de proveedor: [insumo, lote de origen, proveedor, días hasta el vencimiento (null = no vence), remito] */
export const PARTIDAS: [number, string, string, number | null, string][] = [
  [1, 'MF-261001', 'Molinos Florencia SAU', 150, 'REM 00052-00093101'],
  [1, 'MF-261015', 'Molinos Florencia SAU', 165, 'REM 00052-00093180'],
  [1, 'MF-261020', 'Molinos Florencia SAU', 190, 'REM 00052-00093222'],
  [2, 'MF-SC-2610', 'Molinos Florencia SAU', 200, 'REM 00052-00093230'],
  [3, 'AZU-261011', 'Azucarera del Norte S.A.', 450, 'REM-AN-261011'],
  [4, 'SAL-261005', 'Salinas del Centro S.R.L.', 700, 'REM-SC-261005'],
  [5, 'ALM-261003', 'Almidones del Litoral S.A.', 260, 'REM-AL-261003'],
  [6, 'HUE-261007', 'Ovoproductos Pampeanos S.A.', 120, 'REM-OP-261007'],
  [7, 'LEC-261004', 'Lácteos Villa María S.A.', 200, 'REM-LV-261004'],
  [8, 'LEV-261009', 'Levaduras Pampeanas S.A.', 110, 'REM-LP-261009'],
  [9, 'LEU-261002', 'Insumos Panaderos S.R.L.', 300, 'REM-IP-261002'],
  [10, 'CAC-261006', 'Cacao del Plata S.A.', 330, 'REM-CP-261006'],
  [11, 'GLU-261008', 'Insumos Panaderos S.R.L.', 300, 'REM-IP-261008'],
  [12, 'CON-261010', 'Aromas del Campo S.R.L.', 330, 'REM-AC-261010'],
  [13, 'ARR-261012', 'Arrocera Entrerriana S.A.', 300, 'REM-AE-261012'],
  [14, 'LEN-261013', 'Legumbres del Norte S.A.', 300, 'REM-LN-261013'],
  [15, 'CEB-261014', 'Deshidratados de Cuyo S.A.', 330, 'REM-DC-261014'],
  [16, 'MOR-261014', 'Deshidratados de Cuyo S.A.', 330, 'REM-DC-261015'],
  [17, 'HAR-261016', 'Arrocera Entrerriana S.A.', 240, 'REM-AE-261016'],
  [18, 'MAL-261017', 'Almidones del Litoral S.A.', 360, 'REM-AL-261017'],
  // Hortalizas frescas: vencen en pocos días, por eso importa usar primero la que vence antes (FEFO)
  [19, 'AJO-Q-1104', 'Quinta Don Pedro (Colonia Caroya)', 20, 'REM-QDP-1104'],
  [20, 'ESP-H-1109', 'Hortícola Cinturón Verde Córdoba', 3, 'REM-HCV-1109'],
  [20, 'ESP-H-1111', 'Hortícola Cinturón Verde Córdoba', 5, 'REM-HCV-1111'],
  [21, 'PAP-Q-1102', 'Quinta Don Pedro (Colonia Caroya)', 25, 'REM-QDP-1102'],
  [22, 'ZAN-H-1108', 'Hortícola Cinturón Verde Córdoba', 12, 'REM-HCV-1108'],
  [23, 'ZAP-Q-1105', 'Quinta Don Pedro (Colonia Caroya)', 30, 'REM-QDP-1105'],
  [24, 'ZAC-261003', 'Concentrados Mendocinos S.A.', 200, 'REM-CM-261003'],
  [25, 'TOC-261001', 'Concentrados Mendocinos S.A.', 220, 'REM-CM-261001'],
  [26, 'NUE-261018', 'Nogales de Catamarca S.A.', 240, 'REM-NC-261018'],
  [27, 'PAS-261019', 'Viñedos de San Juan S.R.L.', 270, 'REM-VS-261019'],
  [28, 'ARA-261020', 'Berries del Litoral S.A.', 300, 'REM-BL-261020'],
  [29, 'PD-L-2644', 'Planta Agrifood · Deshidratadora', 330, 'TRF-INT-2644'],
  [30, 'ZD-L-2644', 'Planta Agrifood · Deshidratadora', 330, 'TRF-INT-2645'],
  [31, 'TD-L-2644', 'Planta Agrifood · Deshidratadora', 330, 'TRF-INT-2646'],
  [32, 'ZPD-L-2644', 'Planta Agrifood · Deshidratadora', 330, 'TRF-INT-2647'],
  [33, 'ED-L-2644', 'Planta Agrifood · Deshidratadora', 330, 'TRF-INT-2648'],
  [34, 'BOPP-2610', 'Plásticos Industriales S.A.', null, 'REM-PI-2610'],
  [35, 'POU-2610', 'Plásticos Industriales S.A.', null, 'REM-PI-2611'],
  [36, 'INS-2610', 'Plásticos Industriales S.A.', null, 'REM-PI-2612'],
  [37, 'KRA-2610', 'Cartocor S.A.', null, 'REM-CA-2610'],
  [38, 'FLW-2610', 'Plásticos Industriales S.A.', null, 'REM-PI-2613'],
  [39, 'OC1424-CAJ', 'Cartocor S.A.', null, 'OC 1424 · REM-CA-2611'],
  [40, 'CJ10-2610', 'Cartocor S.A.', null, 'REM-CA-2612'],
  [41, 'ETQ-2610', 'Etiquetas del Centro S.A.', null, 'REM-EC-2610'],
  [42, 'FIL-261002', 'Plásticos Industriales S.A.', null, 'REM-PI-261002'],
];

/** Saldo con el que arranca la demo (huevo en polvo y film quedan por debajo del mínimo, a propósito). */
export const SALDOS_FINALES: Record<string, number> = {
  'MF-261001': 600, 'MF-261015': 3000, 'MF-261020': 2500, 'MF-SC-2610': 2400, 'AZU-261011': 600, 'SAL-261005': 300,
  'ALM-261003': 200, 'HUE-261007': 25, 'LEC-261004': 200, 'LEV-261009': 60, 'LEU-261002': 80, 'CAC-261006': 90,
  'GLU-261008': 60, 'CON-261010': 40, 'ARR-261012': 900, 'LEN-261013': 600, 'CEB-261014': 120, 'MOR-261014': 50,
  'HAR-261016': 80, 'MAL-261017': 80, 'AJO-Q-1104': 1400, 'ESP-H-1109': 700, 'ESP-H-1111': 1500, 'PAP-Q-1102': 2500,
  'ZAN-H-1108': 1800, 'ZAP-Q-1105': 1600, 'ZAC-261003': 500, 'TOC-261001': 900, 'NUE-261018': 300, 'PAS-261019': 260,
  'ARA-261020': 200, 'PD-L-2644': 500, 'ZD-L-2644': 120, 'TD-L-2644': 120, 'ZPD-L-2644': 200, 'ED-L-2644': 100,
  'BOPP-2610': 12000, 'POU-2610': 6000, 'INS-2610': 400, 'KRA-2610': 300, 'FLW-2610': 8000, 'OC1424-CAJ': 900,
  'CJ10-2610': 120, 'ETQ-2610': 2000, 'FIL-261002': 12,
};

/** Fórmulas cada 100 kg de producto terminado: [insumo, kg]. La suma mayor a 100 es la merma de proceso. */
const F = {
  pasta: [[2, 70], [1, 31]],
  bizChoco: [[1, 55], [3, 35], [10, 6], [6, 3], [9, 2], [4, 1]],
  bizVaini: [[1, 58], [3, 35], [5, 3], [6, 3], [9, 2], [4, 1]],
  noquis: [[1, 46], [29, 50], [6, 3], [4, 2], [12, 1]],
  pizza: [[1, 95], [8, 2.5], [11, 2], [4, 2.5]],
  arroz: [[13, 70], [29, 6], [30, 5], [31, 4], [32, 4], [15, 3], [4, 3], [16, 2], [33, 1], [5, 2], [12, 2]],
  bunuelos: [[1, 60], [33, 15], [7, 10], [6, 8], [15, 3], [4, 2], [9, 4]],
  lentejas: [[14, 50], [13, 20], [30, 6], [29, 6], [15, 4], [31, 5], [4, 3], [5, 2], [32, 3], [16, 2], [12, 1]],
  pure: [[29, 60], [32, 31], [7, 9], [4, 2]],
  ajo: [[19, 310]],
  espinaca: [[20, 1150]],
  papa: [[21, 520]],
  zanahoria: [[22, 900]],
  zapallo: [[23, 850]],
  zapalloEsc: [[24, 190], [5, 8], [3, 5], [17, 5], [18, 4]],
  tomate: [[25, 310], [3, 5], [17, 5], [18, 5]],
  nuez: [[26, 101]],
  pasa: [[27, 101]],
  arandano: [[28, 101]],
} satisfies Record<string, [number, number][]>;

type Envase = 'BOPP' | 'POUCH' | 'INST' | 'KRAFT' | 'FLOW' | 'GRANEL';
const ENVASE: Record<Envase, number> = { BOPP: 34, POUCH: 35, INST: 36, KRAFT: 37, FLOW: 38, GRANEL: 36 };

const ALM_SECO = 'El producto deberá ser almacenado en su envase original al resguardo de la luz y protegido de factores contaminantes. No requiere refrigeración.';
const ALM_MOLINO = 'El producto deberá ser almacenado en su envase original en un lugar de 25 grados, 60% de humedad y protegido de factores contaminantes.';
const EMB_KRAFT = 'Primario: bolsa cerrada de polietileno de baja densidad. Secundario: bolsa cerrada de papel kraft color marrón multipliego.';
const EMB_PASTA = 'Primario: bolsa cerrada de polietileno de baja densidad. Secundario: bolsa cerrada de polipropileno biorientado 20/20.';
const EMB_POUCH = 'Bolsa pouch laminada con cierre. Se despacha en cajas de cartón corrugado de 24 unidades.';
const EMB_INST = 'Bolsa institucional de polietileno de baja densidad, rotulada con lote y vencimiento.';
const EMB_PREMEZ = 'Primario: bolsa cerrada de polietileno de baja densidad. Secundario: bolsa cerrada de polipropileno OPP + CPP.';
const HARINA = 'Harina de trigo tipo 000 enriquecida según Ley 25.630 (hierro, ácido fólico, tiamina, riboflavina, niacina)';
const ING_PAPA = 'Papa deshidratada (papa fresca, emulsionante: INS 471, estabilizante: INS 450 ii, conservante: INS 223, acidulante: INS 330, antioxidante: INS 321)';
const ING_ZAPALLO = 'zapallo deshidratado (zapallo concentrado, almidón de maíz, azúcar, harina de arroz, vehículo: maltodextrina, regulador de acidez: INS 500 ii)';

export interface DatosProducto {
  id: number; codigo: string; nombre: string; categoria: CodigoCategoria; presentacion: string; presentacion_kg: number;
  unidades_por_caja: number | null; unidades_por_pallet: number; raciones: number | null; url: string; color: string;
  ingredientes: string; alergenos: string | null; almacenamiento: string; embalaje: string; formula: [number, number][]; envase: Envase;
  ph?: [number, number]; humedad_max?: number;
}

const p = (d: Omit<DatosProducto, 'almacenamiento' | 'embalaje'> & { almacenamiento?: string; embalaje?: string }): DatosProducto =>
  ({ almacenamiento: ALM_SECO, embalaje: EMB_KRAFT, ...d });

export const PRODUCTOS: DatosProducto[] = [
  // ---------- Deshidratados (Línea Tierra) ----------
  p({ id: 1, codigo: 'AJOE20', nombre: 'Ajo Deshidratado en Escamas', categoria: 'DESHIDRATADOS', presentacion: '20 kg', presentacion_kg: 20, unidades_por_caja: null, unidades_por_pallet: 40, raciones: null, url: 'deshidratados/ajo-deshidratado-en-escamas', color: 'Blanco cremoso', ingredientes: 'Ajo fresco, bulbo Allium sativum L.', alergenos: null, formula: F.ajo, envase: 'KRAFT' }),
  p({ id: 2, codigo: 'AJOP20', nombre: 'Ajo Deshidratado en Polvo', categoria: 'DESHIDRATADOS', presentacion: '20 kg', presentacion_kg: 20, unidades_por_caja: null, unidades_por_pallet: 40, raciones: null, url: 'deshidratados/ajo-deshidratado-en-polvo', color: 'Blanco cremoso', ingredientes: 'Ajo fresco, bulbo Allium sativum L.', alergenos: null, formula: F.ajo, envase: 'KRAFT' }),
  p({ id: 3, codigo: 'ESPE10', nombre: 'Espinaca Deshidratada en Escamas', categoria: 'DESHIDRATADOS', presentacion: '10 kg', presentacion_kg: 10, unidades_por_caja: null, unidades_por_pallet: 36, raciones: null, url: 'deshidratados/espinaca-deshidratada-en-escamas', color: 'Verde intenso', ingredientes: 'Espinaca fresca, hojas de Spinacea oleracea L.', alergenos: null, formula: F.espinaca, envase: 'KRAFT' }),
  p({ id: 4, codigo: 'ESPP10', nombre: 'Espinaca Deshidratada en Polvo', categoria: 'DESHIDRATADOS', presentacion: '10 kg', presentacion_kg: 10, unidades_por_caja: null, unidades_por_pallet: 36, raciones: null, url: 'deshidratados/espinaca-deshidratada-en-polvo', color: 'Verde intenso', ingredientes: 'Espinaca fresca, hojas de Spinacea oleracea L.', alergenos: null, formula: F.espinaca, envase: 'KRAFT' }),
  p({ id: 5, codigo: 'PAPC20', nombre: 'Papa Deshidratada en Cubos', categoria: 'DESHIDRATADOS', presentacion: '20 kg', presentacion_kg: 20, unidades_por_caja: null, unidades_por_pallet: 40, raciones: null, url: 'deshidratados/papa-deshidratada-en-cubos', color: 'Blanco amarillento', ingredientes: 'Papa fresca, tubérculo Solanum tuberosum.', alergenos: null, formula: F.papa, envase: 'KRAFT' }),
  p({ id: 6, codigo: 'TOME20', nombre: 'Tomate Deshidratado en Escamas', categoria: 'DESHIDRATADOS', presentacion: '20 kg', presentacion_kg: 20, unidades_por_caja: null, unidades_por_pallet: 40, raciones: null, url: 'deshidratados/tomate-deshidratado-en-escamas', color: 'Rojo intenso', ingredientes: 'Tomate concentrado doble, azúcar, harina de arroz, maltodextrina (vehículo), bicarbonato de sodio INS 500 ii (regulador de acidez).', alergenos: null, formula: F.tomate, envase: 'KRAFT', embalaje: 'Primario: bolsa cerrada de polietileno de baja densidad. Secundario: bolsa cerrada plastillera.', ph: [4, 4.8] }),
  p({ id: 7, codigo: 'ZANC20', nombre: 'Zanahoria Deshidratada en Cubo', categoria: 'DESHIDRATADOS', presentacion: '20 kg', presentacion_kg: 20, unidades_por_caja: null, unidades_por_pallet: 40, raciones: null, url: 'deshidratados/zanahoria-deshidratada-en-cubo', color: 'Naranja intenso', ingredientes: 'Zanahoria fresca, raíz de Daucus carota.', alergenos: null, formula: F.zanahoria, envase: 'KRAFT' }),
  p({ id: 8, codigo: 'ZAPC20', nombre: 'Zapallo Deshidratado en Cubos', categoria: 'DESHIDRATADOS', presentacion: '20 kg', presentacion_kg: 20, unidades_por_caja: null, unidades_por_pallet: 40, raciones: null, url: 'deshidratados/zapallo-deshidratada-en-cubos', color: 'Naranja', ingredientes: 'Zapallo fresco, Cucurbita maxima.', alergenos: null, formula: F.zapallo, envase: 'KRAFT' }),
  p({ id: 9, codigo: 'ZAPE20', nombre: 'Zapallo Deshidratado en Escamas', categoria: 'DESHIDRATADOS', presentacion: '20 kg', presentacion_kg: 20, unidades_por_caja: null, unidades_por_pallet: 40, raciones: null, url: 'deshidratados/zapallo-deshidratada-en-escamas', color: 'Naranja', ingredientes: 'Zapallo concentrado, almidón de maíz, azúcar, harina de arroz, maltodextrina (vehículo), bicarbonato de sodio INS 500 ii (regulador de acidez).', alergenos: null, formula: F.zapalloEsc, envase: 'KRAFT' }),

  // ---------- Frutos secos (Línea Tierra): fraccionamiento ----------
  p({ id: 10, codigo: 'ARA120', nombre: 'Arándanos', categoria: 'FRUTOS_SECOS', presentacion: 'Flow Pack 120 g', presentacion_kg: 0.12, unidades_por_caja: 80, unidades_por_pallet: 3200, raciones: null, url: 'frutos-secos/arandanos-120gr', color: 'Rojo oscuro', ingredientes: 'Arándanos deshidratados.', alergenos: null, formula: F.arandano, envase: 'FLOW', embalaje: 'Flow pack de 120 g. Se despachan en cajas de 10 kg.' }),
  p({ id: 11, codigo: 'ARA5K', nombre: 'Arándanos', categoria: 'FRUTOS_SECOS', presentacion: '5 kg', presentacion_kg: 5, unidades_por_caja: null, unidades_por_pallet: 80, raciones: null, url: 'frutos-secos/arandanos-5kg', color: 'Rojo oscuro', ingredientes: 'Arándanos deshidratados.', alergenos: null, formula: F.arandano, envase: 'GRANEL', embalaje: 'Bolsa de polietileno de 5 kg. Se despachan en cajas de 10 kg.' }),
  p({ id: 12, codigo: 'NUE120', nombre: 'Nueces Californianas o Francesas', categoria: 'FRUTOS_SECOS', presentacion: 'Flow Pack 120 g', presentacion_kg: 0.12, unidades_por_caja: 80, unidades_por_pallet: 3200, raciones: null, url: 'frutos-secos/nueces-peladas-120gr', color: 'Mariposa blanca o ámbar', ingredientes: 'Nueces peladas, variedades mariposa blanca, mariposa ámbar y cobriza.', alergenos: 'Contiene frutos secos (nuez).', formula: F.nuez, envase: 'FLOW', humedad_max: 6, embalaje: 'Flow pack de 120 g. Se despachan en cajas de 10 kg.' }),
  p({ id: 13, codigo: 'NUE5K', nombre: 'Nueces Californianas o Francesas', categoria: 'FRUTOS_SECOS', presentacion: '5 kg', presentacion_kg: 5, unidades_por_caja: null, unidades_por_pallet: 80, raciones: null, url: 'frutos-secos/nueces-peladas-5kg', color: 'Mariposa blanca o ámbar', ingredientes: 'Nueces peladas, variedades mariposa blanca, mariposa ámbar y cobriza.', alergenos: 'Contiene frutos secos (nuez).', formula: F.nuez, envase: 'GRANEL', humedad_max: 6, embalaje: 'Bolsa de polietileno de 5 kg. Se despachan en cajas de 10 kg.' }),
  p({ id: 14, codigo: 'PAS120', nombre: 'Pasas de Uvas Morochas', categoria: 'FRUTOS_SECOS', presentacion: 'Flow Pack 120 g', presentacion_kg: 0.12, unidades_por_caja: 80, unidades_por_pallet: 3200, raciones: null, url: 'frutos-secos/pasas-de-uvas-morochas-120gr', color: 'Morado oscuro', ingredientes: 'Pasas de uva morochas.', alergenos: 'Puede contener sulfitos.', formula: F.pasa, envase: 'FLOW', embalaje: 'Flow pack de 120 g. Se despachan en cajas de 10 kg.' }),
  p({ id: 15, codigo: 'PAS5K', nombre: 'Pasas de Uvas Morochas', categoria: 'FRUTOS_SECOS', presentacion: '5 kg', presentacion_kg: 5, unidades_por_caja: null, unidades_por_pallet: 80, raciones: null, url: 'frutos-secos/pasas-de-uvas-morochas-5kg', color: 'Morado oscuro', ingredientes: 'Pasas de uva morochas.', alergenos: 'Puede contener sulfitos.', formula: F.pasa, envase: 'GRANEL', embalaje: 'Bolsa de polietileno de 5 kg. Se despachan en cajas de 10 kg.' }),

  // ---------- Pre elaborados (Línea Tierra) ----------
  p({ id: 16, codigo: 'ARZ240', nombre: 'Arroz con Hortalizas', categoria: 'PRE_ELABORADOS', presentacion: '240 g / 3 raciones', presentacion_kg: 0.24, unidades_por_caja: 24, unidades_por_pallet: 1200, raciones: 3, url: 'pre-elaborados/arroz-con-hortalizas-240gr', color: 'Característico con hortalizas visibles', ingredientes: 'Arroz parboil, papa deshidratada, zanahoria deshidratada, tomate deshidratado, zapallo deshidratado, cebolla deshidratada, sal, pimiento morrón rojo deshidratado, espinaca deshidratada, almidón de maíz, perejil, ajo en polvo, azúcar, pimienta blanca molida, orégano, pimentón y colorante: cúrcuma.', alergenos: null, formula: F.arroz, envase: 'POUCH', embalaje: EMB_POUCH }),
  p({ id: 17, codigo: 'ARZ8K', nombre: 'Arroz con Hortalizas', categoria: 'PRE_ELABORADOS', presentacion: '8 kg / 100 raciones', presentacion_kg: 8, unidades_por_caja: null, unidades_por_pallet: 60, raciones: 100, url: 'pre-elaborados/arroz-con-hortalizas-8kg', color: 'Característico con hortalizas visibles', ingredientes: 'Arroz parboil, papa deshidratada, zanahoria deshidratada, tomate deshidratado, zapallo deshidratado, cebolla deshidratada, sal, pimiento morrón rojo deshidratado, espinaca deshidratada, almidón de maíz, perejil, ajo en polvo, azúcar, pimienta blanca molida, orégano, pimentón y colorante: cúrcuma.', alergenos: null, formula: F.arroz, envase: 'INST', embalaje: EMB_INST }),
  p({ id: 18, codigo: 'BUN200', nombre: 'Buñuelos de Espinaca', categoria: 'PRE_ELABORADOS', presentacion: '200 g / 8 raciones', presentacion_kg: 0.2, unidades_por_caja: 24, unidades_por_pallet: 1200, raciones: 8, url: 'pre-elaborados/bunuelos-espinaca-200gr', color: 'Verde claro', ingredientes: `${HARINA}, espinaca deshidratada, leche entera en polvo, huevo en polvo, sal, cebolla deshidratada, leudante químico: bicarbonato de sodio INS 500 ii.`, alergenos: 'Contiene leche y huevo. Contiene derivados de trigo y soja. Puede contener restos de sulfitos.', formula: F.bunuelos, envase: 'POUCH', embalaje: EMB_POUCH }),
  p({ id: 19, codigo: 'BUN5K', nombre: 'Buñuelos de Espinaca', categoria: 'PRE_ELABORADOS', presentacion: '5 kg / 200 raciones', presentacion_kg: 5, unidades_por_caja: null, unidades_por_pallet: 80, raciones: 200, url: 'pre-elaborados/bunuelos-espinaca-5kg', color: 'Verde claro', ingredientes: `${HARINA}, espinaca deshidratada, leche entera en polvo, huevo en polvo, sal, cebolla deshidratada, leudante químico: bicarbonato de sodio INS 500 ii.`, alergenos: 'Contiene leche y huevo. Contiene derivados de trigo y soja. Puede contener restos de sulfitos.', formula: F.bunuelos, envase: 'INST', embalaje: EMB_INST }),
  p({ id: 20, codigo: 'LEN240', nombre: 'Guiso de Lentejas', categoria: 'PRE_ELABORADOS', presentacion: '240 g / 3 raciones', presentacion_kg: 0.24, unidades_por_caja: 24, unidades_por_pallet: 1200, raciones: 3, url: 'pre-elaborados/guiso-de-lentejas-240gr', color: 'Marrón con hortalizas visibles', ingredientes: 'Lentejas, arroz parboil, zanahoria deshidratada, papa deshidratada, cebolla deshidratada, tomate deshidratado, sal, almidón de maíz, zapallo deshidratado, pimiento morrón rojo deshidratado y orégano.', alergenos: 'Puede contener trigo, huevo, leche y sulfitos.', formula: F.lentejas, envase: 'POUCH', embalaje: EMB_POUCH }),
  p({ id: 21, codigo: 'LEN8K', nombre: 'Guiso de Lentejas', categoria: 'PRE_ELABORADOS', presentacion: '8 kg / 100 raciones', presentacion_kg: 8, unidades_por_caja: null, unidades_por_pallet: 60, raciones: 100, url: 'pre-elaborados/guiso-de-lentejas-8kg', color: 'Marrón con hortalizas visibles', ingredientes: 'Lentejas, arroz parboil, zanahoria deshidratada, papa deshidratada, cebolla deshidratada, tomate deshidratado, sal, almidón de maíz, zapallo deshidratado, pimiento morrón rojo deshidratado y orégano.', alergenos: 'Puede contener trigo, huevo, leche y sulfitos.', formula: F.lentejas, envase: 'INST', embalaje: EMB_INST }),
  p({ id: 22, codigo: 'PUR180', nombre: 'Puré Mixto de Papa y Zapallo', categoria: 'PRE_ELABORADOS', presentacion: '180 g / 6 raciones', presentacion_kg: 0.18, unidades_por_caja: 24, unidades_por_pallet: 1200, raciones: 6, url: 'pre-elaborados/pure-mixto-pure-zapallo-180gr', color: 'Amarillo anaranjado', ingredientes: `${ING_PAPA}, ${ING_ZAPALLO}, leche entera en polvo y sal.`, alergenos: 'Contiene sulfitos, leche y derivados de soja. Puede contener huevo.', formula: F.pure, envase: 'POUCH', embalaje: EMB_POUCH }),
  p({ id: 23, codigo: 'PUR4K', nombre: 'Puré Mixto de Papa y Zapallo', categoria: 'PRE_ELABORADOS', presentacion: '4,5 kg / 150 raciones', presentacion_kg: 4.5, unidades_por_caja: null, unidades_por_pallet: 80, raciones: 150, url: 'pre-elaborados/pure-mixto-pure-zapallo-4kg', color: 'Amarillo anaranjado', ingredientes: `${ING_PAPA}, ${ING_ZAPALLO}, leche entera en polvo y sal.`, alergenos: 'Contiene sulfitos, leche y derivados de soja. Puede contener huevo.', formula: F.pure, envase: 'INST', embalaje: EMB_INST }),

  // ---------- Pre mezclas (Línea Molino) ----------
  p({ id: 24, codigo: 'BIZC500', nombre: 'Bizcochuelo Sabor Chocolate', categoria: 'PRE_MEZCLAS', presentacion: '500 g', presentacion_kg: 0.5, unidades_por_caja: 24, unidades_por_pallet: 600, raciones: null, url: 'pre-mezclas/bizcochuelo-sabor-chocolate-500gr', color: 'Marrón chocolate', ingredientes: `${HARINA}, azúcar, cacao en polvo, huevo en polvo, sal, leudantes químicos: INS 500 ii, aromatizante: aroma artificial a chocolate.`, alergenos: 'Contiene gluten (trigo) y huevo.', formula: F.bizChoco, envase: 'BOPP', almacenamiento: ALM_MOLINO, embalaje: EMB_PREMEZ, humedad_max: 12 }),
  p({ id: 25, codigo: 'BIZV500', nombre: 'Bizcochuelo Sabor Vainilla', categoria: 'PRE_MEZCLAS', presentacion: '500 g', presentacion_kg: 0.5, unidades_por_caja: 24, unidades_por_pallet: 600, raciones: null, url: 'pre-mezclas/bizcochuelo-sabor-vainilla-500gr', color: 'Blanco crema', ingredientes: `${HARINA}, azúcar, almidón de maíz, huevo en polvo, sal, leudantes químicos: INS 500 ii, aromatizante: aroma artificial a vainilla.`, alergenos: 'Contiene gluten (trigo) y huevo.', formula: F.bizVaini, envase: 'BOPP', almacenamiento: ALM_MOLINO, embalaje: EMB_PREMEZ, humedad_max: 12 }),
  p({ id: 26, codigo: 'NOQ500', nombre: 'Ñoquis de Papa Caseros', categoria: 'PRE_MEZCLAS', presentacion: '500 g', presentacion_kg: 0.5, unidades_por_caja: 24, unidades_por_pallet: 600, raciones: null, url: 'pre-mezclas/noquis-de-papa-caseros-500gr', color: 'Blanco crema', ingredientes: `${HARINA}, papa deshidratada, huevo en polvo, nuez moscada, leudantes químicos (bicarbonato de sodio INS 500 ii, fosfato monocálcico INS 341 i), estabilizante (INS 412).`, alergenos: 'Contiene gluten (trigo) y huevo. Contiene sulfitos.', formula: F.noquis, envase: 'BOPP', almacenamiento: ALM_MOLINO, embalaje: EMB_PREMEZ }),
  p({ id: 27, codigo: 'PIZ500', nombre: 'Pizza Casera Premezcla', categoria: 'PRE_MEZCLAS', presentacion: '500 g', presentacion_kg: 0.5, unidades_por_caja: 24, unidades_por_pallet: 600, raciones: null, url: 'pre-mezclas/pizza-casera-premezcla-500gr', color: 'Blanco crema', ingredientes: `${HARINA}, levadura deshidratada, glucosa en polvo, emulsionante (estearoil lactilato de sodio INS 481 i), mejoradores (ácido ascórbico INS 300, amilasa INS 1100, L-cisteína INS 920).`, alergenos: 'Contiene gluten (trigo).', formula: F.pizza, envase: 'BOPP', almacenamiento: ALM_MOLINO, embalaje: EMB_PREMEZ }),

  // ---------- Pastas secas (Línea Molino) ----------
  ...([[28, 'COD500', 'Coditos', 'coditos'], [29, 'SPA500', 'Spaghetti', 'spaghetti'], [30, 'RIG500', 'Rigatoni', 'rigatoni'], [31, 'TIR500', 'Tirabuzon', 'tirabuzon']] as const)
    .map(([id, codigo, nombre, url]) => p({
      id, codigo, nombre, categoria: 'PASTAS_SECAS', presentacion: '500 g', presentacion_kg: 0.5, unidades_por_caja: 24, unidades_por_pallet: 600, raciones: null,
      url: `pastas-secas/${url}-500gr`, color: 'Amarillo ámbar uniforme', ingredientes: 'Sémola de trigo candeal y harina de trigo 000 enriquecida según Ley 25.630, agua.',
      alergenos: 'Contiene gluten (trigo).', formula: F.pasta, envase: 'BOPP', almacenamiento: ALM_MOLINO, embalaje: EMB_PASTA,
    })),
];

/**
 * Receta completa de un producto (cada 100 kg): la fórmula más el empaque de su presentación.
 * Las unidades se calculan con el peso de la presentación (100 kg en paquetes de 500 g = 200 paquetes).
 */
export function recetaDe(prod: DatosProducto): [number, number][] {
  const unidades = 100 / prod.presentacion_kg;
  const items: [number, number][] = [...prod.formula, [ENVASE[prod.envase], Math.round(unidades * 100) / 100]];
  if (prod.unidades_por_caja === 24) items.push([39, Math.round((unidades / 24) * 100) / 100]); // caja x24
  if (prod.categoria === 'FRUTOS_SECOS') items.push([40, 10]); // cajas de 10 kg
  if (prod.presentacion_kg >= 4) items.push([41, Math.round(unidades * 100) / 100]); // una etiqueta por bolsa grande
  items.push([42, Math.round((100 / (prod.presentacion_kg * prod.unidades_por_pallet)) * 100) / 100]); // film para pallets
  return items;
}

export const urlProducto = (prod: DatosProducto) => `${WEB}/productos/${prod.url}.php`;
