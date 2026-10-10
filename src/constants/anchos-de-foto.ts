/**
 * Los anchos en que se sirven las fotos de `public/people/`, para el `srcset` de
 * `FotoResponsiva`.
 *
 * Son los mismos que genera `scripts/recetas-imagenes.mjs`, y tienen que seguir
 * siéndolo: un ancho que el marcado pide y la receta no genera es un hueco roto
 * en la página. Los dos módulos existen por separado porque el script corre en
 * Node con `sharp` y esto viaja al navegador; la costura la cose
 * `tests/unit/optimizar-imagenes.spec.ts`, que compara los dos.
 */

/** La portada: 678 px en escritorio, a pantalla completa en móvil. */
export const ANCHOS_PORTADA = [420, 760, 1440];

/** Las tarjetas de la carta: 283 px en escritorio, 165 en móvil. */
export const ANCHOS_CARTA = [200, 360, 600];

/** La foto del salón en «¿Quiénes somos?»: 380 px en escritorio, a lo ancho en móvil. */
export const ANCHOS_FICHA = [400, 760];
