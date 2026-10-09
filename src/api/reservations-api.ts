import axios from 'axios';
import type { ReservationOccupancyResponse } from 'src/helpers/booking-occupancy';
import type {
  ReservationDto,
  RescheduledReservationDto,
} from 'src/interfaces/booking';
import { useAuthStore } from 'src/stores/auth-store';
import { attachRefreshInterceptor } from './refresh-interceptor';

/** Base `.../api`; rutas como `/reservations`. */
export const reservationsApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

/**
 * Instancia con Bearer token para endpoints de reservas que exigen sesión: los
 * de administración y también «mis reservas» de una clienta normal (Fase 6).
 */
export const authedReservationsApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

authedReservationsApi.interceptors.request.use((config) => {
  const auth = useAuthStore();
  if (auth.token) {
    config.headers = config.headers ?? {};
    config.headers['Authorization'] = `Bearer ${auth.token}`;
  }
  return config;
});

attachRefreshInterceptor(reservationsApi);
attachRefreshInterceptor(authedReservationsApi);

export async function fetchReservationOccupancy(
  fromYmd: string,
  toYmd: string
): Promise<ReservationOccupancyResponse> {
  const { data } = await reservationsApi.get<ReservationOccupancyResponse>(
    '/reservations/occupancy',
    { params: { from: fromYmd, to: toYmd } }
  );
  return data;
}

export async function fetchAllReservations(): Promise<ReservationDto[]> {
  const { data } = await authedReservationsApi.get<ReservationDto[]>(
    '/reservations'
  );
  return data;
}

/**
 * Reservas de la clienta con sesión iniciada (`GET /reservations/me`). La
 * identidad sale del JWT en el backend; el cliente no envía ningún userId.
 */
export async function fetchMyReservations(): Promise<ReservationDto[]> {
  const { data } = await authedReservationsApi.get<ReservationDto[]>(
    '/reservations/me'
  );
  return data;
}

export async function deleteReservation(id: string): Promise<void> {
  await authedReservationsApi.delete(`/reservations/${id}`);
}

/** Confirma una reserva pendiente (solo administración). */
export async function confirmReservation(id: string): Promise<void> {
  await authedReservationsApi.patch(`/reservations/${id}/confirm`);
}

/**
 * Mueve una reserva a otra fecha y hora. Conserva id, servicios y estado.
 *
 * La estilista **puede cambiar**: solo si la repartió el sistema —quien la
 * eligió conserva la suya—. Por eso se devuelve la reserva actualizada y no
 * `void`: su `workerId` es lo que permite decirle a la clienta que la
 * reasignaron, comparándolo con el que ya tenía en pantalla.
 */
export async function rescheduleReservation(
  id: string,
  scheduledAt: string
): Promise<RescheduledReservationDto> {
  const { data } = await authedReservationsApi.patch<RescheduledReservationDto>(
    `/reservations/${id}/reschedule`,
    { scheduledAt }
  );
  return data;
}

/** Cancela una reserva (administración; el back registra quién la cancela). */
export async function cancelReservation(id: string): Promise<void> {
  await authedReservationsApi.patch(`/reservations/${id}/cancel`);
}

/** Carga para crear una reserva; coincide con `CreateReservationDto` del back. */
export interface CreateReservationPayload {
  scheduledAt: string;
  serviceIds: string[];
  workerId?: string;
  contact?: { name: string; phone: string; email?: string };
}

/**
 * Crea una reserva desde el portal (Fase 4; cajón de reserva, plan 1 de las
 * vistas). Va por `authedReservationsApi`, que añade el Bearer **solo si hay
 * sesión**: con sesión, `OptionalJwtAuthGuard` liga la reserva a la cuenta
 * (`userId`) y el back ya no exige `contact`; sin sesión sale anónima, como
 * antes, y el back exige `contact`. Hasta el plan 1 iba por `reservationsApi`
 * (sin Bearer) y la reserva de una clienta con sesión no aparecía en «Mis
 * reservas».
 *
 * Responde el agregado serializado: trae `workerId`, no `worker`.
 */
export async function createReservation(
  payload: CreateReservationPayload
): Promise<ReservationDto> {
  const { data } = await authedReservationsApi.post<ReservationDto>(
    '/reservations',
    payload
  );
  return data;
}
