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

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
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

describe('ServiceFilterFields · precio y promociones', () => {
  const marcar = (campo: ReturnType<typeof montar>['wrapper'], test: string, valor: boolean) => {
    const casilla = campo.get(`[data-test="${test}"]`);
    (casilla.element as HTMLInputElement).checked = valor;
    return casilla.trigger('change');
  };

  it('el rango solo aparece cuando se activa el precio', async () => {
    const { wrapper } = montar();
    expect(wrapper.find('[data-test="precio-min"]').exists()).toBe(false);

    await marcar(wrapper, 'precio-activo', true);

    expect(wrapper.find('[data-test="precio-min"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="precio-max"]').exists()).toBe(true);
  });

  it('activar el precio lo escribe en el store y dispara la aplicación', async () => {
    const { wrapper, pinia } = montar();

    await marcar(wrapper, 'precio-activo', true);

    expect(useFiltersStore(pinia).includePriceRange).toBe(true);
    const aplicado = wrapper.emitted('aplicar')?.at(-1)?.[0] as {
      includePriceRange: boolean;
    };
    expect(aplicado.includePriceRange).toBe(true);
  });

  it('precio y promociones se deshabilitan mutuamente', async () => {
    const { wrapper } = montar();

    await marcar(wrapper, 'precio-activo', true);
    expect(wrapper.get('[data-test="promos-activo"]').attributes('disabled')).toBeDefined();

    await marcar(wrapper, 'precio-activo', false);
    await marcar(wrapper, 'promos-activo', true);
    expect(wrapper.get('[data-test="precio-activo"]').attributes('disabled')).toBeDefined();
  });

  it('activar uno apaga el otro en el mismo cuerpo, no en el siguiente', async () => {
    // El backend los trata como excluyentes (§6.8): mandar los dos a true sería
    // un cuerpo que no significa nada.
    //
    // El estado de partida se pone en el store, no con un clic, porque así es
    // como llega de verdad: lo dejó la OTRA superficie (la hoja, antes de
    // ensanchar la ventana) y aquí la casilla ya nace deshabilitada. Lo que se
    // comprueba es que el apagado sea síncrono, no que el `watch` lo arregle
    // en el ciclo siguiente — cuando `sendFilter` ya habría salido.
    const { wrapper, pinia } = montar();
    useFiltersStore(pinia).includePromotionsOnly = true;

    await marcar(wrapper, 'precio-activo', true);

    const aplicado = wrapper.emitted('aplicar')?.at(-1)?.[0] as {
      includePriceRange: boolean;
      includePromotionsOnly: boolean;
    };
    expect(aplicado.includePriceRange).toBe(true);
    expect(aplicado.includePromotionsOnly).toBe(false);
  });

  it('pinta el rango en pesos, con los tres ceros que el control no tiene', async () => {
    const { wrapper } = montar();
    await marcar(wrapper, 'precio-activo', true);

    expect(wrapper.get('[data-test="precio-valor"]').text()).toBe('5.000 $ ― 200.000 $');
  });

  it('el mínimo no puede pasarse del máximo', async () => {
    const { wrapper, pinia } = montar();
    await marcar(wrapper, 'precio-activo', true);
    const maximo = wrapper.get('[data-test="precio-max"]');
    (maximo.element as HTMLInputElement).value = '60';
    await maximo.trigger('input');

    const minimo = wrapper.get('[data-test="precio-min"]');
    (minimo.element as HTMLInputElement).value = '120';
    await minimo.trigger('input');
    await minimo.trigger('change');

    expect(useFiltersStore(pinia).prices).toEqual({ min: 60, max: 60 });
    const aplicado = wrapper.emitted('aplicar')?.at(-1)?.[0] as {
      prices: { min: number; max: number };
    };
    expect(aplicado.prices.min).toBeLessThanOrEqual(aplicado.prices.max);
  });

  it('el máximo no puede caer por debajo del mínimo', async () => {
    const { wrapper, pinia } = montar();
    await marcar(wrapper, 'precio-activo', true);
    const minimo = wrapper.get('[data-test="precio-min"]');
    (minimo.element as HTMLInputElement).value = '80';
    await minimo.trigger('input');

    const maximo = wrapper.get('[data-test="precio-max"]');
    (maximo.element as HTMLInputElement).value = '20';
    await maximo.trigger('input');
    await maximo.trigger('change');

    expect(useFiltersStore(pinia).prices).toEqual({ min: 80, max: 80 });
    const aplicado = wrapper.emitted('aplicar')?.at(-1)?.[0] as {
      prices: { min: number; max: number };
    };
    expect(aplicado.prices).toEqual({ min: 80, max: 80 });
  });

  it('un segundo arrastre pasado del tope devuelve la perilla al tope', async () => {
    const { wrapper } = montar();
    await marcar(wrapper, 'precio-activo', true);
    const maximo = wrapper.get('[data-test="precio-max"]');
    (maximo.element as HTMLInputElement).value = '60';
    await maximo.trigger('input');
    const minimo = wrapper.get('[data-test="precio-min"]');

    (minimo.element as HTMLInputElement).value = '120';
    await minimo.trigger('input');
    (minimo.element as HTMLInputElement).value = '130';
    await minimo.trigger('input');

    expect((minimo.element as HTMLInputElement).value).toBe('60');
  });

  it('arrastrar no busca en cada paso: solo al soltar, y con el cuerpo ya encerrado', async () => {
    const { wrapper } = montar();
    await marcar(wrapper, 'precio-activo', true);
    const antes = wrapper.emitted('aplicar')?.length ?? 0;
    const maximo = wrapper.get('[data-test="precio-max"]');
    (maximo.element as HTMLInputElement).value = '60';
    await maximo.trigger('input');
    const minimo = wrapper.get('[data-test="precio-min"]');

    for (const v of ['70', '90', '120']) {
      (minimo.element as HTMLInputElement).value = v;
      await minimo.trigger('input');
    }
    expect(wrapper.emitted('aplicar')?.length ?? 0).toBe(antes);

    await minimo.trigger('change');

    expect(wrapper.emitted('aplicar')).toHaveLength(antes + 1);
    const aplicado = wrapper.emitted('aplicar')?.at(-1)?.[0] as {
      prices: { min: number; max: number };
    };
    expect(aplicado.prices).toEqual({ min: 60, max: 60 });
  });

  it('las perillas van de 5 a 200, la escala de hoy', async () => {
    const { wrapper } = montar();
    await marcar(wrapper, 'precio-activo', true);

    expect(wrapper.get('[data-test="precio-min"]').attributes('min')).toBe('5');
    expect(wrapper.get('[data-test="precio-max"]').attributes('max')).toBe('200');
  });

  it('cada casilla tiene su rótulo, no un texto suelto al lado', () => {
    const { wrapper } = montar();

    expect(wrapper.get('[data-test="precio-activo"]').element.closest('label')).not.toBeNull();
    expect(wrapper.get('[data-test="promos-activo"]').element.closest('label')).not.toBeNull();
  });
});

describe('ServiceFilterFields · categoría', () => {
  const caja = (wrapper: ReturnType<typeof montar>['wrapper']) =>
    wrapper.getComponent({ name: 'ServicesBox' });

  it('le pasa al árbol la selección que hay en el store, no una copia local', async () => {
    const { wrapper, pinia } = montar();
    useFiltersStore(pinia).setSelectedServiceIds(['t1', 't2']);
    await nextTick();

    expect(caja(wrapper).props('initialSelectedIds')).toEqual(['t1', 't2']);
    expect(caja(wrapper).props('isEditMode')).toBe(true);
  });

  it('le pide el aspecto oscuro: el filtro vive sobre tinta', () => {
    const { wrapper } = montar();

    expect(caja(wrapper).props('variante')).toBe('oscuro');
  });

  it('elegir una categoría la escribe en el store y dispara la aplicación', async () => {
    const { wrapper, pinia } = montar();

    caja(wrapper).vm.$emit('selectedServices', ['raiz', 'hija']);
    await nextTick();

    expect(useFiltersStore(pinia).selectedServicesIDs).toEqual(['raiz', 'hija']);
    const aplicado = wrapper.emitted('aplicar')?.at(-1)?.[0] as {
      selectedServicesIDs: string[];
    };
    expect(aplicado.selectedServicesIDs).toEqual(['raiz', 'hija']);
  });

  /**
   * `ServicesBox.hydrateFromIds` acaba en `syncEmit`, así que al montar el
   * carril el árbol emite la selección que YA estaba. Sin esta guarda eso es una
   * búsqueda idéntica a la anterior en cada visita, y con
   * `placeholderData: previousData` no se ve como «cargando»: se ve como un
   * parpadeo de la lista entera.
   */
  it('el emit de hidratación no dispara una búsqueda redundante', async () => {
    const { wrapper, pinia } = montar();
    useFiltersStore(pinia).setSelectedServiceIds(['t1']);
    await nextTick();
    const antes = wrapper.emitted('aplicar')?.length ?? 0;

    caja(wrapper).vm.$emit('selectedServices', ['t1']);
    await nextTick();

    expect(wrapper.emitted('aplicar')?.length ?? 0).toBe(antes);
  });

  it('cuenta las categorías elegidas junto al rótulo del grupo', async () => {
    const { wrapper } = montar();
    expect(wrapper.find('[data-test="categoria-cuenta"]').exists()).toBe(false);

    caja(wrapper).vm.$emit('selectedServices', ['raiz', 'hija']);
    await nextTick();

    expect(wrapper.get('[data-test="categoria-cuenta"]').text()).toBe('2');
  });

  it('limpiar también vacía las categorías del store', async () => {
    const { wrapper, pinia } = montar();
    caja(wrapper).vm.$emit('selectedServices', ['raiz']);
    await nextTick();

    (wrapper.vm as unknown as { limpiar: () => void }).limpiar();
    await nextTick();

    expect(useFiltersStore(pinia).selectedServicesIDs).toEqual([]);
    expect(wrapper.find('[data-test="categoria-cuenta"]').exists()).toBe(false);
  });
});

/**
 * En la hoja (móvil) se toca con el pulgar: los chips, las opciones de la
 * categoría y la X de quitarla, que vienen de `ServicesBox` con 32 y 28 px,
 * suben a 44. Solo en la hoja: el carril de escritorio, con ratón, se queda
 * como está. El SCSS está mockeado, así que se lee la fuente.
 */
describe('ServiceFilterFields · áreas táctiles en la hoja', () => {
  const FUENTE = readFileSync(
    join(__dirname, '../../src/components/servicePage/ServiceFilterFields.vue'),
    'utf8'
  );
  const ESTILOS = FUENTE.slice(FUENTE.indexOf('<style'));

  it('los chips y las opciones de la categoría llegan a 44 px', () => {
    expect(ESTILOS).toMatch(
      /\.campos--compacto :deep\(\.caja__chip\),\s*\.campos--compacto :deep\(\.caja__radio\) \{\s*min-height: var\(--m-tactil-min\);/
    );
  });

  it('la X de quitar la categoría mide 44 × 44', () => {
    expect(ESTILOS).toMatch(
      /\.campos--compacto :deep\(\.caja__limpiar\) \{[^}]*width: var\(--m-tactil-min\);[^}]*height: var\(--m-tactil-min\);/
    );
  });

  it('fuera de la hoja no toca la caja: el carril de escritorio no cambia', () => {
    const sinCompacto = ESTILOS.replace(/\.campos--compacto[^{]*\{[^}]*\}/g, '');

    expect(sinCompacto).not.toContain(':deep(.caja__');
  });
});
