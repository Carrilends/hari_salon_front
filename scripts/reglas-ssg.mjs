/**
 * Reglas del HTML pregenerado (RF62, NF04): las páginas públicas tienen que
 * salir de `yarn build:ssg` con sus datos, no con un esqueleto ni con un
 * JSON-LD vacío.
 *
 * Módulo puro (sin E/S) para que `tests/unit/reglas-ssg.spec.ts` pruebe las
 * mismas reglas que aplica `scripts/verificar-ssg.mjs`.
 */

/** Las páginas que se revisan, por su ruta dentro de `dist/ssg`. */
export const PAGINAS = {
  inicio: 'index.html',
  catalogo: 'services/index.html',
  testimonios: 'testimonios/index.html',
  preguntas: 'preguntas-frecuentes/index.html',
};

const VACIOS = ['"itemListElement":[]', '"mainEntity":[]', '"review":[]'];

/** Los bloques `application/ld+json` de la página, ya interpretados. */
export function bloquesJsonLd(html) {
  const bloques = [];
  const patron =
    /<script[^>]*type=["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi;
  for (const [, texto] of html.matchAll(patron)) {
    try {
      bloques.push(JSON.parse(texto));
    } catch {
      bloques.push({ '@type': '__ilegible__' });
    }
  }
  return bloques;
}

/** Lo que pinta la aplicación: el contenido de `#q-app`, sin los `<script>`. */
function cuerpo(html) {
  const inicio = html.indexOf('<div id="q-app"');
  const visible = inicio === -1 ? html : html.slice(inicio);
  return visible.replace(/<script[\s\S]*?<\/script>/gi, '');
}

/** Igual que el `escapeHtml` del renderizador de Vue. */
function escaparHtml(texto) {
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function pinta(html, texto) {
  return Boolean(texto) && cuerpo(html).includes(escaparHtml(String(texto).trim()));
}

function delTipo(html, tipo) {
  return bloquesJsonLd(html).filter((bloque) => bloque['@type'] === tipo);
}

/**
 * Devuelve la lista de errores (vacía si todo está en orden).
 *
 * @param {{ inicio: string, catalogo: string, testimonios: string, preguntas: string }} paginas
 * @returns {string[]}
 */
export function verificarPaginas(paginas) {
  const errores = [];

  for (const [nombre, html] of Object.entries(paginas)) {
    if (!html.includes('window.__VQ_STATE__=')) {
      errores.push(`${nombre}: falta window.__VQ_STATE__ (el estado de Vue Query para hidratar).`);
    }
    for (const vacio of VACIOS) {
      if (html.includes(vacio)) {
        errores.push(`${nombre}: JSON-LD vacío (${vacio}).`);
      }
    }
  }

  // Catálogo: un ItemList con servicios, y el primero pintado en la página.
  const listas = delTipo(paginas.catalogo, 'ItemList');
  const servicios = listas.flatMap((lista) => lista.itemListElement ?? []);
  if (!servicios.length) {
    errores.push('catálogo: el JSON-LD no trae ningún servicio (ItemList).');
  } else if (!pinta(paginas.catalogo, servicios[0]?.item?.name)) {
    errores.push(
      `catálogo: no pinta el nombre de ningún servicio («${servicios[0]?.item?.name}»).`
    );
  }

  // Preguntas: un FAQPage con preguntas, y la primera pintada.
  const preguntas = delTipo(paginas.preguntas, 'FAQPage').flatMap(
    (bloque) => bloque.mainEntity ?? []
  );
  if (!preguntas.length) {
    errores.push('preguntas: el JSON-LD no trae ninguna pregunta (mainEntity).');
  } else if (!pinta(paginas.preguntas, preguntas[0]?.name)) {
    errores.push(`preguntas: no pinta la pregunta «${preguntas[0]?.name}».`);
  }

  // Reseñas: Testimonios las trae en su JSON-LD y pinta alguna; el inicio
  // pinta alguna de ellas en su banda.
  const resenas = bloquesJsonLd(paginas.testimonios).flatMap((bloque) =>
    Array.isArray(bloque.review) ? bloque.review : []
  );
  const textos = resenas.map((resena) => resena.reviewBody).filter(Boolean);
  if (!textos.length) {
    errores.push('testimonios: el JSON-LD no trae ninguna reseña.');
  } else {
    if (!textos.some((texto) => pinta(paginas.testimonios, texto))) {
      errores.push('testimonios: no pinta ninguna de sus reseñas.');
    }
    if (!textos.some((texto) => pinta(paginas.inicio, texto))) {
      errores.push('inicio: la banda de reseñas no pinta ninguna reseña.');
    }
  }

  return errores;
}
