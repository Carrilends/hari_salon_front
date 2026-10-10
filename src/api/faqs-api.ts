import { adminServiceApi, servicesApi } from 'src/api/services-api';
import type {
  CreateFaqBody,
  FaqItem,
  UpdateFaqBody,
} from 'src/api/apiTypes';

/**
 * Las preguntas frecuentes contra el backend (`hair_salon_back/src/faqs`).
 *
 * La lectura es pública (`servicesApi`); todo lo que escribe es de la dueña y
 * va con `adminServiceApi`, que pone su token. Las rutas son relativas a
 * `VITE_API_URL`, que ya incluye `/api`.
 */

/** Nombre del contrato §4.6 de la hoja de ruta. */
export type Faq = FaqItem;

export async function listarPreguntas(): Promise<Faq[]> {
  const { data } = await servicesApi.get<Faq[]>('/faqs');
  return data;
}

export async function crearPregunta(body: CreateFaqBody): Promise<Faq> {
  const { data } = await adminServiceApi.post<Faq>('/faqs', body);
  return data;
}

export async function editarPregunta(
  id: string,
  body: UpdateFaqBody
): Promise<Faq> {
  const { data } = await adminServiceApi.patch<Faq>(`/faqs/${id}`, body);
  return data;
}

export async function borrarPregunta(
  id: string
): Promise<{ deleted: boolean }> {
  const { data } = await adminServiceApi.delete<{ deleted: boolean }>(
    `/faqs/${id}`
  );
  return data;
}

/**
 * `PATCH /api/faqs/orden`: los ids de TODAS las preguntas en el orden deseado.
 * Devuelve la lista ya ordenada. 400 si los ids no son exactamente los que hay.
 */
export async function reordenarPreguntas(ids: string[]): Promise<Faq[]> {
  const { data } = await adminServiceApi.patch<Faq[]>('/faqs/orden', { ids });
  return data;
}
