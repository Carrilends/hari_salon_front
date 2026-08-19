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

/** Instancia con Bearer token para endpoints admin de reservas. */
export const adminReservationsApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

adminReservationsApi.interceptors.request.use((config) => {
  const auth = useAuthStore();
  if (auth.token) {
    config.headers = config.headers ?? {};
    config.headers['Authorization'] = `Bearer ${auth.token}`;
  }
  return config;
});

attachRefreshInterceptor(reservationsApi);
attachRefreshInterceptor(adminReservationsApi);

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
  const { data } = await adminReservationsApi.get<ReservationDto[]>(
    '/reservations'
  );
  return data;
}

export async function deleteReservation(id: string): Promise<void> {
  await adminReservationsApi.delete(`/reservations/${id}`);
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
