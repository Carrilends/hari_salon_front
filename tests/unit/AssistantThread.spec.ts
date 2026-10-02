/**
 * El hilo: burbujas, tarjetas, «escribiendo» y error. Hereda de
 * `AssistantChat.spec.ts` los casos que ahora son suyos.
 *
 * La aserción que de verdad importa es la del HTML: el texto del asistente lo
 * escribe un modelo que reinyecta nombres del catálogo, así que **nunca** puede
 * interpretarse como marcado. Si alguien mete un `v-html` en la burbuja, esta
 * prueba se pone roja.
 *
 * El hilo importa las dos tarjetas, y esas llegan por `useAddToBag` hasta
 * `services-api`, que lee `import.meta.env` — algo que ts-jest no compila a
 * CommonJS. Los `stubs` no bastan: el import se iza antes de montar nada. Se
 * corta aquí, como hacen las suites de las propias tarjetas.
 */
jest.mock('src/composables/booking/useAddToBag', () => ({
  useAddToBag: () => ({
    añadirServicio: jest.fn(),
    añadirVarios: jest.fn(),
  }),
}));

import { mount } from '@vue/test-utils';
import AssistantThread from 'src/components/assistant/AssistantThread.vue';

const stubs = {
  ServiceListCard: {
    name: 'ServiceListCard',
    template: '<div class="servicios" />',
  },
  PackageProposalCard: {
    name: 'PackageProposalCard',
    template: '<div class="paquete" />',
  },
};

const montar = (props: Record<string, unknown>) =>
  mount(AssistantThread, {
    props: { cargando: false, error: null, mensajes: [], ...props },
    global: { stubs },
  });

const SERVICIOS = { tipo: 'servicios', servicios: [] };
const PAQUETE = {
  tipo: 'paquete',
  evento: 'boda',
  lineas: [],
  serviciosIds: [],
  total: 0,
  minutos: 0,
  omitidas: [],
  completa: true,
};

describe('AssistantThread', () => {
  it('distingue quién habla en cada burbuja', () => {
    const wrapper = montar({
      mensajes: [
        { role: 'user', content: 'hola' },
        { role: 'assistant', content: 'buenas' },
      ],
    });

    expect(wrapper.findAll('[data-test="burbuja-clienta"]')).toHaveLength(1);
    expect(wrapper.findAll('[data-test="burbuja-asistente"]')).toHaveLength(1);
    expect(wrapper.get('[data-test="burbuja-clienta"]').text()).toBe('hola');
  });

  it('mientras no hay mensajes saluda, en vez de dejar el panel en blanco', () => {
    expect(montar({ mensajes: [] }).find('[data-test="saludo"]').exists()).toBe(
      true
    );
  });

  it('con el primer mensaje el saludo se va', () => {
    const wrapper = montar({ mensajes: [{ role: 'user', content: 'hola' }] });

    expect(wrapper.find('[data-test="saludo"]').exists()).toBe(false);
  });

  it('pinta la tarjeta que corresponde a cada presentación', () => {
    const wrapper = montar({
      mensajes: [
        {
          role: 'assistant',
          content: 'mira',
          presentaciones: [SERVICIOS, PAQUETE],
        },
      ],
    });

    expect(wrapper.findAll('.servicios')).toHaveLength(1);
    expect(wrapper.findAll('.paquete')).toHaveLength(1);
  });

  it('pinta las dos tarjetas de un mismo turno en el orden que llegaron', () => {
    const wrapper = montar({
      mensajes: [
        {
          role: 'assistant',
          content: 'mira',
          presentaciones: [PAQUETE, SERVICIOS],
        },
      ],
    });

    const clases = wrapper
      .findAll('.paquete, .servicios')
      .map((n) => n.classes()[0]);

    expect(clases).toEqual(['paquete', 'servicios']);
  });

  it('no pinta tarjetas cuando la respuesta no trae presentaciones', () => {
    const wrapper = montar({
      mensajes: [{ role: 'assistant', content: 'Hola' }],
    });

    expect(wrapper.find('.servicios').exists()).toBe(false);
    expect(wrapper.find('.paquete').exists()).toBe(false);
  });

  it('mientras el asistente escribe lo anuncia, y no finge un mensaje', () => {
    const wrapper = montar({ mensajes: [], cargando: true });

    expect(
      wrapper.get('[data-test="escribiendo"]').attributes('aria-label')
    ).toMatch(/escribiendo/i);
    expect(wrapper.findAll('[data-test="burbuja-asistente"]')).toHaveLength(0);
  });

  it('el error se anuncia como alerta', () => {
    const wrapper = montar({ mensajes: [], error: 'No pude responder.' });

    expect(wrapper.get('[role="alert"]').text()).toContain('No pude responder.');
  });

  it('los mensajes nuevos se anuncian sin interrumpir', () => {
    expect(
      montar({ mensajes: [] }).get('[data-test="hilo"]').attributes('aria-live')
    ).toBe('polite');
  });

  /**
   * Heredado de `AssistantChat.spec.ts`. Lo escribe un modelo que reinyecta
   * nombres que una administradora teclea en el panel: si esto se pintara con
   * `v-html`, sería inyección indirecta en una página donde el token de sesión
   * vive en memoria, en el mismo contexto.
   */
  it('NO interpreta el texto del asistente como HTML', () => {
    const veneno = '<img src=x onerror="window.__roto=1"> **negrita**';
    const burbuja = montar({
      mensajes: [{ role: 'assistant', content: veneno }],
    }).get('[data-test="burbuja-asistente"]');

    expect(burbuja.element.querySelector('img')).toBeNull();
    expect(burbuja.text()).toContain('<img src=x');
    expect(burbuja.text()).toContain('**negrita**');
  });

  /**
   * Punto 4 del enfoque de revisión: lo escribe la clienta y puede no traer un
   * solo espacio. El recorte de palabra se comprueba de verdad en
   * `tests/browser-compat/`; aquí se fija que la clase que lo hace está puesta.
   */
  it('las burbujas parten las palabras larguísimas', () => {
    const wrapper = montar({
      mensajes: [{ role: 'user', content: 'a'.repeat(400) }],
    });

    expect(wrapper.get('[data-test="burbuja-clienta"]').classes()).toContain(
      'assistant-thread__burbuja'
    );
  });
});
