/**
 * «¿Quiénes somos?» (S2, tablero QuienesFicha): ficha de 880 × 600 con la foto
 * del salón y su placa tinta con la dirección; a la derecha el texto real y el
 * mapa de OpenStreetMap con su atribución. En móvil, pantalla completa con la
 * barra de título arriba.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { mount } from '@vue/test-utils';
import whoWeAreDialog from 'src/components/dialogs/whoWeAreDialog.vue';
import {
  MAPS_EMBED_URL,
  MAPS_EXTERNAL_URL,
} from 'src/constants/salon-location';

const mockPantalla = { movil: false };
jest.mock('src/composables/shared/useConsultaMedios', () => {
  const { ref } = jest.requireActual<typeof import('vue')>('vue');
  return { useConsultaMedios: () => ref(mockPantalla.movil) };
});

const FUENTE = readFileSync(
  join(__dirname, '../../src/components/dialogs/whoWeAreDialog.vue'),
  'utf8'
);
const ESTILOS = FUENTE.slice(FUENTE.indexOf('<style'));

const stubs = {
  QDialog: {
    name: 'QDialog',
    props: ['modelValue', 'maximized', 'transitionShow', 'transitionHide'],
    emits: ['update:modelValue'],
    template: '<div v-if="modelValue" class="dialogo-doble"><slot /></div>',
  },
};

function montar(dialog = true) {
  return mount(whoWeAreDialog, { props: { dialog }, global: { stubs } });
}

beforeEach(() => {
  mockPantalla.movil = false;
});

describe('¿Quiénes somos?', () => {
  it('cerrado no pinta nada', () => {
    expect(montar(false).find('[data-test="quienes"]').exists()).toBe(false);
  });

  it('cuenta quién es el salón con el texto de siempre', () => {
    const wrapper = montar();

    expect(wrapper.text()).toContain('La peluquería');
    expect(wrapper.text()).toContain(
      'Llevamos más de 20 años en el sector de la belleza y la estética'
    );
    expect(wrapper.findAll('h2').map((h) => h.text())).toEqual([
      '¿Quiénes somos?',
    ]);
  });

  it('la placa de la foto dice dónde está', () => {
    const placa = montar().get('[data-test="placa-direccion"]').text();

    expect(placa).toContain('Dónde estamos');
    expect(placa).toContain('Carrera 3 #1-18');
    expect(placa).toContain('Sopó, Cundinamarca');
  });

  it('la foto es la del salón, servida desde public con sus variantes', () => {
    const wrapper = montar();
    const img = wrapper.get('[data-test="foto-salon"] img');

    expect(img.attributes('data-foto')).toBe('/people/salon.jpg');
    expect(img.attributes('alt')).toBeTruthy();
    expect(
      wrapper
        .get('[data-test="foto-salon"] source[type="image/webp"]')
        .attributes('srcset')
    ).toContain('/people/salon-760.webp 760w');
  });

  /**
   * En escritorio el hueco mide 380 × 600 y la foto (3:2) lo cubre recortada:
   * se pinta a unos 900 px de ancho. Un `sizes` de 380 haría que el navegador
   * eligiera la de 400 y la estirara más del doble.
   */
  it('pide la foto al ancho al que se pinta de verdad, no al del hueco', () => {
    const fuente = montar().get(
      '[data-test="foto-salon"] source[type="image/webp"]'
    );

    expect(fuente.attributes('sizes')).toBe('(max-width: 699px) 100vw, 900px');
    expect(fuente.attributes('srcset')).toContain(
      '/people/salon-1400.webp 1400w'
    );
  });

  it('el mapa sigue siendo el de OpenStreetMap, con su atribución', () => {
    const wrapper = montar();

    expect(wrapper.get('[data-test="mapa"]').attributes('src')).toBe(
      MAPS_EMBED_URL
    );
    expect(wrapper.get('[data-test="mapa"]').attributes('title')).toBe(
      'Ubicación de Peluquería Marlene'
    );
    const atribucion = wrapper.get('[data-test="atribucion-mapa"]');
    expect(atribucion.attributes('href')).toBe(
      'https://www.openstreetmap.org/copyright'
    );
    expect(atribucion.text()).toBe('© OpenStreetMap contributors');
  });

  it('«Abrir en el mapa →» abre el mapa externo en otra pestaña', () => {
    const enlace = montar().get('[data-test="abrir-mapa"]');

    expect(enlace.attributes('href')).toBe(MAPS_EXTERNAL_URL);
    expect(enlace.attributes('target')).toBe('_blank');
    expect(enlace.attributes('rel')).toContain('noopener');
    expect(enlace.text()).toBe('Abrir en el mapa →');
  });

  it('la X tiene nombre y cierra', async () => {
    const wrapper = montar();
    const cerrar = wrapper.get('[data-test="cerrar-quienes"]');

    expect(cerrar.attributes('aria-label')).toBe('Cerrar');
    await cerrar.trigger('click');
    expect(wrapper.emitted('update:dialog')).toEqual([[false]]);
  });

  it('en escritorio no va maximizado ni lleva barra', () => {
    const wrapper = montar();

    expect(wrapper.getComponent({ name: 'QDialog' }).props('maximized')).toBe(
      false
    );
    expect(wrapper.find('[data-test="barra-movil"]').exists()).toBe(false);
  });

  it('en móvil va a pantalla completa con el título en la barra, una sola vez', () => {
    mockPantalla.movil = true;
    const wrapper = montar();

    expect(wrapper.getComponent({ name: 'QDialog' }).props('maximized')).toBe(
      true
    );
    const barra = wrapper.get('[data-test="barra-movil"]');
    expect(barra.get('h2').text()).toBe('¿Quiénes somos?');
    expect(wrapper.findAll('h2')).toHaveLength(1);
    expect(barra.find('[data-test="cerrar-quienes"]').exists()).toBe(true);
    expect(wrapper.findAll('[data-test="cerrar-quienes"]')).toHaveLength(1);
  });
});

describe('¿Quiénes somos? · la fuente', () => {
  it('la raíz del diálogo es la ficha y recibe los clics', () => {
    expect(FUENTE).toMatch(/<q-dialog\b[^>]*>\s*<article\s+class="quienes"/);
    expect(ESTILOS).toMatch(/\.quienes\s*\{[^}]*pointer-events: all;/);
  });

  it('sobre claro, el foco se ve en tinta', () => {
    expect(ESTILOS).toMatch(
      /:focus-visible\s*\{[^}]*outline: 2px solid var\(--m-tinta\);[^}]*outline-offset: 2px;/
    );
  });

  it('ya no nombra la carpeta de assets, que Vite no reescribe', () => {
    expect(FUENTE).not.toContain('src/assets/places');
    expect(FUENTE).not.toContain('useDialogMaximizedBelow');
  });

  it('el velo es el de la paleta', () => {
    expect(ESTILOS).toMatch(
      /\.quienes-dialogo \.q-dialog__backdrop\s*\{[^}]*background: var\(--m-velo\);/
    );
  });
});
