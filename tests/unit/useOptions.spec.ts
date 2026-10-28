/**
 * `useOptions` (géneros y servicios principales del filtro) en el servidor.
 *
 * `options-api` tiene una base relativa (`/api/shared-info`): durante
 * `quasar ssg generate` apuntaría a `localhost:80`. La consulta no es de las
 * que se precargan, así que en el servidor no se lanza (`enabled: false`) y
 * el navegador la pide al montar.
 *
 * El `watch` es `immediate`: si la respuesta ya está en la caché (otra página
 * la pidió; `staleTime: Infinity`), el store la recibe igual.
 */
jest.mock('src/composables/shared/en-servidor', () => ({ EN_SERVIDOR: true }));

jest.mock('src/api/options-api', () => ({ __esModule: true, default: { get: jest.fn() } }));

jest.mock('@tanstack/vue-query', () => {
  const { ref } = require('vue');
  const estado = {
    opciones: [] as Array<Record<string, unknown>>,
    data: ref(undefined),
  };
  return {
    useQuery: (opciones: Record<string, unknown>) => {
      estado.opciones.push(opciones);
      return { isLoading: ref(false), data: estado.data };
    },
    __estado: estado,
  };
});

import { createPinia, setActivePinia } from 'pinia';
import type { Ref } from 'vue';
import { useOptions } from 'src/composables/shared/useOptions';
import { useOptionsStore } from 'src/stores/options-store';

const { __estado: consulta } = jest.requireMock('@tanstack/vue-query') as {
  __estado: {
    opciones: Array<Record<string, unknown>>;
    data: Ref<unknown>;
  };
};

beforeEach(() => {
  setActivePinia(createPinia());
  consulta.opciones.length = 0;
  consulta.data.value = undefined;
});

describe('useOptions', () => {
  it('en el servidor no lanza la consulta (base relativa, sin precarga)', () => {
    useOptions();

    expect(consulta.opciones[0].enabled).toBe(false);
  });

  it('con la respuesta ya en caché, el store la recibe sin esperar a otro cambio', () => {
    consulta.data.value = {
      genders: [{ id: 'g1', name: 'Mujer' }],
      principalParents: [{ id: 'p1', name: 'Cabello' }],
    };

    useOptions();

    const store = useOptionsStore();
    expect(store.genres).toHaveLength(1);
    expect(store.genres[0]).toMatchObject({ id: 'g1', name: 'Mujer' });
  });
});
