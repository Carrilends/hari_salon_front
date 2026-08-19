import type { ReservationStatus } from 'src/interfaces/booking';

export interface ReservationStatusMeta {
  label: string;
  color: string;
}

const META: Record<ReservationStatus, ReservationStatusMeta> = {
  pendiente: { label: 'Pendiente', color: 'orange' },
  confirmada: { label: 'Confirmada', color: 'positive' },
  cumplida: { label: 'Cumplida', color: 'blue' },
  cancelada: { label: 'Cancelada', color: 'negative' },
};

/** Etiqueta y color (paleta Quasar) para el distintivo de estado de una reserva. */
export function reservationStatusMeta(
  status: ReservationStatus
): ReservationStatusMeta {
  return META[status] ?? { label: String(status), color: 'grey' };
}
