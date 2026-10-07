/**
 * El árbol de categorías, repintado sin tocar lo que hace.
 *
 * Esta suite es, antes que nada, una prueba de REGRESIÓN de su API: el mismo
 * componente lo monta `serviceCreateEdit.vue` para crear y editar servicios, y
 * si los ids que emite cambian de forma, lo que se rompe no es el filtro —es
 * guardar un servicio con las categorías equivocadas.
 *
 * `service.helpers` se dobla porque su cadena de imports llega a `services-api`,
 * que lee `import.meta.env`.
 */
const pedirHijos = jest.fn();
jest.mock('src/helpers/service.helpers', () => ({
  getChildrenServicesHelper: (...args: unknown[]) => pedirHijos(...args),
}));

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import ServicesBox from 'src/components/shared/ServicesBox.vue';
import { useOptionsStore } from 'src/stores/options-store';

const FUENTE = readFileSync(
  join(__dirname, '../../src/components/shared/ServicesBox.vue'),
  'utf8'
);
const CREAR_EDITAR = readFileSync(
  join(__dirname, '../../src/components/dialogs/serviceCreateEdit.vue'),
  'utf8'
);

const PRINCIPALES = [
  { id: 'p1', name: 'Cabello', selected: false },
  { id: 'p2', name: 'Uñas', selected: false },
];

const HIJOS_DE_P1 = [
  { id: 'c1', name: 'Corte', selected: false, children: [] },
  { id: 'c2', name: 'Color', selected: false, children: [] },
];

function montar(props: Record<string, unknown> = {}) {
  const pinia = createPinia();
  const wrapper = mount(ServicesBox, {
    props,
    global: { plugins: [pinia] },
  });
  useOptionsStore(pinia).setPrincipalServices(PRINCIPALES);
  return wrapper;
}

beforeEach(() => {
  pedirHijos.mockReset();
  pedirHijos.mockImplementation(async ({ idParent }: { idParent: string }) =>
    idParent === 'p1' ? HIJOS_DE_P1.map((h) => ({ ...h })) : []
  );
});

describe('ServicesBox · regresión de su API', () => {
  it('ofrece un radio por categoría principal, con rótulo de verdad', async () => {
    const wrapper = montar();
    await flushPromises();

    const radios = wrapper.findAll('[data-test="principal"]');
    expect(radios).toHaveLength(2);
    expect((radios[0].element as HTMLInputElement).type).toBe('radio');
    expect(radios[0].element.closest('label')).not.toBeNull();
    expect(wrapper.text()).toContain('Cabello');
  });

  it('elegir la principal emite su id y pinta sus hijas', async () => {
    const wrapper = montar();
    await flushPromises();

    await wrapper.findAll('[data-test="principal"]')[0].trigger('change');
    await flushPromises();

    expect(wrapper.emitted('selectedServices')?.at(-1)?.[0]).toEqual(['p1']);
    expect(wrapper.findAll('[data-test="categoria-chip"]')).toHaveLength(2);
  });

  it('elegir una hija emite la principal y la hija, en ese orden', async () => {
    const wrapper = montar();
    await flushPromises();
    await wrapper.findAll('[data-test="principal"]')[0].trigger('change');
    await flushPromises();

    await wrapper.findAll('[data-test="categoria-chip"]')[0].trigger('click');
    await flushPromises();

    expect(wrapper.emitted('selectedServices')?.at(-1)?.[0]).toEqual(['p1', 'c1']);
  });

  it('deselegir la hija vuelve a emitir solo la principal', async () => {
    const wrapper = montar();
    await flushPromises();
    await wrapper.findAll('[data-test="principal"]')[0].trigger('change');
    await flushPromises();
    await wrapper.findAll('[data-test="categoria-chip"]')[0].trigger('click');
    await flushPromises();

    await wrapper.findAll('[data-test="categoria-chip"]')[0].trigger('click');
    await flushPromises();

    expect(wrapper.emitted('selectedServices')?.at(-1)?.[0]).toEqual(['p1']);
  });

  /** §6.10: es intencional, y se pierde con un descuido de marcado. */
  it('con una raíz elegida, el resto de las raíces se bloquean', async () => {
    const wrapper = montar();
    await flushPromises();
    await wrapper.findAll('[data-test="principal"]')[0].trigger('change');
    await flushPromises();

    await wrapper.findAll('[data-test="categoria-chip"]')[0].trigger('click');
    await flushPromises();

    const chips = wrapper.findAll('[data-test="categoria-chip"]');
    expect(chips[0].attributes('disabled')).toBeUndefined();
    expect(chips[1].attributes('disabled')).toBeDefined();
  });

  it('el chip elegido se anuncia pulsado', async () => {
    const wrapper = montar();
    await flushPromises();
    await wrapper.findAll('[data-test="principal"]')[0].trigger('change');
    await flushPromises();
    await wrapper.findAll('[data-test="categoria-chip"]')[0].trigger('click');
    await flushPromises();

    expect(wrapper.findAll('[data-test="categoria-chip"]')[0].attributes('aria-pressed')).toBe('true');
  });

  it('el botón de quitar solo aparece cuando hay algo elegido, y tiene nombre', async () => {
    const wrapper = montar();
    await flushPromises();
    expect(wrapper.find('[data-test="limpiar-categoria"]').exists()).toBe(false);

    await wrapper.findAll('[data-test="principal"]')[0].trigger('change');
    await flushPromises();

    const quitar = wrapper.get('[data-test="limpiar-categoria"]');
    expect(quitar.element.tagName).toBe('BUTTON');
    expect(quitar.attributes('aria-label')).toBeTruthy();
  });

  it('quitar vacía la selección y lo emite', async () => {
    const wrapper = montar();
    await flushPromises();
    await wrapper.findAll('[data-test="principal"]')[0].trigger('change');
    await flushPromises();

    await wrapper.get('[data-test="limpiar-categoria"]').trigger('click');
    await flushPromises();

    expect(wrapper.emitted('selectedServices')?.at(-1)?.[0]).toEqual([]);
  });

  it('sigue exponiendo los tres métodos que usa crear/editar', async () => {
    const wrapper = montar();
    await flushPromises();
    const expuesto = wrapper.vm as unknown as Record<string, unknown>;

    expect(typeof expuesto.clear).toBe('function');
    expect(typeof expuesto.hydrateFromIds).toBe('function');
    expect(typeof expuesto.resetLocalState).toBe('function');
  });
});

describe('ServicesBox · las dos variantes', () => {
  it('por defecto es la clara: es la que necesita crear/editar', async () => {
    const wrapper = montar();
    await flushPromises();

    expect(wrapper.classes()).toContain('caja--claro');
  });

  it('el filtro le pide la oscura', async () => {
    const wrapper = montar({ variante: 'oscuro' });
    await flushPromises();

    expect(wrapper.classes()).toContain('caja--oscuro');
  });

  it('crear/editar sigue montando este mismo árbol', () => {
    // No se afirma que NO pase `variante` —la fase E restila ese diálogo y
    // podría pasarle `claro` explícitamente—, solo que sigue siendo el mismo
    // componente. Que el defecto sea el claro lo fija el caso de arriba, que es
    // donde de verdad se rompería el stepper: texto hueso sobre tarjeta blanca.
    expect(CREAR_EDITAR).toMatch(/<services-box/);
  });

  it('con título vacío no pinta una cabecera hueca', async () => {
    const wrapper = montar({ sectionTitle: '' });
    await flushPromises();

    expect(wrapper.find('.caja__cabecera').exists()).toBe(false);
  });

  it('con el título por defecto sí lo pinta', async () => {
    const wrapper = montar();
    await flushPromises();

    expect(wrapper.text()).toContain('Tu servicio es:');
  });
});

describe('ServicesBox · lo que se fue', () => {
  it('ni un hexadecimal: todo color sale de los tokens', () => {
    expect(FUENTE).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it('ni teal, ni estrellas, ni el gris de antes', () => {
    expect(FUENTE).not.toMatch(/teal/);
    expect(FUENTE).not.toMatch(/icon="star"/);
    expect(FUENTE).not.toMatch(/q-chip|q-option-group|q-scroll-area/);
  });

  it('el árbol se pinta una sola vez, no dos según el scroll', () => {
    const chips = FUENTE.match(/data-test="categoria-chip"/g) ?? [];
    expect(chips).toHaveLength(1);
  });
});
