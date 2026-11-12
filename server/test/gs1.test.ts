/** Pruebas de las etiquetas logísticas GS1-128 (sin base de datos). */
import { describe, expect, test } from 'vitest';
import { armarGtin13, digitoVerificador, esGtinValido, etiquetaPallet, leerGS1, pesoGS1 } from '../src/services/gs1.js';

describe('GS1-128', () => {
  test('dígito verificador de un GTIN real', () => {
    expect(digitoVerificador('400638133393')).toBe(1); // 4006381333931
    expect(esGtinValido('4006381333931')).toBe(true);
    expect(esGtinValido('4006381333932')).toBe(false);
    expect(esGtinValido(armarGtin13('779123450001'))).toBe(true);
  });

  test('el peso va con 2 decimales implícitos en 6 dígitos', () => {
    expect(pesoGS1(980)).toBe('098000');
    expect(pesoGS1(19.5)).toBe('001950');
    expect(() => pesoGS1(20000)).toThrow();
  });

  test('arma la etiqueta y la vuelve a leer igual', () => {
    const texto = etiquetaPallet('7791234500011', 'L-MRC01-202646-01', new Date('2027-05-12T00:00:00Z'), 500);
    expect(texto).toBe('(01)07791234500011(17)270512(3102)050000(10)L-MRC01-202646-01');
    expect(leerGS1(texto)).toEqual({ gtin: '07791234500011', vencimiento: '2027-05-12', kg: 500, lote: 'L-MRC01-202646-01' });
  });

  test('lee el formato "crudo" de un lector (]C1 y separador GS)', () => {
    const crudo = ']C1010779123450001117270512310205000010L-MRC01-202646-01';
    expect(leerGS1(crudo)).toEqual({ gtin: '07791234500011', vencimiento: '2027-05-12', kg: 500, lote: 'L-MRC01-202646-01' });
    const conSeparador = ']C110L-RMA03-202646-01\u001d17270101';
    expect(leerGS1(conSeparador)).toEqual({ lote: 'L-RMA03-202646-01', vencimiento: '2027-01-01' });
  });

  test('un texto común no se confunde con una etiqueta', () => {
    expect(leerGS1('L-MRC01-202646-01')).toBeNull();
    expect(leerGS1('OP-2026-00128')).toBeNull();
  });
});
