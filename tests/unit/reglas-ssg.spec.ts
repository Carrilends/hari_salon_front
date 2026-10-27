/**
 * Reglas que `scripts/verificar-ssg.mjs` aplica al HTML pregenerado (RF62,
 * NF04). Se importa el módulo puro que el script usa de verdad.
 */
import { verificarPaginas } from '../../scripts/reglas-ssg.mjs';

type Bloque = Record<string, unknown>;

function pagina({
  jsonLd = [],
  cuerpo = '',
  conEstado = true,
}: {
  jsonLd?: Bloque[];
  cuerpo?: string;
  conEstado?: boolean;
}): string {
  const scripts = jsonLd
    .map(
      (bloque) =>
        `<script type="application/ld+json">${JSON.stringify(bloque)}</script>`
    )
    .join('');
  const estado = conEstado
    ? '<script>window.__VQ_STATE__={"queries":[]};document.currentScript.remove()</script>'
    : '';
  return `<!DOCTYPE html><html><head>${scripts}${estado}</head><body><div id="q-app">${cuerpo}</div></body></html>`;
}

const CATALOGO: Bloque = {
  '@type': 'ItemList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, item: { '@type': 'Service', name: 'Corte & peinado' } },
  ],
};
const PREGUNTAS: Bloque = {
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: '¿Cuánto dura un corte?',
      acceptedAnswer: { '@type': 'Answer', text: 'Media hora.' },
    },
  ],
};
const RESENAS: Bloque = {
  '@type': 'HairSalon',
  review: [{ '@type': 'Review', reviewBody: 'Quedé muy contenta' }],
};

function buenas() {
  return {
    inicio: pagina({ cuerpo: '<blockquote>«Quedé muy contenta»</blockquote>' }),
    catalogo: pagina({
      jsonLd: [CATALOGO],
      cuerpo: '<h3>Corte &amp; peinado</h3><span>$20.000</span>',
    }),
    testimonios: pagina({
      jsonLd: [RESENAS],
      cuerpo: '<p>Quedé muy contenta</p>',
    }),
    preguntas: pagina({
      jsonLd: [PREGUNTAS],
      cuerpo: '<span>¿Cuánto dura un corte?</span>',
    }),
  };
}

describe('reglas del HTML pregenerado', () => {
  it('unas páginas con sus datos pasan sin errores', () => {
    expect(verificarPaginas(buenas())).toEqual([]);
  });

  it('falla si el JSON-LD del catálogo viene con la lista vacía', () => {
    const paginas = buenas();
    paginas.catalogo = pagina({
      jsonLd: [{ '@type': 'ItemList', itemListElement: [] }],
      cuerpo: '<h3>Corte &amp; peinado</h3>',
    });
    expect(verificarPaginas(paginas).join('\n')).toMatch(/itemListElement/);
  });

  it('falla si el catálogo no pinta el nombre de ningún servicio', () => {
    const paginas = buenas();
    paginas.catalogo = pagina({ jsonLd: [CATALOGO], cuerpo: '<div>Cargando…</div>' });
    expect(verificarPaginas(paginas).join('\n')).toMatch(/catálogo/i);
  });

  it('falla si el catálogo no trae ningún bloque ItemList', () => {
    const paginas = buenas();
    paginas.catalogo = pagina({ cuerpo: '<h3>Corte &amp; peinado</h3>' });
    expect(verificarPaginas(paginas).join('\n')).toMatch(/catálogo/i);
  });

  it('falla si las preguntas vienen vacías', () => {
    const paginas = buenas();
    paginas.preguntas = pagina({
      jsonLd: [{ '@type': 'FAQPage', mainEntity: [] }],
      cuerpo: '<p>Aún no hay preguntas frecuentes.</p>',
    });
    expect(verificarPaginas(paginas).join('\n')).toMatch(/mainEntity|preguntas/);
  });

  it('falla si la pregunta del JSON-LD no está pintada en la página', () => {
    const paginas = buenas();
    paginas.preguntas = pagina({ jsonLd: [PREGUNTAS], cuerpo: '<p></p>' });
    expect(verificarPaginas(paginas).join('\n')).toMatch(/preguntas/i);
  });

  it('falla si las reseñas de Testimonios vienen vacías', () => {
    const paginas = buenas();
    paginas.testimonios = pagina({
      jsonLd: [{ '@type': 'HairSalon', review: [] }],
      cuerpo: '',
    });
    expect(verificarPaginas(paginas).join('\n')).toMatch(/reseña/i);
  });

  it('falla si el inicio no pinta ninguna reseña', () => {
    const paginas = buenas();
    paginas.inicio = pagina({ cuerpo: '<div class="review-band__esqueleto"></div>' });
    expect(verificarPaginas(paginas).join('\n')).toMatch(/inicio/i);
  });

  it('falla si alguna página no trae el estado de Vue Query', () => {
    const paginas = buenas();
    paginas.preguntas = pagina({
      jsonLd: [PREGUNTAS],
      cuerpo: '<span>¿Cuánto dura un corte?</span>',
      conEstado: false,
    });
    expect(verificarPaginas(paginas).join('\n')).toMatch(/__VQ_STATE__/);
  });
});
