/**
 * La 404 (R3, tablero Error404B): página tinta en español, dentro del armazón,
 * con tres atajos —Servicios, Preguntas frecuentes y WhatsApp— y la salida al
 * inicio. No se indexa. Sustituye a la plantilla azul de Quasar («Oops.
 * Nothing here...»).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { mount, RouterLinkStub } from '@vue/test-utils';
import ErrorNotFound from 'src/pages/ErrorNotFound.vue';
import StrokeIcon from 'src/components/shared/StrokeIcon.vue';

const mockUseSeo = jest.fn();
jest.mock('src/composables/seo/useSeo', () => ({
  useSeo: (opciones: unknown) => mockUseSeo(opciones),
}));

const leer = (ruta: string) =>
  readFileSync(join(__dirname, '../../src', ruta), 'utf8');
const FUENTE = leer('pages/ErrorNotFound.vue');
const TOKENS = leer('css/tokens.scss');

const montar = () =>
  mount(ErrorNotFound, {
    global: {
      stubs: {
        RouterLink: RouterLinkStub,
        'q-page': { template: '<div><slot /></div>' },
      },
    },
  });

const enlace = (wrapper: ReturnType<typeof montar>, gancho: string) =>
  wrapper
    .findAllComponents(RouterLinkStub)
    .find((l) => l.attributes('data-test') === gancho);

beforeEach(() => mockUseSeo.mockReset());

describe('ErrorNotFound', () => {
  it('dice que la página no existe, en español', () => {
    const wrapper = montar();

    expect(wrapper.find('h1').text()).toBe('Esta página no existe');
    expect(wrapper.text()).toContain('Error 404');
    expect(wrapper.text()).toContain(
      'El enlace puede estar mal escrito o la página se movió.'
    );
    expect(wrapper.text()).not.toContain('Oops');
    expect(wrapper.text()).not.toContain('Go Home');
  });

  it('ofrece Servicios y Preguntas frecuentes', () => {
    const wrapper = montar();

    expect(enlace(wrapper, 'atajo-servicios')?.props('to')).toBe('/services');
    expect(enlace(wrapper, 'atajo-preguntas')?.props('to')).toBe(
      '/preguntas-frecuentes'
    );
  });

  it('y WhatsApp, a la línea del salón en otra pestaña', () => {
    const verde = montar().find('[data-test="whatsapp-404"]');

    expect(verde.attributes('href')).toMatch(
      /^https:\/\/wa\.me\/573208977471\?text=/
    );
    expect(verde.attributes('target')).toBe('_blank');
    expect(verde.attributes('rel')).toContain('noopener');
    expect(verde.text()).toContain('Escríbenos por WhatsApp');
  });

  it('y una salida al inicio', () => {
    const wrapper = montar();

    expect(enlace(wrapper, 'ir-al-inicio')?.props('to')).toBe('/');
    expect(enlace(wrapper, 'ir-al-inicio')?.text()).toBe('o vuelve al inicio →');
  });

  it('no se indexa ni declara canónica', () => {
    montar();

    expect(mockUseSeo).toHaveBeenCalledTimes(1);
    const opciones = mockUseSeo.mock.calls[0][0] as Record<string, unknown>;
    expect(opciones.noindex).toBe(true);
    expect(opciones.path).toBeUndefined();
    expect(opciones.title).toBe('Página no encontrada | Peluquería Marlene');
  });

  it('sin «Reservar» y sin teléfono a la vista', () => {
    const texto = montar().text();

    expect(texto).not.toContain('Reservar');
    expect(texto).not.toMatch(/\d{3}\s?\d{3}\s?\d{2}\s?\d{2}/);
  });

  it('las tarjetas de enlace se hunden como tarjetas y el verde es un botón', () => {
    const plantilla = FUENTE.split('<script')[0];

    expect(plantilla).toContain(
      'class="pagina-404__atajo pagina-404__atajo--enlace m-tarjeta-pulsable"'
    );
    expect(plantilla).toContain('class="pagina-404__whatsapp m-boton"');
  });

  it('es tinta, y pasa a filas cuando no caben tres columnas', () => {
    expect(FUENTE).toMatch(
      /\.pagina-404\s*\{[^}]*background: var\(--m-tinta\);[^}]*color: var\(--m-hueso\);/
    );
    const estrecho = FUENTE.slice(FUENTE.indexOf('@media (max-width: 1239px)'));
    expect(estrecho).toMatch(/\.pagina-404__atajos\s*\{[^}]*flex-direction: column;/);
  });

  it('el foco se ve en hueso sobre la tinta', () => {
    expect(FUENTE).toMatch(
      /:focus-visible\s*\{[^}]*outline: 2px solid var\(--m-hueso\);/
    );
  });
});

describe('lo que la 404 añade a los compartidos', () => {
  it.each(['tijeras', 'whatsapp', 'ayuda'])('StrokeIcon dibuja «%s»', (nombre) => {
    const trazos = mount(StrokeIcon, { props: { nombre } }).findAll('path');

    expect(trazos.length).toBeGreaterThan(0);
  });

  it('el subrayado rosa sobre tinta es un token, en el bloque del plan 7', () => {
    const bloque = TOKENS.slice(TOKENS.indexOf('/// Plan 7 — reseña y 404.'));

    expect(bloque).toMatch(/--m-filete-rosa-oscuro: rgba\(248, 187, 208, 0\.45\);/);
    expect(bloque).toMatch(/No es color de texto/);
    expect(FUENTE).toContain('var(--m-filete-rosa-oscuro)');
  });
});
