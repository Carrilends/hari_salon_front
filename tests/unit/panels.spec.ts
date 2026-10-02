/**
 * El inicio abre el asistente desde su banda y el diálogo de reseña desde el
 * enlace «Deja la tuya», pero los dos paneles viven en el armazón. El estado
 * se comparte por módulo: si cada importador tuviera el suyo, la banda abriría
 * un panel distinto del que está montado y no pasaría nada en pantalla.
 */
/**
 * El lanzador importa el panel, y el panel llega hasta `assistant-api` y
 * `services-api`, que leen `import.meta.env` — algo que ts-jest no compila a
 * CommonJS. Aquí el panel es una caja negra: lo que se comprueba es el
 * flotante, no lo que hay dentro.
 */
jest.mock('src/components/assistant/AssistantPanel.vue', () => ({
  __esModule: true,
  default: { name: 'AssistantPanel', template: '<div class="panel" />' },
}));

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import AssistantLauncher from 'src/components/assistant/AssistantLauncher.vue';
import { useAssistantPanel } from 'src/composables/assistant/useAssistantPanel';
import { useReviewDialog } from 'src/composables/reviews/useReviewDialog';

describe.each([
  ['asistente', useAssistantPanel],
  ['reseña', useReviewDialog],
])('panel de %s', (_nombre, usar) => {
  beforeEach(() => usar().cerrar());

  it('empieza cerrado', () => {
    expect(usar().abierto.value).toBe(false);
  });

  it('abrir y cerrar cambian el estado', () => {
    const panel = usar();
    panel.abrir();
    expect(panel.abierto.value).toBe(true);
    panel.cerrar();
    expect(panel.abierto.value).toBe(false);
  });

  it('alternar va y vuelve', () => {
    const panel = usar();
    panel.alternar();
    expect(panel.abierto.value).toBe(true);
    panel.alternar();
    expect(panel.abierto.value).toBe(false);
  });

  it('dos llamadas comparten el mismo estado', () => {
    const uno = usar();
    const otro = usar();
    uno.abrir();
    expect(otro.abierto.value).toBe(true);
  });
});

/**
 * Un chip del inicio no solo abre el panel: lleva su pregunta. Sin esto, quien
 * toca «Ver disponibilidad» se encuentra una caja vacía y tiene que escribirla.
 * El prompt se consume una sola vez: si el panel se cierra y se vuelve a abrir
 * a mano, no debe repetir la pregunta de hace un rato.
 */
describe('pregunta pendiente del panel del asistente', () => {
  beforeEach(() => {
    const panel = useAssistantPanel();
    panel.cerrar();
    panel.consumirPendiente();
  });

  it('sin chip no hay nada pendiente', () => {
    useAssistantPanel().abrir();
    expect(useAssistantPanel().consumirPendiente()).toBeNull();
  });

  it('abrirCon abre el panel y deja la pregunta', () => {
    useAssistantPanel().abrirCon('¿Qué horarios tienen mañana?');

    expect(useAssistantPanel().abierto.value).toBe(true);
    expect(useAssistantPanel().consumirPendiente()).toBe('¿Qué horarios tienen mañana?');
  });

  it('la pregunta se consume una sola vez', () => {
    useAssistantPanel().abrirCon('¿Qué servicios tienen?');
    useAssistantPanel().consumirPendiente();

    expect(useAssistantPanel().consumirPendiente()).toBeNull();
  });
});

/**
 * Quién puede dejar una reseña lo decide el armazón, que es donde viven la
 * sesión y el router. El diálogo solo ofrece el canal: si nadie registró una
 * política, no se abre solo.
 */
describe('solicitud de reseña', () => {
  beforeEach(() => {
    useReviewDialog().cerrar();
    useReviewDialog().registrarSolicitud(null);
  });

  it('sin política registrada, pedirla no abre nada', () => {
    useReviewDialog().solicitar();

    expect(useReviewDialog().abierto.value).toBe(false);
  });

  it('con política registrada, la llama a ella', () => {
    const politica = jest.fn();
    useReviewDialog().registrarSolicitud(politica);

    useReviewDialog().solicitar();

    expect(politica).toHaveBeenCalledTimes(1);
    expect(useReviewDialog().abierto.value).toBe(false);
  });
});

/**
 * El panel se abre sobre cualquier página y en móvil la ocupa entera. Mientras
 * está abierto no puede quedar nada flotando encima: ni el propio botón que lo
 * abrió, ni la barra fija del inicio.
 */
describe('el lanzador mientras el panel está abierto', () => {
  beforeEach(() => useAssistantPanel().cerrar());

  const montarLanzador = (props = {}) =>
    mount(AssistantLauncher, {
      props,
      global: { stubs: { AssistantPanel: true } },
    });

  it('esconde su botón flotante', async () => {
    const wrapper = montarLanzador();
    expect(wrapper.find('[data-test="fab"]').exists()).toBe(true);

    useAssistantPanel().abrir();
    await nextTick();

    expect(wrapper.find('[data-test="fab"]').exists()).toBe(false);
  });

  /**
   * Es una píldora con rótulo, no un círculo con un icono: fuera del inicio
   * nadie ha visto todavía la tarjeta del asistente, así que el botón tiene que
   * decir qué es sin que haya que tocarlo.
   */
  it('el flotante dice lo que es, con rótulo y nombre accesible', () => {
    const boton = montarLanzador().get('[data-test="fab"]');

    expect(boton.text()).toContain('Asistente');
    expect(boton.attributes('aria-label')).toBe('Abrir el asistente');
    expect(boton.element.tagName).toBe('BUTTON');
  });

  /**
   * En el inicio no sale: la banda de reseñas ya ofrece el asistente con sus
   * chips, y el armazon lo decide por ruta. Pero el PANEL sigue montado ahi —si
   * no, el chip del inicio no tendria nada que abrir—.
   */
  it('en el inicio no hay flotante, pero el panel sigue disponible', () => {
    const wrapper = montarLanzador({ mostrarFlotante: false });

    expect(wrapper.find('[data-test="fab"]').exists()).toBe(false);

    useAssistantPanel().abrir();
    return nextTick().then(() => {
      expect(wrapper.findComponent({ name: 'AssistantPanel' }).exists()).toBe(
        true
      );
    });
  });

  /**
   * Punto 2 del enfoque de revisión: el panel es del armazón, no de una página.
   * Si alguien toca «Servicios» con el asistente abierto, la conversación no
   * puede desaparecer con la página que la tenía debajo. Hoy el lanzador vive
   * FUERA de `<router-view>` y así debe seguir: montarlo dentro lo desmontaría
   * en cada navegación.
   */
  it('el lanzador vive fuera de router-view, así que navegar no cierra el panel', () => {
    const layout = readFileSync(
      join(__dirname, '../../src/layouts/MainLayout.vue'),
      'utf8'
    );
    const finDelContenedor = layout.indexOf('</q-page-container>');
    const posicionDelLanzador = layout.indexOf('<AssistantLauncher');

    expect(finDelContenedor).toBeGreaterThan(-1);
    expect(posicionDelLanzador).toBeGreaterThan(finDelContenedor);
  });

  /**
   * Al cerrarse, el panel se desvanece en vez de desaparecer de golpe. Lo
   * gobierna un `<Transition>` del lanzador, porque la entrada y la salida las
   * manda quien monta y desmonta, no el propio panel. La conducta de verdad se
   * comprueba en `tests/browser-compat/`: jsdom no ejecuta transiciones.
   */
  it('el panel se oculta con una transición, no de golpe', () => {
    const fuente = readFileSync(
      join(__dirname, '../../src/components/assistant/AssistantLauncher.vue'),
      'utf8'
    );

    expect(fuente).toMatch(/<Transition[\s\S]*?name="assistant-panel"/);
    expect(fuente).toMatch(/<AssistantPanel v-if="open"/);
  });

  it('el panel se pone por encima de la barra fija del inicio', () => {
    const fuente = readFileSync(
      join(__dirname, '../../src/components/assistant/AssistantPanel.vue'),
      'utf8'
    );
    const barra = readFileSync(
      join(__dirname, '../../src/components/index/MobileActionBar.vue'),
      'utf8'
    );

    const zPanel = Number(fuente.match(/z-index:\s*(\d+)/)?.[1]);
    const zBarra = Number(barra.match(/z-index:\s*(\d+)/)?.[1]);

    expect(zPanel).toBeGreaterThan(zBarra);
  });
});
