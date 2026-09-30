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

/**
 * Un servicio tal y como lo pinta la tarjeta del chat. La `imagen` solo existe
 * en este canal: el modelo nunca ve una URL, porque el contexto que se le manda
 * se paga en tokens y una de Cloudinary no le sirve para conversar.
 */
export interface PresentedService {
  id: string;
  nombre: string;
  precio: number;
  minutos: number;
  imagen?: string;
}

/** Listado de servicios del catálogo (herramienta `listarServicios`). */
export interface ServicesPresentation {
  tipo: 'servicios';
  servicios: PresentedService[];
}

/**
 * Propuesta de paquete. Es la misma forma de siempre con el discriminante
 * añadido: `PackageProposalCard` sigue recibiendo exactamente lo que recibía.
 */
export type PackagePresentation = PackageProposal & { tipo: 'paquete' };

/**
 * Lo que el backend adjunta a la respuesta para que el widget lo pinte. Unión
 * discriminada por `tipo`: una clase nueva de tarjeta es una variante más, no
 * un cambio en el contrato de las que ya existen.
 */
export type AssistantPresentation = PackagePresentation | ServicesPresentation;

export interface AssistantReply {
  conversationId?: string;
  reply: string;
  /** Aviso legal, presente en la primera respuesta de cada conversación (RF59). */
  aviso?: string;
  /**
   * Datos tipados del turno, en el orden en que las herramientas los
   * produjeron. Son varios desde el plan 03: un turno puede componer un paquete
   * y además listar servicios.
   */
  presentaciones?: AssistantPresentation[];
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
