/**
 * Marcador de posición para un servicio sin imagen.
 *
 * Sustituye a `'src/assets/examples/tupper.jpg'`, que aparecía escrito a mano
 * como cadena cruda en tres sitios: una ruta que Vite **no** reescribe sin un
 * `import`, de modo que en el sitio construido no resolvía a nada y dejaba el
 * hueco roto. Importar aquel fichero tampoco era la salida: son cuatro megas
 * para tapar un vacío.
 *
 * Un SVG en línea pesa unos cientos de bytes, no viaja por la red y se ve igual
 * en la tarjeta del chat que en la ficha del catálogo.
 */
const SVG = [
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 96 96'>",
  "<rect width='96' height='96' fill='#eef1f4'/>",
  "<circle cx='34' cy='34' r='9' fill='#cbd5dd'/>",
  "<path d='M14 78l25-27 15 15 13-11 19 23z' fill='#cbd5dd'/>",
  '</svg>',
].join('');

export const PLACEHOLDER_IMAGE = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  SVG
)}`;
