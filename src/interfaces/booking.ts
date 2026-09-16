import type Service from './service';

/** Una fila en el carrito: un servicio y cuántas veces se reservó. */
export interface BookingLine {
  service: Service;
  quantity: number;
}

export type ReservationStatus =
  | 'pendiente'
  | 'confirmada'
  | 'cumplida'
  | 'cancelada';

/** Línea de servicio de una reserva (snapshot al momento de reservar). */
export interface ReservationServiceLine {
  serviceId: string | null;
  name: string;
  price: number;
  durationMinutes: number;
}

/** Reserva almacenada en el servidor (respuesta de GET /reservations). */
export interface ReservationDto {
  id: string;
  scheduledAt: string;
  endedAt: string;
  workerId: string;
  worker: { id: string; name: string; isDefault?: boolean };
  totalDurationMinutes: number;
  status: ReservationStatus;
  userId: string | null;
  contact: { name: string; phone: string; email?: string | null } | null;
  services: ReservationServiceLine[];
}

/**
 * Eventos en tiempo real que el backend emite por WebSocket a la sala de
 * administración (Fase 4 y Etapa 2 de WhatsApp). Unión discriminada por `type`.
 * Las fechas viajan como cadenas ISO tras serializarse a JSON.
 *
 * DEUDA: esto es una copia a mano de
 * `hair_salon_back/src/notifications/domain/events/notifiable-event.ts` y puede
 * divergir en silencio si el backend cambia un campo. Compartir los tipos entre
 * los dos repos es un cambio de estructura del monorepo que no se aborda aquí;
 * mientras tanto, cualquier cambio en la unión del backend debe reflejarse aquí y
 * en `tests/unit/reservation-events.spec.ts`.
 */
export interface ReservationEventBase {
  reservationId: string;
  scheduledAt: string;
  endedAt: string;
  workerName: string;
  customerName: string;
  customerPhone: string | null;
  services: { name: string; price: number; durationMinutes: number }[];
  totalDurationMinutes: number;
  totalPrice: number;
  status: string;
}

export interface ReservationCreatedEvent extends ReservationEventBase {
  type: 'reservation.created';
}

export interface ReservationCancelledEvent extends ReservationEventBase {
  type: 'reservation.cancelled';
  /** `true` si canceló la peluquería (panel o su WhatsApp); `false`, la clienta. */
  byAdmin: boolean;
}

export interface ReservationRescheduledEvent extends ReservationEventBase {
  type: 'reservation.rescheduled';
  byAdmin: boolean;
  /** Dónde estaba la cita antes de moverla; el aviso muestra antes → después. */
  previousScheduledAt: string;
}

/** Confirmar es siempre acción de la peluquería, así que no lleva `byAdmin`. */
export interface ReservationConfirmedEvent extends ReservationEventBase {
  type: 'reservation.confirmed';
}

export type ReservationEvent =
  | ReservationCreatedEvent
  | ReservationCancelledEvent
  | ReservationRescheduledEvent
  | ReservationConfirmedEvent;
