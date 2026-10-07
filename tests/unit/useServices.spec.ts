/**
 * `useServices` guardaba el número de registros del backend en una variable
 * privada (`logs`) y solo publicaba `totalPages`. La barra («48 servicios») y
 * el pie («12 de 48 servicios») necesitan la cifra exacta: deducirla de
 * `totalPages × limit` diría 50 donde hay 48.
 *
 * Se corta por `useQuery`, que es la costura limpia: así la prueba no necesita
 * red ni `services-api`, que lee `import.meta.env` y ts-jest no puede compilar
 * a CommonJS.
 */
jest.mock('src/api/services-api', () => ({
  servicesApi: { post: jest.fn() },
  adminServiceApi: { patch: jest.fn() },
}));

jest.mock('@tanstack/vue-query', () => {
  const { ref } = require('vue');
  const data = ref(undefined);
  return {
    useQuery: () => ({
      isLoading: ref(false),
      isFetching: ref(false),
      data,
    }),
    __data: data,
  };
});

import { createPinia, setActivePinia } from 'pinia';
import type { Ref } from 'vue';

import { useServices } from 'src/composables/services/useServices';
import type Service from 'src/interfaces/service';

const consulta = jest.requireMock('@tanstack/vue-query') as {
  __data: Ref<[Service[], number] | undefined>;
};

/** Solo hacen falta el id y el nombre: nadie más mira el resto aquí. */
const SERVICIO = { id: 's1', name: 'Corte de cabello' } as unknown as Service;

beforeEach(() => {
  setActivePinia(createPinia());
  consulta.__data.value = undefined;
});

describe('useServices', () => {
  it('publica el total de registros del backend, no el de la página', () => {
    consulta.__data.value = [[SERVICIO], 48];

    const { totalServices, totalPages } = useServices();

    expect(totalServices.value).toBe(48);
    // 48 entre 10 por página: cinco páginas, la última con ocho.
    expect(totalPages.value).toBe(5);
  });

  it('mientras no hay respuesta no inventa un total', () => {
    const { totalServices, totalPages } = useServices();

    expect(totalServices.value).toBe(0);
    expect(totalPages.value).toBe(1);
  });
});
