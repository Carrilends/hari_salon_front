import axios from 'axios';
import { useAuthStore } from 'src/stores/auth-store';
import { attachRefreshInterceptor } from './refresh-interceptor';

/** Instancia para el asistente. Lleva el Bearer cuando hay sesión (A3): así el
 * backend saca el `userId` del JWT y no viaja PII por el chat. */
export const assistantApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

assistantApi.interceptors.request.use((config) => {
  const auth = useAuthStore();
  if (auth.token) {
    config.headers = config.headers ?? {};
    config.headers['Authorization'] = `Bearer ${auth.token}`;
  }
  return config;
});

attachRefreshInterceptor(assistantApi);

export interface SendAssistantMessagePayload {
  conversationId?: string;
  message: string;
}

export interface AssistantReply {
  conversationId?: string;
  reply: string;
  /** Aviso legal, presente en la primera respuesta de cada conversación (RF59). */
  aviso?: string;
}

export async function sendAssistantMessage(
  payload: SendAssistantMessagePayload
): Promise<AssistantReply> {
  const { data } = await assistantApi.post<AssistantReply>(
    '/assistant/messages',
    payload
  );
  return data;
}
