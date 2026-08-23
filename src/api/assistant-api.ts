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

/** Una línea de una propuesta de paquete (Fase 6, T7). */
export interface PackageProposalLine {
  serviceId: string;
  nombre: string;
  precio: number;
  minutos: number;
  categoria: string;
}

/** Una categoría que el compositor no pudo incluir, con su motivo. */
export interface PackageProposalOmission {
  categoria: string;
  motivo: string;
}

/**
 * Propuesta de paquete por evento que el backend surfacea junto al texto cuando
 * el asistente la compone (herramienta `componerPaquete`). El widget la pinta como
 * tarjeta; el total y la duración se muestran ANTES de confirmar.
 */
export interface PackageProposal {
  evento: string;
  completa: boolean;
  total: number;
  minutos: number;
  lineas: PackageProposalLine[];
  serviciosIds: string[];
  omitidas: PackageProposalOmission[];
  fecha?: string;
}

export interface AssistantReply {
  conversationId?: string;
  reply: string;
  /** Aviso legal, presente en la primera respuesta de cada conversación (RF59). */
  aviso?: string;
  /** Propuesta de paquete estructurada, cuando el asistente compone una (T7). */
  propuesta?: PackageProposal;
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
