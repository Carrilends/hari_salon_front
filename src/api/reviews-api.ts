import { adminServiceApi } from './services-api';
import type { CreateReviewBody, CreateReviewResponse } from './apiTypes';

/**
 * `POST /reviews` (`hair_salon_back/src/reviews/reviews.controller.ts`): exige
 * sesión (`@Auth()`), la dueña recibe 403 y no hay moderación —la reseña sale
 * en Testimonios en cuanto se crea—. Va por `adminServiceApi` porque es la
 * instancia que añade el Bearer; el 401 lo intenta renovar el interceptor.
 */
export async function crearResena(
  cuerpo: CreateReviewBody
): Promise<CreateReviewResponse> {
  const { data } = await adminServiceApi.post<CreateReviewResponse>(
    '/reviews',
    cuerpo
  );
  return data;
}
