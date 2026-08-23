import axios from 'axios';
import type { ReservationOccupancyResponse } from 'src/helpers/booking-occupancy';
import type { ReservationDto } from 'src/interfaces/booking';
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
 * Crea una reserva desde el portal público (Fase 4). Va por `reservationsApi`
 * (sin Bearer): la reserva es anónima, así que el back exige `contact`.
 */
export async function createReservation(
  payload: CreateReservationPayload
): Promise<ReservationDto> {
  const { data } = await reservationsApi.post<ReservationDto>(
    '/reservations',
    payload
  );
  return data;
}
