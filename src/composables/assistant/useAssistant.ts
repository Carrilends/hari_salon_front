import { ref } from 'vue';
import {
  sendAssistantMessage,
  type AssistantPresentation,
} from 'src/api/assistant-api';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  /** Tarjetas adjuntas a una respuesta del asistente, en orden. */
  presentaciones?: AssistantPresentation[];
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
 * Estado del widget del asistente, **compartido por módulo**: el panel se
 * desmonta al cerrarlo y la conversación tiene que seguir ahí al volver a
 * abrirlo. Se borra al recargar la pestaña, nunca se guarda en el navegador: en
 * un ordenador compartido no debe quedar rastro.
 *
 * El `conversationId` vive en `sessionStorage` (no `localStorage`) desde antes,
 * por la misma razón. Sin dependencia de Vue Query: es estado de UI.
 */
const messages = ref<ChatMessage[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const aviso = ref<string | null>(null);
let conversationId = readConversationId();

export function useAssistant() {
  async function send(text: string): Promise<void> {
    const content = text.trim();
    if (!content || loading.value) return;

    error.value = null;
    messages.value.push({ role: 'user', content });
    loading.value = true;
    try {
      // `?? readConversationId()`: al ser de módulo, la lectura inicial ocurre al
      // importar — en la build de SSG eso pasa en Node, sin `sessionStorage`. Si
      // no hay id en memoria se vuelve a mirar el almacén de la pestaña, que es
      // donde el servidor dejó el hilo.
      const reply = await sendAssistantMessage({
        conversationId: conversationId ?? readConversationId(),
        message: content,
      });
      conversationId = reply.conversationId ?? conversationId;
      writeConversationId(conversationId);
      if (reply.aviso) aviso.value = reply.aviso;
      messages.value.push({
        role: 'assistant',
        content: reply.reply,
        ...(reply.presentaciones?.length
          ? { presentaciones: reply.presentaciones }
          : {}),
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
