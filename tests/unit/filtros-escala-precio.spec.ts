/**
 * La escala del filtro de precio, fijada a propósito.
 *
 * El control va de 5 a 300 y la etiqueta pinta «5.000 $ ― 300.000 $»; el
 * cuerpo que viaja a `/service/search` lleva 5 y 300, y el backend lo pasa a
 * pesos (`hair_salon_back/src/service/precio-filtro.ts`, ×1000) antes de
 * hacer `s.price BETWEEN :min AND :max`.
 *
 * Las dos mitades del contrato viven en repositorios distintos: si alguien
 * cambia 5/300 por pesos completos aquí, esta suite se pone en rojo y obliga a
 * mirar la constante del backend en el mismo cambio.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  PRECIO_ESCALA_MAX,
  PRECIO_ESCALA_MIN,
} from 'src/stores/filters-store';

const FUENTE = readFileSync(
  join(__dirname, '../../src/stores/filters-store.ts'),
  'utf8'
);

describe('escala del filtro de precio', () => {
  it('sigue en miles: de 5 a 300', () => {
    expect(PRECIO_ESCALA_MIN).toBe(5);
    expect(PRECIO_ESCALA_MAX).toBe(300);
  });

  it('la conversión del backend queda señalada junto a la escala', () => {
    expect(FUENTE).toMatch(/MILES/);
    expect(FUENTE).toContain('precio-filtro.ts');
    expect(FUENTE).toContain('PESOS_POR_UNIDAD_DE_FILTRO');
  });
});
