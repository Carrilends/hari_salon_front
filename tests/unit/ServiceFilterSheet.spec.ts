/**
 * La hoja inferior de filtros: lo que queda del diálogo por debajo de 1024 px.
 *
 * Tres cosas se vigilan aquí y ninguna es decorativa:
 *
 * 1. Que por encima de 1024 px NO se pinte y se cierre sola. Dejar `dialog` en
 *    `true` hacía que la hoja volviese a saltar al estrechar la ventana, sin
 *    que nadie la hubiera pedido — y es justo lo que pasa al llegar del inicio
 *    con el atajo, que enciende esa bandera.
 * 2. Que el pie diga cuántos servicios se van a ver. Es el único sitio donde la
 *    clienta sabe si le queda algo después de filtrar.
 * 3. Que con el teléfono tumbado pase a pantalla completa: con 400 px de alto,
 *    una hoja al 85 % deja el botón del pie fuera de la pantalla.
 */
jest.mock('src/helpers/service.helpers', () => ({
  getChildrenServicesHelper: jest.fn().mockResolvedValue([]),
}));

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import ServiceFilterDialog from 'src/components/dialogs/serviceFilterDialog.vue';
import { fijarViewport } from '../viewportMock';

const FUENTE = readFileSync(
  join(__dirname, '../../src/components/dialogs/serviceFilterDialog.vue'),
  'utf8'
);

const aplicado = jest.fn();

/**
 * `QDialog` se dobla con un envoltorio transparente: sin Quasar instalado el
 * componente no resolvería y el cuerpo de la hoja no llegaría al DOM. El doble
 * declara `modelValue` porque de él depende que el contenido se pinte.
 */
const stubs = {
  QDialog: {
    name: 'QDialog',
    props: ['modelValue', 'position', 'maximized', 'transitionShow', 'transitionHide'],
    template: '<div v-if="modelValue" class="dialogo-doble"><slot /></div>',
  },
  ServiceFilterFields: {
    name: 'ServiceFilterFields',
    props: ['compacto'],
    emits: ['aplicar', 'cuenta', 'limpiar'],
    template: '<div class="campos-doble" />',
    methods: {
      limpiar: () => undefined,
      aplicar: aplicado,
    },
  },
};

function montar({ dialog = true, total = 0 } = {}) {
  return mount(ServiceFilterDialog, {
    props: { dialog, total },
    global: { plugins: [createPinia()], stubs },
  });
}

beforeEach(() => aplicado.mockReset());

describe('serviceFilterDialog como hoja inferior', () => {
  it('se pinta por debajo de 1024 px', () => {
    fijarViewport({ ancho: 1023 });

    expect(montar().find('[data-test="hoja-filtros"]').exists()).toBe(true);
  });

  it('no se pinta desde 1024 px: ahí manda el carril', () => {
    fijarViewport({ ancho: 1024 });

    expect(montar().find('[data-test="hoja-filtros"]').exists()).toBe(false);
  });

  it('nunca se pinta a la vez que el carril, porque usan el mismo corte', () => {
    // Las dos consultas salen de `ANCHO_CARRIL_PX`: no hay literal repetido que
    // pueda desfasarse.
    expect(FUENTE).toContain('ANCHO_CARRIL_PX');
    expect(FUENTE).not.toMatch(/\b1024\b/);
  });

  it('al ensanchar la ventana se cierra sola en vez de quedarse armada', async () => {
    const viewport = fijarViewport({ ancho: 500 });
    const wrapper = montar({ dialog: true });
    expect(wrapper.find('[data-test="hoja-filtros"]').exists()).toBe(true);

    viewport.cambiar({ ancho: 1280 });
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted('update:dialog')?.at(-1)).toEqual([false]);
  });

  it('se abre por abajo, con tirador', () => {
    fijarViewport({ ancho: 390 });
    const wrapper = montar();

    expect(wrapper.getComponent({ name: 'QDialog' }).props('position')).toBe('bottom');
    expect(wrapper.find('[data-test="tirador"]').exists()).toBe(true);
  });

  it('compacta los campos: en la hoja se toca con el pulgar', () => {
    fijarViewport({ ancho: 390 });

    expect(
      montar().getComponent({ name: 'ServiceFilterFields' }).props('compacto')
    ).toBe(true);
  });

  it('a pantalla completa cuando el alto no alcanza', () => {
    fijarViewport({ ancho: 700, alto: 420 });

    expect(montar().getComponent({ name: 'QDialog' }).props('maximized')).toBe(true);
  });

  it('con alto de sobra se queda como hoja, no se come la pantalla', () => {
    fijarViewport({ ancho: 390, alto: 844 });

    expect(montar().getComponent({ name: 'QDialog' }).props('maximized')).toBe(false);
  });

  it('el pie dice cuántos servicios se verán', () => {
    fijarViewport({ ancho: 390 });

    expect(montar({ total: 12 }).get('[data-test="aplicar"]').text()).toBe('Ver 12 servicios');
  });

  it('no dice «1 servicios»', () => {
    fijarViewport({ ancho: 390 });

    expect(montar({ total: 1 }).get('[data-test="aplicar"]').text()).toBe('Ver 1 servicio');
  });

  it('sin resultados lo dice, en vez de ofrecer ver cero', () => {
    fijarViewport({ ancho: 390 });

    expect(montar({ total: 0 }).get('[data-test="aplicar"]').text()).toBe('Sin resultados');
  });

  it('el botón del pie aplica y cierra', async () => {
    fijarViewport({ ancho: 390 });
    const wrapper = montar({ total: 5 });

    await wrapper.get('[data-test="aplicar"]').trigger('click');

    expect(aplicado).toHaveBeenCalledTimes(1);
    expect(wrapper.emitted('update:dialog')?.at(-1)).toEqual([false]);
  });

  it('cada cambio de los campos aplica sin esperar al pie', () => {
    fijarViewport({ ancho: 390 });
    const wrapper = montar();
    const filtro = {
      selectedGenres: ['g1'],
      selectedServicesIDs: [],
      includePriceRange: false,
      includePromotionsOnly: false,
      prices: { min: 5, max: 200 },
    };

    wrapper.getComponent({ name: 'ServiceFilterFields' }).vm.$emit('aplicar', filtro);
    wrapper.getComponent({ name: 'ServiceFilterFields' }).vm.$emit('cuenta', 2);

    expect(wrapper.emitted('update:services')?.[0]).toEqual([filtro]);
    expect(wrapper.emitted('update:amount')?.[0]).toEqual([2]);
  });

  it('el cierre es un botón de 44 px con nombre para el lector de pantalla', () => {
    fijarViewport({ ancho: 390 });
    const cerrar = montar().get('[data-test="cerrar"]');

    expect(cerrar.element.tagName).toBe('BUTTON');
    expect(cerrar.attributes('aria-label')).toMatch(/cerrar/i);
    expect(FUENTE).toMatch(/\.hoja__cerrar[\s\S]*?var\(--m-tactil-min\)/);
  });

  it('cerrar avisa a la página en vez de esconderse por su cuenta', async () => {
    fijarViewport({ ancho: 390 });
    const wrapper = montar();

    await wrapper.get('[data-test="cerrar"]').trigger('click');

    expect(wrapper.emitted('update:dialog')?.at(-1)).toEqual([false]);
  });

  it('el título va en Marcellus y dice «Filtros»', () => {
    fijarViewport({ ancho: 390 });

    expect(montar().get('[data-test="hoja-filtros"]').text()).toContain('Filtros');
    expect(FUENTE).toMatch(/\.hoja__titulo[\s\S]*?var\(--m-font-display\)/);
  });

  it('el cuerpo desplaza con riel dorado', () => {
    expect(FUENTE).toMatch(/scrollbar-color:\s*var\(--m-oro\)\s+var\(--m-carbon\)/);
    expect(FUENTE).toContain('::-webkit-scrollbar-thumb');
  });

  it('todo lo que toca a matchMedia va detrás de la guarda de SSG', () => {
    expect(FUENTE).toContain("typeof window !== 'undefined'");
    expect(FUENTE).toContain("typeof window.matchMedia === 'function'");
  });
});
