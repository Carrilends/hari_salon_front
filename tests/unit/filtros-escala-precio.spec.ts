/**
 * La escala del filtro de precio, fijada a propósito.
 *
 * El control va de 5 a 200 y la etiqueta pinta «5.000 $ ― 200.000 $», pero el
 * cuerpo que viaja a `/service/search` lleva 5 y 200, y el backend hace
 * `s.price BETWEEN 5 AND 200` sobre precios de 15.000 a 250.000: activar el
 * filtro de precio no devuelve nada.
 *
 * Esta suite NO arregla la escala —es una decisión de producto— y existe por
 * dos razones: que la nota ### no se borre de un barrido, y que si alguien
 * cambia 5/200 por 5000/200000 la suite se ponga en rojo y obligue a mirar el
 * DTO del backend (`hair_salon_back/src/service/dto/filter-service.dto.ts`) en
 * el mismo cambio.
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
  it('sigue en miles, como hoy: de 5 a 200', () => {
    expect(PRECIO_ESCALA_MIN).toBe(5);
    expect(PRECIO_ESCALA_MAX).toBe(200);
  });

  it('la discrepancia con el backend queda anotada con el marcador ###', () => {
    expect(FUENTE).toContain('###');
    expect(FUENTE).toMatch(/BETWEEN/);
    expect(FUENTE).toMatch(/MILES/);
  });
});
