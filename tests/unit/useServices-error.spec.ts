/**
 * `useServices` devolvía `isLoading` e `isFetching` (que la página no usaba) y
 * **no** devolvía `error`: por eso no había manera de pintar un fallo de red.
 * Esta prueba fija las tres salidas y, sobre todo, que una recarga de página NO
 * se confunde con una primera carga: `placeholderData: previousData` mantiene
 * las filas anteriores y el esqueleto no debe volver a aparecer.
 */
import { defineComponent, h, nextTick } from 'vue';
import type { Ref } from 'vue';
import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import type Service from 'src/interfaces/service';

// El estado se declara DENTRO de la factoría: `jest.mock` se iza por encima de
// cualquier `const` de este archivo, y referenciarlo desde fuera reventaría.
jest.mock('@tanstack/vue-query', () => {
  const { ref } = require('vue');
  const estado = {
    isLoading: ref(false),
    isFetching: ref(false),
    error: ref(null),
    data: ref(undefined),
  };
  return { useQuery: () => estado };
});

// Lee `import.meta.env`, que ts-jest no compila a CommonJS.
jest.mock('src/api/services-api', () => ({
  servicesApi: { post: jest.fn() },
  adminServiceApi: { post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

import { useQuery } from '@tanstack/vue-query';
import { useServices } from 'src/composables/services/useServices';
import { servicio } from './fixtures/servicios';

type EstadoConsulta = {
  isLoading: Ref<boolean>;
  isFetching: Ref<boolean>;
  error: Ref<Error | null>;
  data: Ref<[Service[], number] | undefined>;
};

const estado = (useQuery as unknown as () => EstadoConsulta)();

function montar() {
  const capturado: { api?: ReturnType<typeof useServices> } = {};
  const wrapper = mount(
    defineComponent({
      setup() {
        capturado.api = useServices();
        return () => h('div');
      },
    }),
    { global: { plugins: [createPinia()] } }
  );
  return { api: capturado.api!, wrapper };
}

beforeEach(() => {
  estado.isLoading.value = false;
  estado.isFetching.value = false;
  estado.error.value = null;
  estado.data.value = undefined;
});

describe('useServices · el error de la consulta', () => {
  it('devuelve los tres banderines que la página necesita', () => {
    const { api } = montar();

    expect(api.isLoading.value).toBe(false);
    expect(api.isFetching.value).toBe(false);
    expect(api.error.value).toBeNull();
  });

  it('entrega el error de la consulta, para poder ofrecer reintentar', () => {
    const { api } = montar();
    const caida = new Error('Network Error');

    estado.error.value = caida;

    expect(api.error.value).toBe(caida);
  });

  it('la primera carga se distingue de una recarga', () => {
    const { api } = montar();

    estado.isLoading.value = true;
    estado.isFetching.value = true;
    expect(api.isLoading.value).toBe(true);

    // Página siguiente: ya hay datos, así que solo está «refetching».
    estado.isLoading.value = false;
    expect(api.isLoading.value).toBe(false);
    expect(api.isFetching.value).toBe(true);
  });

  it('al recargar conserva las filas anteriores en el store', async () => {
    const { api } = montar();

    estado.data.value = [[servicio()], 1];
    await nextTick();

    expect(api.services.value).toHaveLength(1);

    // La página nueva viaja: `data` no cambia (placeholderData) y las filas
    // siguen puestas. Si se vaciaran aquí, la lista parpadearía.
    estado.isFetching.value = true;
    await nextTick();

    expect(api.services.value).toHaveLength(1);
  });

  it('cambiar de página solo toca el filtro de la consulta', () => {
    const { api } = montar();

    api.setPage(3);

    expect(api.filterService.value.page).toBe(3);
  });
});
