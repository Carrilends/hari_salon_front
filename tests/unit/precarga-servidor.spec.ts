/**
 * Las páginas públicas se generan con sus datos (RF62, NF04): en el servidor,
 * el catálogo, las reseñas y las preguntas esperan a su consulta con
 * `onServerPrefetch` antes de pintarse.
 *
 * Se finge el servidor con `EN_SERVIDOR = true` y se captura lo que se registra
 * en `onServerPrefetch`; la consulta se dobla (sin red).
 */
jest.mock('src/composables/shared/en-servidor', () => ({ EN_SERVIDOR: true }));

jest.mock('vue', () => {
  const real = jest.requireActual('vue');
  return { ...real, onServerPrefetch: jest.fn() };
});

jest.mock('src/api/services-api', () => ({
  servicesApi: { post: jest.fn(), get: jest.fn() },
  adminServiceApi: { patch: jest.fn() },
}));

jest.mock('src/api/faqs-api', () => ({
  listarPreguntas: jest.fn(),
  crearPregunta: jest.fn(),
  editarPregunta: jest.fn(),
  borrarPregunta: jest.fn(),
  reordenarPreguntas: jest.fn(),
}));

jest.mock('@tanstack/vue-query', () => {
  const { ref } = require('vue');
  const estado = {
    suspense: jest.fn(),
    opciones: [] as Array<{ meta?: Record<string, unknown> }>,
  };
  return {
    useQuery: (opciones: { meta?: Record<string, unknown> }) => {
      estado.opciones.push(opciones);
      return {
      isLoading: ref(true),
      isPending: ref(true),
      isFetching: ref(true),
      isError: ref(false),
      error: ref(null),
      data: ref(undefined),
      refetch: jest.fn(),
      suspense: estado.suspense,
      };
    },
    useQueryClient: () => ({}),
    useMutation: () => ({}),
    __estado: estado,
  };
});

import { createPinia, setActivePinia } from 'pinia';
import { onServerPrefetch } from 'vue';

import { useServices } from 'src/composables/services/useServices';
import { useReviews } from 'src/composables/reviews/useReviews';
import { useFaqs } from 'src/composables/faqs/useFaqs';
import { useServicesStore } from 'src/stores/service-store';
import type Service from 'src/interfaces/service';

const { __estado: consulta } = jest.requireMock('@tanstack/vue-query') as {
  __estado: {
    suspense: jest.Mock;
    opciones: Array<{ meta?: Record<string, unknown> }>;
  };
};
const registrar = onServerPrefetch as unknown as jest.Mock;

const SERVICIO = { id: 's1', name: 'Corte de prueba' } as unknown as Service;

/** La única precarga que registró el composable. */
function precargaRegistrada(): () => Promise<unknown> {
  expect(registrar).toHaveBeenCalledTimes(1);
  return registrar.mock.calls[0][0];
}

beforeEach(() => {
  setActivePinia(createPinia());
  registrar.mockReset();
  consulta.suspense.mockReset();
  consulta.opciones.length = 0;
});

/** La marca que deja pasar la consulta a `window.__VQ_STATE__`. */
const marcada = () =>
  expect(consulta.opciones[0].meta).toEqual({ precargada: true });

describe('precarga en el servidor', () => {
  it('el catálogo espera su consulta y la deja en el store que pinta la página', async () => {
    consulta.suspense.mockResolvedValue({ data: [[SERVICIO], 7], error: null });

    const { services, totalServices } = useServices();
    await precargaRegistrada()();

    expect(useServicesStore().services).toEqual([SERVICIO]);
    expect(services.value).toEqual([SERVICIO]);
    expect(totalServices.value).toBe(7);
    marcada();
  });

  it('si la API falla, la precarga falla (y con ella la generación)', async () => {
    const caida = new Error('caída');
    consulta.suspense.mockResolvedValue({ data: undefined, error: caida });

    useServices();

    await expect(precargaRegistrada()()).rejects.toBe(caida);
  });

  it('las reseñas esperan su consulta', async () => {
    consulta.suspense.mockResolvedValue({ data: [], error: null });

    useReviews();
    await precargaRegistrada()();

    expect(consulta.suspense).toHaveBeenCalledTimes(1);
    marcada();
  });

  it('las preguntas esperan su consulta', async () => {
    consulta.suspense.mockResolvedValue({ data: [], error: null });

    useFaqs();
    await precargaRegistrada()();

    expect(consulta.suspense).toHaveBeenCalledTimes(1);
    marcada();
  });
});
