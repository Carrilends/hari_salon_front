/**
 * Después de hidratar con lo pregenerado (`window.__VQ_STATE__`), el navegador
 * refresca en segundo plano. Si ese refresco falla, la lista pregenerada se
 * queda: Vue Query conserva `data` con `isError`, y las páginas solo pintan el
 * error cuando no hay nada que enseñar (`isError && !faqs.length` en
 * `FaqPage.vue`, `isError && !reviews.length` en `TestimonialsPage.vue`, cuyas
 * suites prueban ese lado con el composable doblado).
 *
 * Aquí se prueba el otro lado con un `QueryClient` de verdad: estado
 * precargado → `hydrate` → refresco que falla → la lista sigue ahí.
 */
const mockListar = jest.fn();
const mockGet = jest.fn();

jest.mock('src/api/faqs-api', () => ({
  listarPreguntas: (...a: unknown[]) => mockListar(...a),
  crearPregunta: jest.fn(),
  editarPregunta: jest.fn(),
  borrarPregunta: jest.fn(),
  reordenarPreguntas: jest.fn(),
}));
jest.mock('src/api/services-api', () => ({
  servicesApi: { get: (...a: unknown[]) => mockGet(...a), post: jest.fn() },
  adminServiceApi: {},
}));

import { mount } from '@vue/test-utils';
import { defineComponent, nextTick } from 'vue';
import { QueryClient, VueQueryPlugin, hydrate } from '@tanstack/vue-query';
import {
  META_PRECARGADA,
  estadoPrecargado,
} from 'src/composables/shared/precargarEnServidor';
import { FAQ_QUERY_KEY, useFaqs } from 'src/composables/faqs/useFaqs';
import { useReviews } from 'src/composables/reviews/useReviews';
import { queryKeys } from 'src/api/query-keys';

const nuevoCliente = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

/** Lo que haría el servidor: precargar y dejar el estado para el HTML. */
async function estadoDelServidor(queryKey: readonly unknown[], datos: unknown) {
  const servidor = nuevoCliente();
  await servidor.fetchQuery({
    queryKey,
    queryFn: () => Promise.resolve(datos),
    meta: META_PRECARGADA,
  });
  return estadoPrecargado(servidor);
}

function montarCon<T>(queryClient: QueryClient, usar: () => T): T {
  let api!: T;
  mount(
    defineComponent({
      setup() {
        api = usar();
        return () => null;
      },
    }),
    { global: { plugins: [[VueQueryPlugin, { queryClient }]] } }
  );
  return api;
}

const esperar = async () => {
  for (let i = 0; i < 5; i++) {
    await Promise.resolve();
    await nextTick();
  }
};

beforeEach(() => {
  mockListar.mockReset();
  mockGet.mockReset();
});

describe('refresco fallido tras hidratar', () => {
  it('Preguntas frecuentes conserva las preguntas pregeneradas', async () => {
    const pregunta = { id: 'f1', question: '¿Q?', answer: 'R.' };
    const cliente = nuevoCliente();
    hydrate(cliente, await estadoDelServidor(FAQ_QUERY_KEY, [pregunta]));
    mockListar.mockRejectedValue(new Error('sin red'));

    const { faqs, isError, refetch } = montarCon(cliente, useFaqs);
    expect(faqs.value).toEqual([pregunta]);

    await refetch();
    await esperar();

    expect(isError.value).toBe(true);
    expect(faqs.value).toEqual([pregunta]);
  });

  it('Testimonios (y el inicio) conservan las reseñas pregeneradas', async () => {
    const resena = { id: 'r1', name: 'Clienta', description: 'Bien', score: 5 };
    const cliente = nuevoCliente();
    hydrate(cliente, await estadoDelServidor(queryKeys.reviews.all, [resena]));
    mockGet.mockRejectedValue(new Error('sin red'));

    const { reviews, isError, refetch } = montarCon(cliente, useReviews);
    expect(reviews.value).toEqual([resena]);

    await refetch();
    await esperar();

    expect(isError.value).toBe(true);
    expect(reviews.value).toEqual([resena]);
  });
});
