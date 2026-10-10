/**
 * La receta de las variantes: qué anchos se generan de cada foto y cómo se
 * llaman los ficheros.
 *
 * Vive aparte de `optimizar-imagenes.mjs` por una razón práctica: aquí no hay
 * `sharp` ni `import.meta`, así que la prueba de unidad puede importar la receta
 * **de verdad** —no una copia— sin arrastrar el binario nativo ni necesitar un
 * Babel que sepa de módulos ES.
 *
 * Es un contrato con el marcado: `FotoResponsiva` construye los `srcset` con
 * estos mismos anchos y este mismo nombrado. Si la receta cambia sin que cambie
 * el marcado, el navegador pide ficheros que no existen.
 */

/** La portada: 678 px en escritorio, a pantalla completa en móvil. */
export const ANCHOS_PORTADA = [420, 760, 1440];

/** Las tarjetas de la carta: 283 px en escritorio, 165 en móvil. */
export const ANCHOS_CARTA = [200, 360, 600];

/** La foto del salón en «¿Quiénes somos?»: 380 px en escritorio, a lo ancho en móvil. */
export const ANCHOS_FICHA = [400, 760];

export const RECETAS = {
  // `women-hair-cut` sale en dos sitios —la portada y la segunda tarjeta de la
  // carta (`src/constants/index-sections.ts`)—, así que su receta es la unión de
  // los dos juegos de anchos. Sin los de la carta, la tarjeta pediría
  // `women-hair-cut-200.webp` y no habría nada que servir.
  'women-hair-cut.jpg': {
    anchos: [...new Set([...ANCHOS_CARTA, ...ANCHOS_PORTADA])].sort((a, b) => a - b),
  },
  'man_hairdress.jpg': { anchos: ANCHOS_CARTA },
  'make-up-face-design.jpg': { anchos: ANCHOS_CARTA },
  'nails-design.jpg': { anchos: ANCHOS_CARTA },
  'salon.jpg': { anchos: ANCHOS_FICHA },
  // Fondo de CSS a pantalla completa: sin `<picture>`, solo un JPEG sensato. No
  // genera variantes numeradas —un `background-image` no las usaría— así que de
  // esta solo sale el respaldo, con su nombre de siempre.
  'rainbow_hair.jpg': { anchos: [1600], soloJpeg: true },
};

export function nombreDeVariante(original, ancho, formato) {
  return `${original.replace(/\.jpe?g$/i, '')}-${ancho}.${formato}`;
}

/** El respaldo que va en el `src` del `<img>`: el JPEG del ancho mayor. */
export function nombreDeRespaldo(original) {
  return original;
}

/**
 * Todos los ficheros que la receta manda que existan en `public/people/`, y
 * ninguno más.
 *
 * Es lo que hace del directorio algo derivado y no un cajón: el script borra lo
 * que no esté aquí, y una prueba compara esta lista con el disco. Un ancho que se
 * quita de la receta no puede dejar atrás un fichero commiteado que ya nadie mira.
 */
export function ficherosEsperados() {
  const esperados = new Set();

  for (const [original, receta] of Object.entries(RECETAS)) {
    // El respaldo, con el nombre de siempre: es el `src` de último recurso y la
    // ruta que usan los fondos de CSS.
    esperados.add(nombreDeRespaldo(original));

    // Un fondo de CSS no puede usar `srcset`, así que no se le generan variantes.
    if (receta.soloJpeg) continue;

    for (const ancho of receta.anchos) {
      esperados.add(nombreDeVariante(original, ancho, 'webp'));
      esperados.add(nombreDeVariante(original, ancho, 'jpg'));
    }
  }

  return esperados;
}
