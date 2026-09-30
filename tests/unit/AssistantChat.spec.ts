/**
 * Primera prueba de componente del proyecto. Es una red de seguridad, no una
 * especificación nueva: fija cómo pinta hoy el widget del asistente para que las
 * tarjetas y los chips que vienen después no rompan nada sin avisar.
 *
 * La aserción que de verdad importa es la última: el texto del asistente lo
 * escribe un modelo que reinyecta nombres del catálogo, así que **nunca** puede
 * interpretarse como HTML. Si alguien mete un `v-html` en la burbuja, esta
 * prueba se pone roja.
 */
jest.mock('vue-router', () => ({
  useRoute: () => ({ fullPath: '/services' }),
  useRouter: () => ({ push: jest.fn() }),
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

import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import AssistantChat from 'src/components/assistant/AssistantChat.vue';
import PackageProposalCard from 'src/components/assistant/PackageProposalCard.vue';
import { useAssistant } from 'src/composables/assistant/useAssistant';

const estado = useAssistant() as unknown as {
  messages: { value: unknown[] };
  loading: { value: boolean };
  error: { value: string | null };
  aviso: { value: string | null };
};

/**
 * Los componentes de Quasar se auto-importan en tiempo de build; en Jest no
 * existe esa transformación, así que se registran equivalentes mínimos. Se usan
 * `components` y no `stubs` a propósito: así el contenido de las tarjetas se
 * pinta de verdad y se puede afirmar sobre él.
 */
const contenedor = { template: '<div><slot /></div>' };
const quasar = {
  'q-card': contenedor,
  'q-card-section': contenedor,
  'q-card-actions': contenedor,
  'q-list': contenedor,
  'q-item': contenedor,
  'q-item-section': contenedor,
  'q-btn': {
    props: ['label'],
    template: '<button type="button">{{ label }}<slot /></button>',
  },
  'q-input': {
    props: ['modelValue'],
    template: '<input :value="modelValue" />',
  },
};

function montar() {
  return mount(AssistantChat, {
    global: { plugins: [createPinia()], components: quasar },
  });
}

const PROPUESTA = {
  evento: 'boda',
  completa: true,
  total: 150000,
  minutos: 120,
  lineas: [
    {
      serviceId: 's1',
      nombre: 'Recogido de novia',
      precio: 150000,
      minutos: 120,
      categoria: 'Novia',
    },
  ],
  serviciosIds: ['s1'],
  omitidas: [],
};

describe('AssistantChat', () => {
  beforeEach(() => {
    estado.messages.value = [];
    estado.loading.value = false;
    estado.error.value = null;
    estado.aviso.value = null;
  });

  it('muestra el estado vacío mientras no hay mensajes', () => {
    const w = montar();

    expect(w.find('.assistant-chat__empty').exists()).toBe(true);
  });

  it('pinta cada mensaje en su burbuja, con el papel de quien lo escribió', () => {
    estado.messages.value = [
      { role: 'user', content: 'quiero un corte' },
      { role: 'assistant', content: 'Corte clásico: 25000 pesos (30 minutos)' },
    ];

    const w = montar();
    const burbujas = w.findAll('.assistant-bubble');

    expect(w.find('.assistant-chat__empty').exists()).toBe(false);
    expect(burbujas).toHaveLength(2);
    expect(burbujas[0].classes()).toContain('user');
    expect(burbujas[0].text()).toBe('quiero un corte');
    expect(burbujas[1].classes()).toContain('assistant');
    expect(burbujas[1].text()).toBe('Corte clásico: 25000 pesos (30 minutos)');
  });

  it('pinta la tarjeta del paquete cuando la respuesta trae una propuesta', () => {
    estado.messages.value = [
      { role: 'assistant', content: 'Te propongo esto:', propuesta: PROPUESTA },
    ];

    const w = montar();
    const tarjeta = w.findComponent(PackageProposalCard);

    expect(tarjeta.exists()).toBe(true);
    expect(tarjeta.text()).toContain('Recogido de novia');
  });

  it('no pinta tarjeta cuando la respuesta no trae propuesta', () => {
    estado.messages.value = [{ role: 'assistant', content: 'Hola' }];

    expect(montar().findComponent(PackageProposalCard).exists()).toBe(false);
  });

  it('NO interpreta el texto del asistente como HTML', () => {
    // Lo escribe un modelo que reinyecta nombres que un admin teclea en el
    // panel: si esto se pintara con `v-html`, sería inyección indirecta en una
    // página donde el token de sesión vive en memoria, en el mismo contexto.
    const veneno = '<img src=x onerror="window.__roto=1"> **negrita**';
    estado.messages.value = [{ role: 'assistant', content: veneno }];

    const burbuja = montar().find('.assistant-bubble.assistant');

    expect(burbuja.element.querySelector('img')).toBeNull();
    expect(burbuja.text()).toContain('<img src=x');
    expect(burbuja.text()).toContain('**negrita**');
  });

  it('muestra el error del composable como alerta accesible', () => {
    estado.error.value = 'No pude responder en este momento.';

    const w = montar();

    expect(w.find('[role="alert"]').text()).toBe(
      'No pude responder en este momento.'
    );
  });
});
