import axios from 'axios';
import type { ReservationOccupancyResponse } from 'src/helpers/booking-occupancy';
import type { ReservationDto } from 'src/interfaces/booking';
import { useAuthStore } from 'src/stores/auth-store';

/** Base `.../api`; rutas como `/reservations`. */
export const reservationsApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

/** Instancia con Bearer token para endpoints admin de reservas. */
export const adminReservationsApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

adminReservationsApi.interceptors.request.use((config) => {
  const auth = useAuthStore();
  if (auth.token) {
    config.headers = config.headers ?? {};
    config.headers['Authorization'] = `Bearer ${auth.token}`;
  }
  return config;
});

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
