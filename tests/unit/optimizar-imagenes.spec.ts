/**
 * El script es la única fuente de las variantes, así que su receta es un
 * contrato: el marcado de las bandas pide exactamente estos anchos y estos
 * nombres. Si la receta cambia sin que cambie el marcado, el navegador pide
 * ficheros que no existen.
 *
 * No se ejecuta `sharp` aquí: convertir seis fotos tarda segundos y la suite de
 * unidad no es sitio. Lo que se fija es la receta y el nombrado, importados del
 * módulo que el script usa de verdad (`scripts/recetas-imagenes.mjs`), no de una
 * copia que podría quedarse atrás.
 */
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

import {
  ANCHOS_CARTA as ANCHOS_CARTA_MARCADO,
  ANCHOS_PORTADA as ANCHOS_PORTADA_MARCADO,
} from 'src/constants/anchos-de-foto';

import {
  ANCHOS_CARTA,
  ANCHOS_PORTADA,
  RECETAS,
  ficherosEsperados,
  nombreDeVariante,
} from '../../scripts/recetas-imagenes.mjs';

describe('la receta de las variantes', () => {
  it('cubre las cinco fotos que quedan', () => {
    expect(Object.keys(RECETAS).sort()).toEqual([
      'make-up-face-design.jpg',
      'man_hairdress.jpg',
      'nails-design.jpg',
      'rainbow_hair.jpg',
      'women-hair-cut.jpg',
    ]);
  });

  it('la portada llega a 1440 px, que es lo que pide una pantalla de 2x', () => {
    expect(ANCHOS_PORTADA).toEqual([420, 760, 1440]);
    for (const ancho of ANCHOS_PORTADA) {
      expect(RECETAS['women-hair-cut.jpg'].anchos).toContain(ancho);
    }
  });

  it('las de la carta se quedan en 600: se pintan a 283', () => {
    expect(ANCHOS_CARTA).toEqual([200, 360, 600]);
    expect(RECETAS['man_hairdress.jpg'].anchos).toEqual(ANCHOS_CARTA);
    expect(RECETAS['make-up-face-design.jpg'].anchos).toEqual(ANCHOS_CARTA);
    expect(RECETAS['nails-design.jpg'].anchos).toEqual(ANCHOS_CARTA);
  });

  /**
   * `women-hair-cut.jpg` es la única que sirve a dos sitios —la portada a 678 px
   * y la segunda tarjeta de la carta a 283 (`src/constants/index-sections.ts`)—,
   * así que su receta tiene que cubrir los anchos de los dos consumidores. Sin
   * esto, la carta pediría `women-hair-cut-200.webp`, que no existiría.
   */
  it('la de la portada cubre además los anchos de la carta: sale en las dos', () => {
    for (const ancho of ANCHOS_CARTA) {
      expect(RECETAS['women-hair-cut.jpg'].anchos).toContain(ancho);
    }
  });

  /**
   * El script y el marcado son dos mundos —Node y el navegador— y cada uno
   * necesita su módulo: el del script no puede llevar `sharp` al paquete del
   * cliente. Lo que no puede pasar es que se separen: si el marcado pide un
   * ancho que la receta no genera, el navegador se queda con un hueco roto. Esta
   * prueba es la costura.
   */
  it('el marcado pide exactamente los anchos que el script genera', () => {
    expect(ANCHOS_PORTADA_MARCADO).toEqual(ANCHOS_PORTADA);
    expect(ANCHOS_CARTA_MARCADO).toEqual(ANCHOS_CARTA);
  });

  /**
   * La prueba de arriba compara dos listas de números entre sí, y eso deja fuera
   * el fallo más probable: cambiar la receta y olvidar `yarn optimizar:imagenes`.
   * Esto mira el disco.
   *
   * Y mira en los dos sentidos. Que no falte ninguno, porque un `<source>` que
   * apunta a un WebP que no está **no cae al JPEG** —cuando el navegador ya eligió
   * una fuente, el `src` del `<img>` no se vuelve a consultar— y la portada entera
   * se queda en texto alternativo. Y que no sobre ninguno, porque un ancho que se
   * quita de la receta deja un fichero commiteado y desplegado que ya nadie mira:
   * exactamente el peso muerto que la Tarea 1 existe para evitar.
   */
  it('en public/people está exactamente lo que la receta manda, ni más ni menos', () => {
    const enDisco = readdirSync(join(__dirname, '../../public/people'))
      .filter((f) => /\.(jpe?g|webp)$/i.test(f))
      .sort();

    expect(enDisco).toEqual([...ficherosEsperados()].sort());
  });

  it('nombra las variantes de forma predecible', () => {
    expect(nombreDeVariante('women-hair-cut.jpg', 760, 'webp')).toBe(
      'women-hair-cut-760.webp'
    );
    expect(nombreDeVariante('women-hair-cut.jpg', 760, 'jpg')).toBe(
      'women-hair-cut-760.jpg'
    );
  });
});
