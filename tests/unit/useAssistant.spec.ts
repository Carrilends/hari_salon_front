jest.mock('src/api/assistant-api', () => ({
  sendAssistantMessage: jest.fn(),
}));

import { createPinia, setActivePinia } from 'pinia';

import { sendAssistantMessage } from 'src/api/assistant-api';
import { useAuthStore } from 'src/stores/auth-store';
import { useAssistant } from 'src/composables/assistant/useAssistant';

const mockSend = sendAssistantMessage as jest.Mock;

describe('useAssistant', () => {
  beforeEach(() => {
    // El estado es de módulo desde que el hilo sobrevive a cerrar el panel: sin
    // este reset, cada caso heredaría los mensajes del anterior.
    useAssistant().reset();
    mockSend.mockReset();
    sessionStorage.clear();
  });

  it('agrega el mensaje del usuario y la respuesta del asistente, y guarda el conversationId', async () => {
    mockSend.mockResolvedValue({
      conversationId: 'c1',
      reply: 'Tenemos Corte por $20.000.',
      aviso: 'Asistente automático con IA.',
    });
    const a = useAssistant();

    await a.send('quiero un corte');

    expect(a.messages.value).toEqual([
      { role: 'user', content: 'quiero un corte' },
      { role: 'assistant', content: 'Tenemos Corte por $20.000.' },
    ]);
    expect(a.aviso.value).toContain('Asistente automático');
    expect(sessionStorage.getItem('assistant-conversation-id')).toBe('c1');
  });

  it('reenvía el conversationId guardado en la siguiente petición', async () => {
    sessionStorage.setItem('assistant-conversation-id', 'cX');
    mockSend.mockResolvedValue({ conversationId: 'cX', reply: 'ok' });
    const a = useAssistant();

    await a.send('hola');

    expect(mockSend).toHaveBeenCalledWith({
      conversationId: 'cX',
      message: 'hola',
    });
  });

  it('ignora mensajes vacíos', async () => {
    const a = useAssistant();
    await a.send('   ');
    expect(mockSend).not.toHaveBeenCalled();
    expect(a.messages.value).toHaveLength(0);
  });

  it('ante un error deja un mensaje de error y conserva el turno del usuario', async () => {
    mockSend.mockRejectedValue(new Error('network'));
    const a = useAssistant();

    await a.send('hola');

    expect(a.error.value).toBeTruthy();
    expect(a.loading.value).toBe(false);
    expect(a.messages.value).toEqual([{ role: 'user', content: 'hola' }]);
  });

  it('reset limpia mensajes y el conversationId', async () => {
    sessionStorage.setItem('assistant-conversation-id', 'cX');
    mockSend.mockResolvedValue({ conversationId: 'cX', reply: 'ok' });
    const a = useAssistant();
    await a.send('hola');

    a.reset();

    expect(a.messages.value).toHaveLength(0);
    expect(sessionStorage.getItem('assistant-conversation-id')).toBeNull();
  });

  it('adjunta las presentaciones al mensaje del asistente cuando las trae', async () => {
    const paquete = {
      tipo: 'paquete',
      evento: 'boda',
      completa: true,
      total: 150000,
      minutos: 165,
      lineas: [
        {
          serviceId: 'r1',
          nombre: 'Recogido',
          precio: 60000,
          minutos: 60,
          categoria: 'Recogidos',
        },
      ],
      serviciosIds: ['r1'],
      omitidas: [],
    };
    const servicios = {
      tipo: 'servicios',
      servicios: [{ id: 's1', nombre: 'Corte', precio: 20000, minutos: 30 }],
    };
    mockSend.mockResolvedValue({
      conversationId: 'c1',
      reply: 'Aquí tienes tu paquete.',
      presentaciones: [paquete, servicios],
    });
    const a = useAssistant();

    await a.send('me caso');

    const last = a.messages.value[a.messages.value.length - 1];
    expect(last.role).toBe('assistant');
    expect(last.presentaciones).toEqual([paquete, servicios]);
  });

  it('no adjunta presentaciones cuando la respuesta no las trae', async () => {
    mockSend.mockResolvedValue({ conversationId: 'c1', reply: 'Hola' });
    const a = useAssistant();

    await a.send('hola');

    const last = a.messages.value[a.messages.value.length - 1];
    expect(last.presentaciones).toBeUndefined();
  });
});

/**
 * El panel se desmonta al cerrarlo (`v-if` en el lanzador). Si el estado nace y
 * muere con el componente, cerrar borra la conversación — y el backend, que
 * guarda el `conversationId` en sessionStorage, sigue recordándola. La pantalla
 * olvidaba lo que el servidor recordaba.
 */
describe('el hilo sobrevive al desmontaje', () => {
  beforeEach(() => {
    useAssistant().reset();
    mockSend.mockReset();
    sessionStorage.clear();
    mockSend.mockResolvedValue({ conversationId: 'c1', reply: 'Tenemos corte.' });
  });

  it('conserva los mensajes entre dos montajes', async () => {
    const primero = useAssistant();

    await primero.send('¿Qué servicios tienen?');
    expect(primero.messages.value.length).toBeGreaterThan(0);

    // Otro montaje del panel: misma conversación.
    const segundo = useAssistant();

    expect(segundo.messages.value).toEqual(primero.messages.value);
  });

  it('reset deja el hilo vacío para todos', async () => {
    const panel = useAssistant();
    await panel.send('hola');

    panel.reset();

    expect(useAssistant().messages.value).toEqual([]);
  });
});

/**
 * El hilo vive en ámbito de módulo y ya no muere al cerrar el panel, así que
 * cerrar sesión tiene que llevárselo: el gesto natural de fin de turno en un
 * ordenador compartido es **salir**, no recargar. Sin esto, la siguiente
 * persona abre el panel y lee la conversación de la anterior —y el asistente
 * tiene una herramienta `misReservas`, así que ahí puede haber sus citas, su
 * estilista y sus fechas—. Antes de subir el estado a módulo no pasaba, porque
 * cerrar el panel ya lo borraba: la fuga la introdujo esta tanda.
 */
describe('cerrar sesión no deja rastro de la conversación', () => {
  beforeEach(() => {
    useAssistant().reset();
    mockSend.mockReset();
    sessionStorage.clear();
    setActivePinia(createPinia());
  });

  it('logout vacía el hilo y el conversationId', async () => {
    mockSend.mockResolvedValue({ conversationId: 'c1', reply: 'tus citas son…' });
    await useAssistant().send('¿cuáles son mis reservas?');
    expect(useAssistant().messages.value.length).toBeGreaterThan(0);
    expect(sessionStorage.getItem('assistant-conversation-id')).toBe('c1');

    useAuthStore().logout();

    expect(useAssistant().messages.value).toEqual([]);
    expect(sessionStorage.getItem('assistant-conversation-id')).toBeNull();
  });
});
