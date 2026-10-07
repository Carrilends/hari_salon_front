/**
 * Los campos del filtro, una sola vez.
 *
 * El mismo componente se pinta en el carril (escritorio) y dentro de la hoja
 * (móvil), así que todo lo que decide vive aquí y no en los envoltorios. Lo que
 * de verdad se vigila: que cada cambio escriba en `filters-store` —el estado
 * compartido— y dispare la búsqueda en el acto, sin botón «Aplicar» (D1).
 *
 * `service.helpers` se dobla porque la cadena de imports de `ServicesBox` llega
 * hasta `services-api`, que lee `import.meta.env`, y eso ts-jest no lo compila a
 * CommonJS. Los `stubs` no bastan: el import se iza antes de montar nada.
 */
jest.mock('src/helpers/service.helpers', () => ({
  getChildrenServicesHelper: jest.fn().mockResolvedValue([]),
}));

import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { nextTick } from 'vue';
import ServiceFilterFields from 'src/components/servicePage/ServiceFilterFields.vue';
import { useFiltersStore } from 'src/stores/filters-store';
import { useOptionsStore } from 'src/stores/options-store';
import type { GenresI } from 'src/interfaces/tag';

/** `name` de `GenresI` es una unión cerrada; el doble solo necesita id y nombre. */
const GENEROS = [
  { id: 'g1', name: 'Masculino' },
  { id: 'g2', name: 'Femenino' },
] as unknown as GenresI[];

/**
 * El doble declara sus props a propósito: lo que se comprueba de la categoría
 * es QUÉ se le pasa y QUÉ se hace con lo que emite, no cómo pinta el árbol.
 */
const stubs = {
  ServicesBox: {
    name: 'ServicesBox',
    props: ['initialSelectedIds', 'isEditMode', 'variante', 'sectionTitle', 'containedScroll'],
    emits: ['selectedServices'],
    template: '<div class="caja-doble" />',
  },
};

function montar({ compacto = false, conGeneros = true } = {}) {
  const pinia = createPinia();
  const wrapper = mount(ServiceFilterFields, {
    props: { compacto },
    global: { plugins: [pinia], stubs },
  });
  if (conGeneros) useOptionsStore(pinia).setGenres(GENEROS);
  return { wrapper, pinia };
}

describe('ServiceFilterFields · género', () => {
  it('pinta un chip por género, y son botones de verdad', async () => {
    const { wrapper } = montar();
    await nextTick();

    const chips = wrapper.findAll('[data-test="genero"]');
    expect(chips).toHaveLength(2);
    expect(chips[0].element.tagName).toBe('BUTTON');
    expect(wrapper.text()).toContain('Masculino');
  });

  it('elegir un género lo escribe en el store y dispara la aplicación', async () => {
    const { wrapper, pinia } = montar();
    await nextTick();

    await wrapper.findAll('[data-test="genero"]')[1].trigger('click');

    expect(useFiltersStore(pinia).selectedGenres.map((g) => g.id)).toEqual(['g2']);
    const aplicado = wrapper.emitted('aplicar')?.at(-1)?.[0] as {
      selectedGenres: string[];
    };
    expect(aplicado.selectedGenres).toEqual(['g2']);
  });

  it('admite varios géneros a la vez, y volver a tocar uno lo quita', async () => {
    const { wrapper, pinia } = montar();
    await nextTick();
    const chips = () => wrapper.findAll('[data-test="genero"]');

    await chips()[0].trigger('click');
    await chips()[1].trigger('click');
    expect(useFiltersStore(pinia).selectedGenres).toHaveLength(2);

    await chips()[0].trigger('click');
    expect(useFiltersStore(pinia).selectedGenres.map((g) => g.id)).toEqual(['g2']);
  });

  it('el chip elegido se anuncia pulsado al lector de pantalla', async () => {
    const { wrapper } = montar();
    await nextTick();

    await wrapper.findAll('[data-test="genero"]')[0].trigger('click');
    await nextTick();

    expect(wrapper.findAll('[data-test="genero"]')[0].attributes('aria-pressed')).toBe('true');
    expect(wrapper.findAll('[data-test="genero"]')[1].attributes('aria-pressed')).toBe('false');
  });

  it('emite la cuenta de filtros activos, que alimenta el contador de la barra', async () => {
    const { wrapper } = montar();
    await nextTick();

    await wrapper.findAll('[data-test="genero"]')[0].trigger('click');
    await nextTick();

    expect(wrapper.emitted('cuenta')?.at(-1)?.[0]).toBe(1);
  });

  /**
   * `/filters` puede terminar DESPUÉS del primer montaje. Sin esto, el grupo
   * «Género» se queda vacío para siempre y nadie se enteraría.
   */
  it('repuebla los chips cuando los géneros llegan tarde', async () => {
    const { wrapper, pinia } = montar({ conGeneros: false });
    await nextTick();
    expect(wrapper.findAll('[data-test="genero"]')).toHaveLength(0);

    useOptionsStore(pinia).setGenres(GENEROS);
    await nextTick();
    await nextTick();

    expect(wrapper.findAll('[data-test="genero"]')).toHaveLength(2);
  });

  it('limpiar vacía el store y devuelve la cuenta a cero', async () => {
    const { wrapper, pinia } = montar();
    await nextTick();
    await wrapper.findAll('[data-test="genero"]')[0].trigger('click');

    (wrapper.vm as unknown as { limpiar: () => void }).limpiar();
    await nextTick();

    expect(useFiltersStore(pinia).selectedGenres).toEqual([]);
    expect(useFiltersStore(pinia).selectedServicesIDs).toEqual([]);
    expect(wrapper.emitted('cuenta')?.at(-1)?.[0]).toBe(0);
    expect(wrapper.emitted('limpiar')).toHaveLength(1);
  });

  it('expone «aplicar» para que la hoja pueda mandar el filtro al cerrarse', async () => {
    const { wrapper } = montar();
    await nextTick();
    const antes = wrapper.emitted('aplicar')?.length ?? 0;

    (wrapper.vm as unknown as { aplicar: () => void }).aplicar();

    expect(wrapper.emitted('aplicar')?.length).toBe(antes + 1);
  });
});
