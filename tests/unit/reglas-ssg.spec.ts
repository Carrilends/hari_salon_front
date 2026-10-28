/**
 * Reglas que `scripts/verificar-ssg.mjs` aplica al HTML pregenerado (RF62,
 * NF04). Se importa el módulo puro que el script usa de verdad.
 */
import { verificarPaginas } from '../../scripts/reglas-ssg.mjs';

type Bloque = Record<string, unknown>;

type Consulta = { queryKey: unknown[]; state: { data: unknown } };

/** Una consulta deshidratada, con la forma que escribe `dehydrate`. */
const consulta = (queryKey: unknown[], data: unknown): Consulta => ({
  queryKey,
  state: { data },
});

const RESENA_EN_CACHE = consulta(['reviews'], [{ id: 'r1', description: 'Quedé muy contenta' }]);

function pagina({
  jsonLd = [],
  cuerpo = '',
  conEstado = true,
  consultas = [],
}: {
  jsonLd?: Bloque[];
  cuerpo?: string;
  conEstado?: boolean;
  consultas?: Consulta[];
}): string {
  const scripts = jsonLd
    .map(
      (bloque) =>
        `<script type="application/ld+json">${JSON.stringify(bloque)}</script>`
    )
    .join('');
  const estado = conEstado
    ? `<script>window.__VQ_STATE__=${JSON.stringify({
        mutations: [],
        queries: consultas,
      })};document.currentScript.remove()</script>`
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
    inicio: pagina({
      cuerpo: '<blockquote>«Quedé muy contenta»</blockquote>',
      consultas: [RESENA_EN_CACHE],
    }),
    catalogo: pagina({
      jsonLd: [CATALOGO],
      cuerpo: '<h3>Corte &amp; peinado</h3><span>$20.000</span>',
      consultas: [
        consulta(['services', { page: 1 }, 0], [[{ id: 's1', name: 'Corte & peinado' }], 1]),
      ],
    }),
    testimonios: pagina({
      jsonLd: [RESENAS],
      cuerpo: '<p>Quedé muy contenta</p>',
      consultas: [RESENA_EN_CACHE],
    }),
    preguntas: pagina({
      jsonLd: [PREGUNTAS],
      cuerpo: '<span>¿Cuánto dura un corte?</span>',
      consultas: [consulta(['faqs'], [{ id: 'f1', question: '¿Cuánto dura un corte?' }])],
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

  it('falla si el estado de Vue Query va vacío ({"queries":[]})', () => {
    const paginas = buenas();
    paginas.catalogo = pagina({
      jsonLd: [CATALOGO],
      cuerpo: '<h3>Corte &amp; peinado</h3>',
      consultas: [],
    });
    expect(verificarPaginas(paginas).join('\n')).toMatch(/catalogo.*services/);
  });

  it('falla si la consulta esperada viaja sin datos', () => {
    const paginas = buenas();
    paginas.preguntas = pagina({
      jsonLd: [PREGUNTAS],
      cuerpo: '<span>¿Cuánto dura un corte?</span>',
      consultas: [consulta(['faqs'], [])],
    });
    paginas.inicio = pagina({
      cuerpo: '<blockquote>«Quedé muy contenta»</blockquote>',
      consultas: [consulta(['faqs'], [{ id: 'f1' }])],
    });
    const errores = verificarPaginas(paginas).join('\n');
    expect(errores).toMatch(/preguntas.*faqs/);
    expect(errores).toMatch(/inicio.*reviews/);
  });

  it('falla si el catálogo viaja con la lista de servicios vacía', () => {
    const paginas = buenas();
    paginas.catalogo = pagina({
      jsonLd: [CATALOGO],
      cuerpo: '<h3>Corte &amp; peinado</h3>',
      consultas: [consulta(['services', {}, 0], [[], 0])],
    });
    expect(verificarPaginas(paginas).join('\n')).toMatch(/catalogo.*services/);
  });

  it('falla si el estado no es JSON legible', () => {
    const paginas = buenas();
    paginas.testimonios = paginas.testimonios.replace(
      'window.__VQ_STATE__={',
      'window.__VQ_STATE__={roto'
    );
    expect(verificarPaginas(paginas).join('\n')).toMatch(/testimonios.*__VQ_STATE__/);
  });

  it('falla si viaja una consulta que no se precarga (["service",""])', () => {
    const paginas = buenas();
    paginas.catalogo = pagina({
      jsonLd: [CATALOGO],
      cuerpo: '<h3>Corte &amp; peinado</h3>',
      consultas: [
        consulta(['services', {}, 0], [[{ id: 's1' }], 1]),
        consulta(['service', ''], {}),
      ],
    });
    expect(verificarPaginas(paginas).join('\n')).toMatch(
      /catalogo.*no se precargan.*\["service",""\]/
    );
  });
});
