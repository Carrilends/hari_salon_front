/**
 * Una sola fuente para «cuántos filtros hay»: `filtersStore.cantidadFiltros`.
 *
 * Con el store real las dos sumas darían lo mismo y la prueba no distinguiría
 * nada; por eso el store se dobla con una cifra que NINGUNA suma a mano puede
 * dar (7, con todas las listas vacías). Si el carril o el composable vuelven a
 * sumar por su cuenta, devolverán 0 y esto cae.
 */
jest.mock('src/helpers/service.helpers', () => ({
  getChildrenServicesHelper: jest.fn().mockResolvedValue([]),
}));

jest.mock('src/stores/filters-store', () => {
  const real = jest.requireActual('src/stores/filters-store');
  return {
    ...real,
    useFiltersStore: () => ({
      selectedGenres: [],
      selectedServicesIDs: [],
      includePriceRange: false,
      includePromotionsOnly: false,
      prices: { min: 0, max: 0 },
      cantidadFiltros: 7,
      limpiarFiltros: () => undefined,
      clearSelectedServices: () => undefined,
    }),
  };
});

import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import ServiceFilterRail from 'src/components/servicePage/ServiceFilterRail.vue';
import { useFilterService } from 'src/composables/dialogs/useServiceFilter';
import { fijarViewport } from '../viewportMock';

const stubs = {
  ServiceFilterFields: {
    name: 'ServiceFilterFields',
    props: ['compacto'],
    emits: ['aplicar', 'cuenta', 'limpiar'],
    template: '<div />',
    methods: { limpiar: () => undefined },
  },
};

describe('una sola cuenta de filtros', () => {
  it('el carril avisa al montar con la cifra del store', () => {
    fijarViewport({ ancho: 1280 });
    const wrapper = mount(ServiceFilterRail, {
      global: { plugins: [createPinia()], stubs },
    });

    expect(wrapper.emitted('update:amount')?.[0]).toEqual([7]);
  });

  it('useFilterService cuenta con la cifra del store', () => {
    setActivePinia(createPinia());
    const { amountOfFilters } = useFilterService((() => undefined) as never);

    expect(amountOfFilters.value).toBe(7);
  });
});
