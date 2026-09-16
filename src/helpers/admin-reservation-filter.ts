import type { ReservationDto } from 'src/interfaces/booking';

/**
 * Estados por los que puede filtrar el panel. Solo los que la lista puede
 * contener: `GET /reservations` devuelve las reservas **vigentes** (ventana no
 * terminada y no canceladas), así que «cumplida» y «cancelada» nunca llegan y
 * ofrecerlas era prometer una lista vacía. Si algún día se quiere un histórico,
 * es el endpoint el que tiene que cambiar, no este filtro.
 */
export type AdminReservationFilter = 'pendiente' | 'confirmada' | 'todas';

export const ADMIN_RESERVATION_FILTERS: {
  label: string;
  value: AdminReservationFilter;
}[] = [
  { label: 'Pendientes', value: 'pendiente' },
  { label: 'Confirmadas', value: 'confirmada' },
  { label: 'Todas', value: 'todas' },
];

export function filterAdminReservations(
  list: readonly ReservationDto[],
  filter: AdminReservationFilter
): ReservationDto[] {
  if (filter === 'todas') return [...list];
  return list.filter((r) => r.status === filter);
}
