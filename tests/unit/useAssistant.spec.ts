jest.mock('src/api/assistant-api', () => ({
  sendAssistantMessage: jest.fn(),
}));

import { sendAssistantMessage } from 'src/api/assistant-api';
import { useAssistant } from 'src/composables/assistant/useAssistant';

const mockSend = sendAssistantMessage as jest.Mock;

describe('useAssistant', () => {
  beforeEach(() => {
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

  it('adjunta la propuesta de paquete al mensaje del asistente cuando la trae (T7)', async () => {
    const propuesta = {
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
    mockSend.mockResolvedValue({
      conversationId: 'c1',
      reply: 'Aquí tienes tu paquete.',
      propuesta,
    });
    const a = useAssistant();

    await a.send('me caso');

    const last = a.messages.value[a.messages.value.length - 1];
    expect(last.role).toBe('assistant');
    expect(last.propuesta).toEqual(propuesta);
  });

  it('no adjunta propuesta cuando la respuesta no la trae', async () => {
    mockSend.mockResolvedValue({ conversationId: 'c1', reply: 'Hola' });
    const a = useAssistant();

    await a.send('hola');

    const last = a.messages.value[a.messages.value.length - 1];
    expect(last.propuesta).toBeUndefined();
  });
});
