import { ref } from 'vue';
import {
  sendAssistantMessage,
  type PackageProposal,
} from 'src/api/assistant-api';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  /** Propuesta de paquete adjunta a una respuesta del asistente (T7). */
  propuesta?: PackageProposal;
}

const STORAGE_KEY = 'assistant-conversation-id';

function readConversationId(): string | undefined {
  try {
    if (typeof sessionStorage === 'undefined') return undefined;
    return sessionStorage.getItem(STORAGE_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

function writeConversationId(id: string | undefined): void {
  try {
    if (typeof sessionStorage === 'undefined' || !id) return;
    sessionStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* almacenamiento no disponible: la conversación sigue en memoria */
  }
}

function clearConversationId(): void {
  try {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Estado del widget del asistente. El `conversationId` vive en `sessionStorage`
 * (no `localStorage`): la conversación no tiene por qué sobrevivir al cierre de
 * la pestaña. Sin dependencia de Vue Query: es estado de UI, no de servidor.
 */
export function useAssistant() {
  const messages = ref<ChatMessage[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const aviso = ref<string | null>(null);
  let conversationId = readConversationId();

  async function send(text: string): Promise<void> {
    const content = text.trim();
    if (!content || loading.value) return;

    error.value = null;
    messages.value.push({ role: 'user', content });
    loading.value = true;
    try {
      const reply = await sendAssistantMessage({
        conversationId,
        message: content,
      });
      conversationId = reply.conversationId ?? conversationId;
      writeConversationId(conversationId);
      if (reply.aviso) aviso.value = reply.aviso;
      messages.value.push({
        role: 'assistant',
        content: reply.reply,
        ...(reply.propuesta ? { propuesta: reply.propuesta } : {}),
      });
    } catch {
      error.value =
        'No pude responder en este momento. Inténtalo de nuevo o reserva por el flujo de siempre.';
    } finally {
      loading.value = false;
    }
  }

  function reset(): void {
    messages.value = [];
    error.value = null;
    aviso.value = null;
    conversationId = undefined;
    clearConversationId();
  }

  return { messages, loading, error, aviso, send, reset };
}
