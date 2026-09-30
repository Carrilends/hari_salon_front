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
import ServiceListCard from 'src/components/assistant/ServiceListCard.vue';
import { useAssistant } from 'src/composables/assistant/useAssistant';
import { useAuthStore } from 'src/stores/auth-store';

const estado = useAssistant() as unknown as {
  messages: { value: unknown[] };
  loading: { value: boolean };
  error: { value: string | null };
  aviso: { value: string | null };
  send: jest.Mock;
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
  'q-img': {
    props: ['src', 'srcset'],
    template: '<img :src="src" :srcset="srcset" />',
  },
  'q-chip': {
    props: ['label'],
    emits: ['click'],
    template:
      '<button type="button" class="q-chip" @click="$emit(\'click\')">{{ label }}<slot /></button>',
  },
};

function montar({ conSesion = false } = {}) {
  const pinia = createPinia();
  const w = mount(AssistantChat, {
    global: { plugins: [pinia], components: quasar },
  });
  if (conSesion) useAuthStore(pinia).token = 'un-token';
  return w;
}

const PAQUETE = {
  tipo: 'paquete' as const,
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

const SERVICIOS = {
  tipo: 'servicios' as const,
  servicios: [
    { id: 's1', nombre: 'Corte clásico', precio: 25000, minutos: 30 },
  ],
};

describe('AssistantChat', () => {
  beforeEach(() => {
    estado.messages.value = [];
    estado.loading.value = false;
    estado.error.value = null;
    estado.aviso.value = null;
    estado.send.mockReset();
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

  it('pinta la tarjeta del paquete cuando llega una presentación de paquete', () => {
    estado.messages.value = [
      {
        role: 'assistant',
        content: 'Te propongo esto:',
        presentaciones: [PAQUETE],
      },
    ];

    const w = montar();
    const tarjeta = w.findComponent(PackageProposalCard);

    expect(tarjeta.exists()).toBe(true);
    expect(tarjeta.text()).toContain('Recogido de novia');
  });

  it('pinta la tarjeta de servicios cuando llega una presentación de servicios', () => {
    estado.messages.value = [
      {
        role: 'assistant',
        content: 'Esto es lo que tenemos:',
        presentaciones: [SERVICIOS],
      },
    ];

    const tarjeta = montar().findComponent(ServiceListCard);

    expect(tarjeta.exists()).toBe(true);
    expect(tarjeta.text()).toContain('Corte clásico');
  });

  it('pinta las dos tarjetas de un mismo turno, en orden', () => {
    estado.messages.value = [
      {
        role: 'assistant',
        content: 'Mira:',
        presentaciones: [PAQUETE, SERVICIOS],
      },
    ];

    const w = montar();

    expect(w.findComponent(PackageProposalCard).exists()).toBe(true);
    expect(w.findComponent(ServiceListCard).exists()).toBe(true);
  });

  it('no pinta tarjetas cuando la respuesta no trae presentaciones', () => {
    estado.messages.value = [{ role: 'assistant', content: 'Hola' }];

    const w = montar();

    expect(w.findComponent(PackageProposalCard).exists()).toBe(false);
    expect(w.findComponent(ServiceListCard).exists()).toBe(false);
  });

  it('al elegir un servicio de la tarjeta, sigue la conversación por el hilo', async () => {
    estado.messages.value = [
      {
        role: 'assistant',
        content: 'Esto tenemos:',
        presentaciones: [SERVICIOS],
      },
    ];

    const w = montar();
    await w.findComponent(ServiceListCard).vm.$emit('select', {
      id: 's1',
      nombre: 'Corte clásico',
      precio: 25000,
      minutos: 30,
    });

    // No abre otra pantalla: escribe en el chat, como «Reservar este paquete».
    expect(estado.send).toHaveBeenCalledWith(
      expect.stringContaining('Corte clásico')
    );
  });

  it('ofrece chips de intención en el estado vacío, no solo texto', async () => {
    const w = montar();
    const chips = w.findAll('.assistant-chat__chips .q-chip');

    expect(chips.length).toBeGreaterThan(0);
    await chips[0].trigger('click');

    expect(estado.send).toHaveBeenCalledWith(expect.any(String));
  });

  it('el chip de «mis reservas» solo aparece con sesión iniciada', async () => {
    const textoSinSesion = montar().find('.assistant-chat__chips').text();
    expect(textoSinSesion).not.toContain('Mis reservas');

    const conSesion = montar({ conSesion: true });
    await conSesion.vm.$nextTick();
    expect(conSesion.find('.assistant-chat__chips').text()).toContain(
      'Mis reservas'
    );
  });

  it('tras un listado de servicios ofrece seguir con la disponibilidad', async () => {
    estado.messages.value = [
      {
        role: 'assistant',
        content: 'Esto tenemos:',
        presentaciones: [SERVICIOS],
      },
    ];

    const w = montar();
    const seguimiento = w.findAll('.assistant-chat__followup .q-chip');

    expect(seguimiento.length).toBe(1);
    await seguimiento[0].trigger('click');
    expect(estado.send).toHaveBeenCalledTimes(1);
  });

  it('no ofrece seguimiento cuando el turno no presentó nada', () => {
    estado.messages.value = [{ role: 'assistant', content: 'Hola' }];

    expect(montar().find('.assistant-chat__followup').exists()).toBe(false);
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
