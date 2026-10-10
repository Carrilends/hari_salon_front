/**
 * `useFaqs`: la caché de Vue Query se dobla con un `ref` para ver qué se pinta
 * y cuándo. `faqs-api` se dobla entera (lee `services-api`, que lee
 * `import.meta.env`).
 */
const reordenarApi = jest.fn();
const crearApi = jest.fn();

jest.mock('src/api/faqs-api', () => ({
  listarPreguntas: jest.fn(),
  crearPregunta: (...a: unknown[]) => crearApi(...a),
  editarPregunta: jest.fn(),
  borrarPregunta: jest.fn(),
  reordenarPreguntas: (...a: unknown[]) => reordenarApi(...a),
}));

jest.mock('@tanstack/vue-query', () => {
  const { ref } = require('vue');
  const cache = ref(undefined);
  const cliente = {
    getQueryData: () => cache.value,
    setQueryData: (_clave: unknown, valor: unknown) => {
      cache.value = valor;
    },
    cancelQueries: jest.fn(() => Promise.resolve()),
    invalidateQueries: jest.fn(() => Promise.resolve()),
  };
  return {
    useQuery: () => ({
      data: cache,
      isLoading: ref(false),
      isFetching: ref(false),
      isError: ref(false),
      refetch: jest.fn(),
    }),
    useQueryClient: () => cliente,
    useMutation: (opciones: {
      mutationFn: (v: unknown) => Promise<unknown>;
      onSuccess?: (r: unknown, v: unknown) => unknown;
    }) => ({
      mutateAsync: async (v: unknown) => {
        const r = await opciones.mutationFn(v);
        await opciones.onSuccess?.(r, v);
        return r;
      },
      isPending: ref(false),
    }),
    __cache: cache,
    __cliente: cliente,
  };
});

import type { Ref } from 'vue';
import { flushPromises } from '@vue/test-utils';
import type { FaqItem } from 'src/api/apiTypes';
import { FAQ_QUERY_KEY, useFaqs } from 'src/composables/faqs/useFaqs';
import { PREGUNTAS, idsDe, pregunta } from './fixtures/preguntas';

const consulta = jest.requireMock('@tanstack/vue-query') as {
  __cache: Ref<FaqItem[] | undefined>;
  __cliente: {
    cancelQueries: jest.Mock;
    invalidateQueries: jest.Mock;
  };
};

function diferida<T>() {
  let resolver!: (valor: T) => void;
  let rechazar!: (error: unknown) => void;
  const promesa = new Promise<T>((res, rej) => {
    resolver = res;
    rechazar = rej;
  });
  return { promesa, resolver, rechazar };
}

/** La lista tal como la devolvería el servidor: en ese orden y con puestos 0..n-1. */
const delServidor = (ids: string[]) =>
  ids.map((id, puesto) => ({
    ...PREGUNTAS.find((p) => p.id === id)!,
    sortOrder: puesto,
  }));

const [RESERVAR, CAMBIAR, HORARIO] = idsDe(PREGUNTAS);

beforeEach(() => {
  jest.clearAllMocks();
  consulta.__cache.value = PREGUNTAS;
});

describe('useFaqs · reordenar', () => {
  it('pinta el orden nuevo antes de que conteste el servidor', async () => {
    const respuesta = diferida<FaqItem[]>();
    reordenarApi.mockReturnValue(respuesta.promesa);
    const { faqs, reordenar, guardandoOrden } = useFaqs();

    const guardado = reordenar([HORARIO, RESERVAR, CAMBIAR]);
    await flushPromises();

    expect(idsDe(faqs.value)).toEqual([HORARIO, RESERVAR, CAMBIAR]);
    expect(reordenarApi).toHaveBeenCalledWith([HORARIO, RESERVAR, CAMBIAR]);
    expect(guardandoOrden.value).toBe(true);

    respuesta.resolver(delServidor([HORARIO, RESERVAR, CAMBIAR]));
    await expect(guardado).resolves.toBe(true);
    expect(faqs.value.map((p) => p.sortOrder)).toEqual([0, 1, 2]);
    expect(guardandoOrden.value).toBe(false);
  });

  it('cancela las lecturas en curso antes de pintar', async () => {
    reordenarApi.mockResolvedValue(delServidor([CAMBIAR, RESERVAR, HORARIO]));
    const { reordenar } = useFaqs();

    await reordenar([CAMBIAR, RESERVAR, HORARIO]);

    expect(consulta.__cliente.cancelQueries).toHaveBeenCalledWith({
      queryKey: FAQ_QUERY_KEY,
    });
  });

  it('si el servidor falla, vuelve al orden anterior, lo dice y trae la lista real', async () => {
    reordenarApi.mockRejectedValue(new Error('400'));
    const { faqs, reordenar } = useFaqs();

    await expect(reordenar([HORARIO, CAMBIAR, RESERVAR])).resolves.toBe(false);

    expect(idsDe(faqs.value)).toEqual([RESERVAR, CAMBIAR, HORARIO]);
    expect(consulta.__cliente.invalidateQueries).toHaveBeenCalledWith({
      queryKey: FAQ_QUERY_KEY,
    });
  });

  it('dos movimientos seguidos: un solo PATCH en vuelo y el último orden gana', async () => {
    const primera = diferida<FaqItem[]>();
    const segunda = diferida<FaqItem[]>();
    reordenarApi
      .mockReturnValueOnce(primera.promesa)
      .mockReturnValueOnce(segunda.promesa);
    const { faqs, reordenar } = useFaqs();

    const r1 = reordenar([CAMBIAR, RESERVAR, HORARIO]);
    await flushPromises();
    const r2 = reordenar([CAMBIAR, HORARIO, RESERVAR]);
    await flushPromises();

    expect(reordenarApi).toHaveBeenCalledTimes(1);
    expect(idsDe(faqs.value)).toEqual([CAMBIAR, HORARIO, RESERVAR]);

    // Vuelve el primero: la respuesta vieja no pisa la pintura nueva.
    primera.resolver(delServidor([CAMBIAR, RESERVAR, HORARIO]));
    await flushPromises();
    expect(idsDe(faqs.value)).toEqual([CAMBIAR, HORARIO, RESERVAR]);
    expect(reordenarApi).toHaveBeenCalledTimes(2);
    expect(reordenarApi).toHaveBeenLastCalledWith([CAMBIAR, HORARIO, RESERVAR]);

    segunda.resolver(delServidor([CAMBIAR, HORARIO, RESERVAR]));
    await expect(r1).resolves.toBe(true);
    await expect(r2).resolves.toBe(true);
    expect(idsDe(faqs.value)).toEqual([CAMBIAR, HORARIO, RESERVAR]);
  });

  it('si falla el segundo, vuelve a lo que el servidor ya confirmó, no al principio', async () => {
    const primera = diferida<FaqItem[]>();
    reordenarApi
      .mockReturnValueOnce(primera.promesa)
      .mockRejectedValueOnce(new Error('red'));
    const { faqs, reordenar } = useFaqs();

    const r1 = reordenar([CAMBIAR, RESERVAR, HORARIO]);
    await flushPromises();
    void reordenar([CAMBIAR, HORARIO, RESERVAR]);
    await flushPromises();
    primera.resolver(delServidor([CAMBIAR, RESERVAR, HORARIO]));

    await expect(r1).resolves.toBe(false);
    expect(idsDe(faqs.value)).toEqual([CAMBIAR, RESERVAR, HORARIO]);
  });
});

describe('useFaqs · lo de siempre', () => {
  it('expone la lista de la caché y el estado de error', () => {
    const { faqs, isError } = useFaqs();

    expect(idsDe(faqs.value)).toEqual([RESERVAR, CAMBIAR, HORARIO]);
    expect(isError.value).toBe(false);
  });

  it('sin datos todavía, la lista es vacía', () => {
    consulta.__cache.value = undefined;

    expect(useFaqs().faqs.value).toEqual([]);
  });

  it('crear pasa por faqs-api y vuelve a pedir la lista', async () => {
    const nueva = pregunta('p-nueva', '¿Hay parqueadero?', 3);
    crearApi.mockResolvedValue(nueva);
    const cuerpo = { question: '¿Hay parqueadero?', answer: 'Sí, en la calle.' };

    await useFaqs().createFaqMutation.mutateAsync(cuerpo);

    expect(crearApi).toHaveBeenCalledWith(cuerpo);
    expect(consulta.__cliente.invalidateQueries).toHaveBeenCalledWith({
      queryKey: FAQ_QUERY_KEY,
    });
  });
});
