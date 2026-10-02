/**
 * El armazón del panel: velo, cabecera, banda de aviso y la conducta modal.
 * Hereda de `AssistantChat.spec.ts` los casos del aviso, la sesión y los chips,
 * que son decisiones del armazón y no del hilo ni del redactor.
 *
 * Lo que se vigila aquí es que una página atenuada se comporte como modal de
 * verdad: `Escape`, el velo, el foco que entra y vuelve, y el foco que no se
 * escapa a la página de detrás. Atenuar sin atrapar el foco es peor que no
 * atenuar: parece bloqueada y no lo está.
 */
jest.mock('vue-router', () => ({
  useRoute: () => ({ fullPath: '/services' }),
  useRouter: () => ({ push: jest.fn() }),
}));

/**
 * El panel importa el hilo, el hilo las tarjetas, y esas llegan por
 * `useAddToBag` hasta `services-api`, que lee `import.meta.env` — algo que
 * ts-jest no compila a CommonJS. Los `stubs` no bastan: el import se iza antes
 * de montar nada. Se corta aquí, como en las otras tres suites del asistente.
 */
jest.mock('src/composables/booking/useAddToBag', () => ({
  useAddToBag: () => ({
    añadirServicio: jest.fn(),
    añadirVarios: jest.fn(),
  }),
}));

jest.mock('src/composables/assistant/useAssistant', () => {
  const { ref } = require('vue');
  const estado = {
    messages: ref([]),
    loading: ref(false),
    error: ref(null),
    aviso: ref(null),
    send: jest.fn(),
    reset: jest.fn(),
  };
  return { useAssistant: () => estado };
});

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { nextTick } from 'vue';
import { enableAutoUnmount, mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import AssistantPanel from 'src/components/assistant/AssistantPanel.vue';
import { useAssistant } from 'src/composables/assistant/useAssistant';
import { useAssistantPanel } from 'src/composables/assistant/useAssistantPanel';
import { useAuthStore } from 'src/stores/auth-store';

const estado = useAssistant() as unknown as {
  messages: { value: unknown[] };
  loading: { value: boolean };
  error: { value: string | null };
  aviso: { value: string | null };
  send: jest.Mock;
};

const FUENTE = readFileSync(
  join(__dirname, '../../src/components/assistant/AssistantPanel.vue'),
  'utf8'
);

/**
 * Los dobles declaran sus props a propósito: la decisión de QUÉ chips se
 * ofrecen es del armazón, y se comprueba leyendo lo que les pasa. Un doble sin
 * `props` devuelve `undefined` y la prueba no verificaría nada.
 */
const stubs = {
  AssistantThread: {
    name: 'AssistantThread',
    props: ['mensajes', 'cargando', 'error'],
    template: '<div class="hilo" />',
  },
  AssistantComposer: {
    name: 'AssistantComposer',
    props: ['chips', 'cargando'],
    emits: ['enviar', 'chip'],
    template: '<div class="redactor" />',
  },
};

function montar({ conSesion = false } = {}) {
  const pinia = createPinia();
  const wrapper = mount(AssistantPanel, {
    attachTo: document.body,
    global: { plugins: [pinia], stubs },
  });
  if (conSesion) useAuthStore(pinia).token = 'un-token';
  return wrapper;
}

/**
 * Cada caso desmonta su panel. No es higiene: el panel escucha el teclado en
 * `document`, así que un montaje que sobreviva al caso sigue oyendo `Escape` y
 * cierra paneles de casos siguientes. Con esto, «deja de escuchar al
 * desmontarse» comprueba lo que dice.
 */
enableAutoUnmount(afterEach);

beforeEach(() => {
  estado.messages.value = [];
  estado.loading.value = false;
  estado.error.value = null;
  estado.aviso.value = null;
  estado.send.mockReset();
  const panel = useAssistantPanel();
  panel.consumirPendiente();
  // Se abre antes de cada caso: si no, «Escape cierra» pasaría por no haberse
  // abierto nunca, que es la peor clase de prueba verde.
  panel.abrir();
});

describe('AssistantPanel', () => {
  it('es un diálogo con nombre', () => {
    const panel = montar();

    expect(panel.get('[role="dialog"]').attributes('aria-label')).toMatch(
      /asistente/i
    );
    expect(panel.get('[role="dialog"]').attributes('aria-modal')).toBe('true');
  });

  it('Escape lo cierra', async () => {
    const wrapper = montar();

    await wrapper.get('[role="dialog"]').trigger('keydown', { key: 'Escape' });

    expect(useAssistantPanel().abierto.value).toBe(false);
  });

  it('pulsar el velo lo cierra', async () => {
    const wrapper = montar();

    await wrapper.get('[data-test="velo"]').trigger('click');

    expect(useAssistantPanel().abierto.value).toBe(false);
  });

  it('pulsar dentro del panel NO lo cierra', async () => {
    const wrapper = montar();

    await wrapper.get('[role="dialog"]').trigger('click');

    expect(useAssistantPanel().abierto.value).toBe(true);
  });

  it('el botón de la cabecera lo cierra, y se nombra una sola vez', async () => {
    const wrapper = montar();
    const boton = wrapper.get('[data-test="cerrar"]');

    expect(boton.attributes('aria-label')).toBe('Cerrar el asistente');
    await boton.trigger('click');

    expect(useAssistantPanel().abierto.value).toBe(false);
  });

  it('al abrirse el foco entra en el panel', () => {
    const wrapper = montar();

    expect(document.activeElement).toBe(wrapper.get('[role="dialog"]').element);
  });

  it('al cerrarse el foco vuelve a donde estaba', async () => {
    const antes = document.createElement('button');
    document.body.appendChild(antes);
    antes.focus();

    const wrapper = montar();
    wrapper.unmount();
    // La devolución espera un parche: el flotante vuelve en el mismo en que se
    // va el panel, así que buscarlo antes no encontraría nada.
    await nextTick();

    expect(document.activeElement).toBe(antes);
    antes.remove();
  });

  /**
   * Spec §5.2: el foco no se escapa a la página de detrás. Sin esto, tabular
   * desde el último control lleva al menú de una página atenuada que parece
   * bloqueada y no lo está.
   */
  it('el tabulador no se escapa del panel: del último vuelve al primero', async () => {
    const wrapper = montar();
    const dialogo = wrapper.get('[role="dialog"]');
    const focables =
      dialogo.element.querySelectorAll<HTMLElement>('button, a[href]');
    const primero = focables[0];
    const ultimo = focables[focables.length - 1];
    expect(ultimo).not.toBe(primero);
    ultimo.focus();

    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', cancelable: true })
    );
    await nextTick();

    // El destino, no la contención: jsdom no mueve el foco con un Tab
    // sintético, así que «sigue dentro» da verde sin cerrojo ninguno.
    expect(document.activeElement).toBe(primero);
  });

  it('y con shift, del primero al último', async () => {
    const wrapper = montar();
    const dialogo = wrapper.get('[role="dialog"]');
    const focables =
      dialogo.element.querySelectorAll<HTMLElement>('button, a[href]');
    const primero = focables[0];
    const ultimo = focables[focables.length - 1];
    primero.focus();

    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey: true,
        cancelable: true,
      })
    );
    await nextTick();

    expect(document.activeElement).toBe(ultimo);
  });

  /**
   * Visto conduciendo el flujo de verdad, no en jsdom: al enviar el primer
   * mensaje la fila de chips se rehace —los de arranque dejan su sitio a los de
   * seguimiento—, el botón que tenía el foco desaparece del DOM y el navegador
   * devuelve el foco al `body`. Desde ahí, un `@keydown.esc` puesto en la
   * `<section>` no se entera de nada: `Escape` dejaba de cerrar el panel
   * justo después de la primera interacción, que es cuando alguien lo usa.
   */
  it('Escape cierra aunque el foco se haya ido del panel', async () => {
    montar();
    (document.activeElement as HTMLElement | null)?.blur();
    expect(document.activeElement).toBe(document.body);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await nextTick();

    expect(useAssistantPanel().abierto.value).toBe(false);
  });

  /** Lo mismo por el otro lado: el cerrojo no puede depender del foco actual. */
  it('el tabulador vuelve al panel aunque el foco se haya escapado', async () => {
    const wrapper = montar();
    (document.activeElement as HTMLElement | null)?.blur();

    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', cancelable: true })
    );
    await nextTick();

    expect(
      wrapper.get('[role="dialog"]').element.contains(document.activeElement)
    ).toBe(true);
  });

  it('deja de escuchar al desmontarse', async () => {
    const wrapper = montar();
    wrapper.unmount();
    useAssistantPanel().abrir();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await nextTick();

    // Si el oyente sobreviviera al desmontaje, este Escape cerraría un panel
    // que ya no está en pantalla — y con dos visitas al inicio habría dos.
    expect(useAssistantPanel().abierto.value).toBe(true);
  });

  /**
   * El panel dice `aria-modal="true"`, y eso promete que detrás no se puede
   * hacer nada. Sin bloquear el scroll la página de atrás se mueve igual: en
   * móvil el panel ES la pantalla, así que nada parece moverse, la clienta
   * insiste y acaba 700 px más abajo de una página que no eligió. Medido en
   * navegador antes de arreglarlo: 58 px en escritorio, 703 en móvil.
   */
  it('mientras está abierto, la página de detrás no se mueve', () => {
    // `html` además del `body`: bajo Quasar el que desplaza es `html`, y con
    // solo el cuerpo marcado la página seguía bajando (medido en navegador).
    const marcados = () =>
      [document.documentElement, document.body].filter((n) =>
        n.classList.contains('m-panel-abierto')
      ).length;

    expect(marcados()).toBe(0);

    const wrapper = montar();
    expect(marcados()).toBe(2);

    wrapper.unmount();
    expect(marcados()).toBe(0);
  });

  /**
   * El foco vuelve al flotante que lo abrió (spec §5.2). No basta con apuntar
   * `document.activeElement` al montar: el flotante es `v-if="!open"`, así que
   * Vue lo quita en el MISMO parche que monta el panel y para cuando corre
   * `onMounted` el foco ya está en el `body`. Quien navega con teclado acababa
   * en lo alto del documento cada vez que cerraba.
   */
  it('al cerrarse el foco vuelve al flotante que lo abrió', async () => {
    const lanzador = document.createElement('button');
    lanzador.dataset.test = 'fab';
    document.body.appendChild(lanzador);
    lanzador.focus();

    const wrapper = montar();
    // Lo que hace `v-if="!open"`: el flotante desaparece al abrirse el panel,
    // así que el elemento que apuntó `onMounted` ya no sirve para volver.
    lanzador.remove();
    expect(lanzador.isConnected).toBe(false);

    wrapper.unmount();
    // Y vuelve al cerrarse.
    document.body.appendChild(lanzador);
    await nextTick();

    expect(document.activeElement).toBe(lanzador);
    lanzador.remove();
  });

  it('enseña el aviso del servidor, y el de respaldo si no llegó ninguno', () => {
    expect(montar().get('[data-test="aviso"]').text()).toContain(
      'Asistente automático'
    );

    estado.aviso.value = 'Aviso que manda el servidor.';
    expect(montar().get('[data-test="aviso"]').text()).toBe(
      'Aviso que manda el servidor.'
    );
  });

  it('sin sesión avisa de que para reservar hay que entrar', () => {
    expect(montar().find('[data-test="sesion"]').exists()).toBe(true);
    expect(montar({ conSesion: true }).text()).toContain('inicia sesión');
  });

  it('ofrece los chips de intención mientras el hilo está vacío', () => {
    const chips = montar().getComponent({ name: 'AssistantComposer' }).props(
      'chips'
    ) as { label: string }[];

    expect(chips.length).toBeGreaterThan(0);
    expect(chips.map((c) => c.label)).toContain('Ver servicios');
  });

  it('el chip de «mis reservas» solo aparece con sesión iniciada', async () => {
    const sinSesion = montar()
      .getComponent({ name: 'AssistantComposer' })
      .props('chips') as { label: string }[];
    expect(sinSesion.map((c) => c.label)).not.toContain('Mis reservas');

    const conSesion = montar({ conSesion: true });
    await conSesion.vm.$nextTick();
    const chips = conSesion
      .getComponent({ name: 'AssistantComposer' })
      .props('chips') as { label: string }[];

    expect(chips.map((c) => c.label)).toContain('Mis reservas');
  });

  it('tras un listado de servicios ofrece seguir con la disponibilidad', () => {
    estado.messages.value = [
      {
        role: 'assistant',
        content: 'Esto tenemos:',
        presentaciones: [{ tipo: 'servicios', servicios: [] }],
      },
    ];

    const chips = montar().getComponent({ name: 'AssistantComposer' }).props(
      'chips'
    ) as { label: string }[];

    expect(chips).toHaveLength(1);
    expect(chips[0].label).toBe('Ver disponibilidad');
  });

  it('no ofrece seguimiento cuando el turno no presentó nada', () => {
    estado.messages.value = [{ role: 'assistant', content: 'Hola' }];

    const chips = montar().getComponent({ name: 'AssistantComposer' }).props(
      'chips'
    );

    expect(chips).toEqual([]);
  });

  it('el chip manda su pregunta entera por el hilo', async () => {
    const wrapper = montar();

    await wrapper
      .getComponent({ name: 'AssistantComposer' })
      .vm.$emit('chip', { label: 'x', prompt: '¿Qué servicios tienen?', tool: 't' });

    expect(estado.send).toHaveBeenCalledWith('¿Qué servicios tienen?');
  });

  /**
   * Si el panel se abrió desde un chip del inicio, llega con su pregunta puesta
   * y se envía sola: tocar «Ver disponibilidad» y encontrarse una caja vacía
   * obligaría a escribir con el dedo lo que ya se había pedido con el dedo.
   */
  it('consume la pregunta pendiente del inicio al montarse', async () => {
    useAssistantPanel().abrirCon('¿Qué horarios tienen mañana?');

    const wrapper = montar();
    await wrapper.vm.$nextTick();

    expect(estado.send).toHaveBeenCalledWith('¿Qué horarios tienen mañana?');
    expect(useAssistantPanel().consumirPendiente()).toBeNull();
  });

  /**
   * Punto 3 del enfoque de revisión: con `100vh`, en un móvil el teclado
   * virtual tapa el campo de texto y no se puede escribir. `100dvh` sigue al
   * viewport visible.
   */
  it('en móvil mide el alto visible, no el de la pantalla', () => {
    expect(FUENTE).toContain('100dvh');
  });

  /**
   * `dvh` es el valor bueno, pero llega en Chrome 108, Firefox 101 y Safari
   * 15.4, y NF06 (Tabla 44) promete **Chrome 87+, Firefox 78+, Edge 88+ y
   * Safari 13.1+**. En todos esos el navegador tira la declaración al
   * analizarla: sin una anterior con `100vh`, en móvil sobrevive el
   * `height: 848px` de la regla base con `max-height: none`, el panel sale más
   * alto que la pantalla y el campo de texto queda debajo del borde — sin
   * scroll que lo rescate, porque la caja es `fixed` con `overflow: hidden`.
   * La clienta no puede escribir. Cada `100dvh` necesita su `100vh` delante.
   */
  it('cae a 100vh en los navegadores que la tesis promete soportar', () => {
    const conDvh = [
      ...FUENTE.matchAll(/(max-height|height):\s*([^;]*100dvh[^;]*);/g),
    ];

    expect(conDvh.length).toBeGreaterThan(0);
    for (const [, propiedad, valor] of conDvh) {
      const respaldo = `${propiedad}: ${valor.replace('100dvh', '100vh')};`;
      expect(FUENTE.indexOf(respaldo)).toBeGreaterThan(-1);
      // Y delante, que si no gana el respaldo.
      expect(FUENTE.indexOf(respaldo)).toBeLessThan(
        FUENTE.indexOf(`${propiedad}: ${valor};`)
      );
    }
  });

  /** Punto 5: quien pidió menos movimiento no recibe una animación de entrada. */
  it('respeta prefers-reduced-motion', () => {
    expect(FUENTE).toContain('prefers-reduced-motion');
  });

  /** Ningún hexadecimal suelto: todo color sale de `var(--m-*)`. */
  it('no pinta con hexadecimales sueltos', () => {
    const estilos = FUENTE.slice(FUENTE.indexOf('<style'));

    expect(estilos).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});
