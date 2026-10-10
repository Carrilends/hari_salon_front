/**
 * Testimonios (S1, tablero TestimoniosMuroTinta): banda tinta con la reseña
 * destacada —rota con las reglas del inicio— y la nota; debajo, el muro.
 *
 * `useReviews` se dobla (sin red); `useRotatingReview` es el de verdad, así que
 * la rotación que se prueba aquí es la misma que la del inicio.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { nextTick, unref } from 'vue';
import { mount } from '@vue/test-utils';
import type { ReviewItem } from 'src/api/apiTypes';
import TestimonialsPage from 'src/pages/TestimonialsPage.vue';
import { useReviewDialog } from 'src/composables/reviews/useReviewDialog';
import { useSeo } from 'src/composables/seo/useSeo';

const mockResenas = {
  lista: [] as ReviewItem[],
  cargando: false,
  fallo: false,
  buscando: false,
  refetch: jest.fn(),
};
jest.mock('src/composables/reviews/useReviews', () => {
  const { computed } = jest.requireActual<typeof import('vue')>('vue');
  return {
    useReviews: () => ({
      reviews: computed(() => mockResenas.lista),
      averageScore: computed(() => 0),
      isLoading: computed(() => mockResenas.cargando),
      isError: computed(() => mockResenas.fallo),
      isFetching: computed(() => mockResenas.buscando),
      refetch: mockResenas.refetch,
    }),
  };
});

const mockAuth = { isAdmin: false, isLoggedIn: false };
jest.mock('src/stores/auth-store', () => ({ useAuthStore: () => mockAuth }));
jest.mock('src/composables/seo/useSeo', () => ({ useSeo: jest.fn() }));

const raiz = join(__dirname, '../../src');
const PAGINA = readFileSync(join(raiz, 'pages/TestimonialsPage.vue'), 'utf8');
const TARJETA = readFileSync(
  join(raiz, 'components/testimonios/TarjetaResena.vue'),
  'utf8'
);
const estilos = (fuente: string) => fuente.slice(fuente.indexOf('<style'));

const resena = (n: number, score = 5): ReviewItem => ({
  id: `r${n}`,
  name: `Clienta ${n}`,
  description: `Reseña número ${n}`,
  score,
  createdAt: '2026-05-18T15:00:00.000Z',
});

const stubs = { QPage: { template: '<main><slot /></main>' } };
const montar = () => mount(TestimonialsPage, { global: { stubs } });
const politica = jest.fn();

beforeEach(() => {
  jest.useFakeTimers();
  mockResenas.lista = [resena(1, 5), resena(2, 5), resena(3, 4), resena(4, 4)];
  mockResenas.cargando = false;
  mockResenas.fallo = false;
  mockResenas.buscando = false;
  mockResenas.refetch.mockClear();
  mockAuth.isAdmin = false;
  politica.mockClear();
  useReviewDialog().registrarSolicitud(politica);
  jest.mocked(useSeo).mockClear();
});

afterEach(() => {
  useReviewDialog().registrarSolicitud(null);
  jest.useRealTimers();
});

describe('Testimonios · con reseñas', () => {
  it('destaca la primera reseña con su autora', () => {
    const wrapper = montar();

    expect(wrapper.get('[data-test="cita-destacada"]').text()).toBe(
      'Reseña número 1'
    );
    expect(wrapper.get('[data-test="autor-destacado"]').text()).toContain(
      'Clienta 1'
    );
    expect(wrapper.get('h1').text()).toBe('Testimonios');
  });

  it('la nota: media con coma, total y barras de 5 a 1', () => {
    const wrapper = montar();

    expect(wrapper.get('[data-test="media"]').text()).toBe('4,5');
    expect(wrapper.get('[data-test="total"]').text()).toBe('4 reseñas');
    const barras = wrapper.findAll('[data-test="barra-estrellas"]');
    expect(barras).toHaveLength(5);
    expect(barras[0].text()).toContain('5 estrellas: 2 reseñas');
    expect(barras[4].text()).toContain('1 estrella: 0 reseñas');
  });

  it('el muro pinta una tarjeta por reseña, en el orden de la API', () => {
    const wrapper = montar();
    const nombres = wrapper
      .findAll('[data-test="rejilla"] [data-test="nombre"]')
      .map((n) => n.text());

    expect(nombres).toEqual([
      'Clienta 1',
      'Clienta 2',
      'Clienta 3',
      'Clienta 4',
    ]);
    expect(wrapper.text()).toContain('Más recientes primero');
  });

  it('la destacada rota a los 8 s, como en el inicio', async () => {
    const wrapper = montar();
    await nextTick();

    jest.advanceTimersByTime(8000);
    await nextTick();

    expect(wrapper.get('[data-test="cita-destacada"]').text()).toBe(
      'Reseña número 2'
    );
  });

  it('no rota mientras el puntero está encima', async () => {
    const wrapper = montar();
    await nextTick();

    await wrapper.get('[data-test="zona-destacada"]').trigger('mouseenter');
    jest.advanceTimersByTime(8000 * 3);
    await nextTick();

    expect(wrapper.get('[data-test="cita-destacada"]').text()).toBe(
      'Reseña número 1'
    );
  });
});

describe('Testimonios · estados', () => {
  /** Con SSG este es el HTML publicado: no puede afirmar que no hay reseñas. */
  it('cargando: esqueletos en la banda y en el muro, sin afirmar nada', () => {
    mockResenas.lista = [];
    mockResenas.cargando = true;
    const wrapper = montar();

    expect(wrapper.find('[data-test="destacada-cargando"]').exists()).toBe(
      true
    );
    expect(wrapper.findAll('[data-test="tarjeta-cargando"]')).toHaveLength(6);
    expect(wrapper.text()).not.toContain('Todavía no hay reseñas');
    expect(wrapper.find('[data-test="nota"]').exists()).toBe(false);
  });

  it('sin reseñas: invita a ser la primera y no pinta la nota', () => {
    mockResenas.lista = [];
    const wrapper = montar();

    expect(wrapper.get('[data-test="destacada-vacia"]').text()).toContain(
      'Todavía no hay reseñas publicadas'
    );
    expect(wrapper.find('[data-test="muro-vacio"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="nota"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('Más recientes primero');
  });

  /** Foco de revisión 1. */
  it('si la petición falla, lo dice y deja reintentar; no finge que no hay reseñas', async () => {
    mockResenas.lista = [];
    mockResenas.fallo = true;
    const wrapper = montar();

    expect(wrapper.find('[data-test="destacada-error"]').exists()).toBe(true);
    expect(wrapper.text()).not.toContain('Todavía no hay reseñas');
    expect(wrapper.get('[data-test="muro-error"]').text()).toContain(
      'No pudimos cargar las reseñas'
    );
    await wrapper.get('[data-test="reintentar"]').trigger('click');
    expect(mockResenas.refetch).toHaveBeenCalledTimes(1);
  });

  it('mientras reintenta, «Reintentar» se desactiva y lo anuncia', () => {
    mockResenas.lista = [];
    mockResenas.fallo = true;
    mockResenas.buscando = true;
    const boton = montar().get('[data-test="reintentar"]');

    expect(boton.attributes('disabled')).toBeDefined();
    expect(boton.attributes('aria-busy')).toBe('true');
  });

  /**
   * Con reseñas ya en caché, un refresco fallido pone `isError` pero TanStack
   * conserva `data`: el muro sigue pintando lo que tiene, sin aviso de error.
   */
  it('si falla un refresco con reseñas en caché, el muro las sigue pintando', () => {
    mockResenas.fallo = true;
    const wrapper = montar();

    expect(
      wrapper.findAll('[data-test="rejilla"] [data-test="tarjeta-resena"]')
    ).toHaveLength(4);
    expect(wrapper.find('[data-test="muro-error"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('No pudimos cargar');
    expect(wrapper.get('[data-test="cita-destacada"]').text()).toBe(
      'Reseña número 1'
    );
  });
});

describe('Testimonios · «Deja tu reseña →»', () => {
  it('pide la reseña al armazón (su regla), no abre el diálogo por su cuenta', async () => {
    const wrapper = montar();

    await wrapper.get('[data-test="dejar-resena"]').trigger('click');

    expect(politica).toHaveBeenCalledTimes(1);
    expect(useReviewDialog().abierto.value).toBe(false);
    expect(wrapper.get('[data-test="dejar-resena"]').text()).toBe(
      'Deja tu reseña →'
    );
  });

  it('la dueña no lo ve: ella no deja reseñas', () => {
    mockAuth.isAdmin = true;

    expect(montar().find('[data-test="dejar-resena"]').exists()).toBe(false);
  });

  it('también se ofrece cuando todavía no hay reseñas', () => {
    mockResenas.lista = [];

    expect(montar().find('[data-test="dejar-resena"]').exists()).toBe(true);
  });
});

describe('Testimonios · SEO', () => {
  it('conserva título, ruta y datos estructurados de las reseñas', () => {
    montar();
    const opciones = jest.mocked(useSeo).mock.calls[0][0];

    expect(opciones.title).toBe('Testimonios | Peluquería Marlene');
    expect(opciones.path).toBe('/testimonios');
    expect(unref(opciones.jsonLd)).toMatchObject({
      '@type': 'HairSalon',
      aggregateRating: { reviewCount: 4 },
    });
  });
});

describe('Testimonios · la fuente', () => {
  /** Foco de revisión 2. */
  it('la destacada se recorta a 4 líneas (6 en móvil) y los nombres parten donde haga falta', () => {
    // `break-word` y no `anywhere`: Safari 13.1 (NF06) no tiene `anywhere` (llega en 15.4).
    const css = estilos(PAGINA);

    expect(css).toMatch(/\.testimonios__cita\s*\{[^}]*-webkit-line-clamp: 4;/);
    expect(css).toMatch(/\.testimonios__cita\s*\{[^}]*-webkit-line-clamp: 6;/);
    expect(css).toMatch(
      /\.testimonios__nombre\s*\{[^}]*overflow-wrap: break-word;/
    );
    expect(estilos(TARJETA)).toMatch(
      /\.tarjeta-resena__nombre\s*\{[^}]*overflow-wrap: break-word;/
    );
    expect(estilos(TARJETA)).toMatch(
      /\.tarjeta-resena__texto\s*\{[^}]*overflow-wrap: break-word;/
    );
    expect(PAGINA).not.toMatch(/overflow-wrap: anywhere/);
    expect(TARJETA).not.toMatch(/overflow-wrap: anywhere/);
  });

  it('las comillas son el único rosa de la banda', () => {
    const css = estilos(PAGINA);

    expect(css).toMatch(
      /\.testimonios__comillas\s*\{[^}]*color: var\(--m-rosa\);/
    );
    expect(css.match(/var\(--m-rosa\)/g)).toHaveLength(1);
  });

  it('respeta el movimiento reducido en el cruce de la destacada', () => {
    expect(estilos(PAGINA)).toMatch(
      /@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*testimonios__cruce/
    );
  });

  it('el muro va de 3 a 2 y a 1 columnas', () => {
    const css = estilos(PAGINA);

    expect(css).toMatch(
      /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\);/
    );
    expect(css).toMatch(
      /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/
    );
    expect(css).toMatch(/grid-template-columns: minmax\(0, 1fr\);/);
  });
});
