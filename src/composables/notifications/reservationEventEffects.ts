import type { QueryKey } from '@tanstack/vue-query';
import type { ReservationEvent } from 'src/interfaces/booking';
import { queryKeys } from 'src/api/query-keys';
import { assertNever } from 'src/helpers/assertNever';

/** Zona del salón (America/Bogota); el servidor puede correr en UTC. */
const SALON_TZ = 'America/Bogota';

export function formatSalonDateTime(iso: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: SALON_TZ,
  }).format(new Date(iso));
}

export interface ReservationNotice {
  type: 'positive' | 'warning' | 'info';
  icon: string;
  message: string;
  caption: string;
}

export interface ReservationEventEffects {
  notice: ReservationNotice;
  invalidate: readonly QueryKey[];
}

/** Lo que cambia cuando una reserva aparece, se cancela o se mueve. */
const WINDOW_AND_LIST: readonly QueryKey[] = [
  queryKeys.reservations.all,
  queryKeys.occupancy.all,
  queryKeys.workerAvailability.all,
];

/** Confirmar no toca la ventana: solo cambia el estado de una fila. */
const LIST_ONLY: readonly QueryKey[] = [queryKeys.reservations.all];

/**
 * Tabla «evento → qué aviso mostrar + qué consultas invalidar». Pura: sin Vue,
 * sin socket y sin `queryClient`, para probarla entera sin levantar nada.
 *
 * La lista del panel solo trae reservas activas, así que tras una cancelación
 * la fila desaparece al refrescar: el aviso es lo único que explica por qué.
 */
export function reservationEventEffects(
  event: ReservationEvent,
  formatDateTime: (iso: string) => string = formatSalonDateTime
): ReservationEventEffects {
  const who = event.customerName;
  switch (event.type) {
    case 'reservation.created':
      return {
        notice: {
          type: 'positive',
          icon: 'event_available',
          message: `Nueva reserva de ${who}`,
          caption: formatDateTime(event.scheduledAt),
        },
        invalidate: WINDOW_AND_LIST,
      };
    case 'reservation.cancelled':
      return {
        notice: {
          type: 'warning',
          icon: 'event_busy',
          message: event.byAdmin
            ? `Cancelada por la peluquería: ${who}`
            : `${who} canceló su cita`,
          caption: formatDateTime(event.scheduledAt),
        },
        invalidate: WINDOW_AND_LIST,
      };
    case 'reservation.rescheduled':
      return {
        notice: {
          type: 'info',
          icon: 'update',
          message: event.byAdmin
            ? `La peluquería movió la cita de ${who}`
            : `${who} movió su cita`,
          caption: `${formatDateTime(event.previousScheduledAt)} → ${formatDateTime(event.scheduledAt)}`,
        },
        invalidate: WINDOW_AND_LIST,
      };
    case 'reservation.confirmed':
      return {
        notice: {
          type: 'positive',
          icon: 'check_circle',
          message: `Confirmada: ${who}`,
          caption: formatDateTime(event.scheduledAt),
        },
        invalidate: LIST_ONLY,
      };
    default:
      // Si el backend emite un quinto evento, que falle al compilar, no en producción.
      return assertNever(event, 'evento de reserva');
  }
}
