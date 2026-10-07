/**
 * El carril de filtros: lo que en escritorio sustituye al diálogo (D1).
 *
 * Lo que de verdad se vigila es que el carril decida por sí mismo si le toca
 * pintarse. Si la decisión viviera en la página, un día habría un ancho con
 * carril y hoja a la vez —dos sitios escribiendo el mismo filtro— y eso no se
 * nota en una prueba, se nota en el navegador.
 */
jest.mock('src/helpers/service.helpers', () => ({
  getChildrenServicesHelper: jest.fn().mockResolvedValue([]),
}));

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { useFiltersStore } from 'src/stores/filters-store';
import ServiceFilterRail from 'src/components/servicePage/ServiceFilterRail.vue';
import { fijarViewport } from '../viewportMock';

const FUENTE = readFileSync(
  join(__dirname, '../../src/components/servicePage/ServiceFilterRail.vue'),
  'utf8'
);

const limpiado = jest.fn();

const stubs = {
  ServiceFilterFields: {
    name: 'ServiceFilterFields',
    props: ['compacto'],
    emits: ['aplicar', 'cuenta', 'limpiar'],
    template: '<div class="campos-doble" />',
    methods: {
      limpiar: limpiado,
      aplicar: () => undefined,
    },
  },
};

const montar = () =>
  mount(ServiceFilterRail, { global: { plugins: [createPinia()], stubs } });

beforeEach(() => limpiado.mockReset());

describe('ServiceFilterRail', () => {
  it('se pinta desde 1024 px', () => {
    fijarViewport({ ancho: 1024 });

    expect(montar().find('[data-test="carril-filtros"]').exists()).toBe(true);
  });

  it('no se pinta por debajo de 1024 px: ahí manda la hoja', () => {
    fijarViewport({ ancho: 1023 });

    expect(montar().find('[data-test="carril-filtros"]').exists()).toBe(false);
  });

  it('aparece y desaparece cuando la ventana cambia de tamaño', async () => {
    const viewport = fijarViewport({ ancho: 1280 });
    const wrapper = montar();
    expect(wrapper.find('[data-test="carril-filtros"]').exists()).toBe(true);

    viewport.cambiar({ ancho: 800 });
    await wrapper.vm.$nextTick();

    expect(wrapper.find('[data-test="carril-filtros"]').exists()).toBe(false);
  });

  it('lleva los campos sin compactar: aquí se apunta con un ratón', () => {
    fijarViewport({ ancho: 1280 });

    expect(
      montar().getComponent({ name: 'ServiceFilterFields' }).props('compacto')
    ).toBe(false);
  });

  it('pasa hacia arriba el filtro y la cuenta que le dan los campos', () => {
    fijarViewport({ ancho: 1280 });
    const wrapper = montar();
    const campos = wrapper.getComponent({ name: 'ServiceFilterFields' });
    const filtro = {
      selectedGenres: ['g1'],
      selectedServicesIDs: [],
      includePriceRange: false,
      includePromotionsOnly: false,
      prices: { min: 5, max: 200 },
    };

    campos.vm.$emit('aplicar', filtro);
    campos.vm.$emit('cuenta', 3);

    expect(wrapper.emitted('aplicar')?.[0]).toEqual([filtro]);
    expect(wrapper.emitted('update:amount')?.[0]).toEqual([3]);
  });

  it('avisa al montar de los filtros que ya estaban en el store', () => {
    fijarViewport({ ancho: 1280 });
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useFiltersStore();
    store.includePromotionsOnly = true;
    store.setSelectedServiceIds(['s1', 's2']);

    const wrapper = mount(ServiceFilterRail, {
      global: { plugins: [pinia], stubs },
    });

    expect(wrapper.emitted('update:amount')?.[0]).toEqual([3]);
  });

  it('no avisa al montar si no hay filtros', () => {
    fijarViewport({ ancho: 1280 });

    expect(montar().emitted('update:amount')).toBeUndefined();
  });

  it('no trae botón de aplicar: cada cambio se aplica solo', () => {
    fijarViewport({ ancho: 1280 });

    expect(montar().find('[data-test="aplicar"]').exists()).toBe(false);
    expect(FUENTE).not.toMatch(/Aplicar filtro/);
  });

  it('«Limpiar» es un botón de verdad y está en la cabecera', () => {
    fijarViewport({ ancho: 1280 });
    const limpiar = montar().get('[data-test="limpiar"]');

    expect(limpiar.element.tagName).toBe('BUTTON');
    expect(limpiar.text()).toBe('Limpiar');
  });

  it('«Limpiar» vacía los campos, no solo el aspecto del carril', async () => {
    fijarViewport({ ancho: 1280 });
    const wrapper = montar();

    await wrapper.get('[data-test="limpiar"]').trigger('click');

    expect(limpiado).toHaveBeenCalledTimes(1);
  });

  it('el icono es de reguladores, no un embudo', () => {
    // El embudo (`la-filter` / `filter_alt`) es el icono relleno de Material que
    // desentona con el resto del portal, que es todo trazo fino.
    expect(FUENTE).not.toMatch(/la-filter|filter_alt|funnel/i);
    expect(FUENTE).toContain('stroke="currentColor"');
  });

  it('se anuncia como una región con nombre', () => {
    fijarViewport({ ancho: 1280 });
    const carril = montar().get('[data-test="carril-filtros"]');

    expect(carril.element.tagName).toBe('ASIDE');
    expect(carril.attributes('aria-label')).toMatch(/filtros/i);
  });

  it('mide 226 px y se separa de la lista con un filete, no con una caja', () => {
    expect(FUENTE).toContain('226px');
    expect(FUENTE).toMatch(/border-right:\s*var\(--m-filete-grosor\)/);
  });
});
