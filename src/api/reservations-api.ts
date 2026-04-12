import axios from 'axios';
import type { ReservationOccupancyResponse } from 'src/helpers/booking-occupancy';

/** Base `.../api`; rutas como `/reservations`. */
export const reservationsApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
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
