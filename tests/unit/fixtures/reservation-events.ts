import type {
  ReservationCancelledEvent,
  ReservationConfirmedEvent,
  ReservationCreatedEvent,
  ReservationEvent,
  ReservationRescheduledEvent,
} from 'src/interfaces/booking';

/** Lo que comparten los cuatro eventos, ya serializado (fechas ISO). */
const base = {
  reservationId: 'res-1',
  scheduledAt: '2026-09-16T14:00:00.000Z',
  endedAt: '2026-09-16T15:00:00.000Z',
  workerName: 'Marlene',
  customerName: 'Ana',
  customerPhone: '+573001234567',
  services: [{ name: 'Corte', price: 30000, durationMinutes: 60 }],
  totalDurationMinutes: 60,
  totalPrice: 30000,
  status: 'pendiente',
};

export const createdEvent: ReservationCreatedEvent = {
  ...base,
  type: 'reservation.created',
};

export const cancelledByCustomer: ReservationCancelledEvent = {
  ...base,
  type: 'reservation.cancelled',
  status: 'cancelada',
  byAdmin: false,
};

export const cancelledByAdmin: ReservationCancelledEvent = {
  ...cancelledByCustomer,
  byAdmin: true,
};

export const rescheduledByCustomer: ReservationRescheduledEvent = {
  ...base,
  type: 'reservation.rescheduled',
  byAdmin: false,
  previousScheduledAt: '2026-09-15T10:00:00.000Z',
};

export const rescheduledByAdmin: ReservationRescheduledEvent = {
  ...rescheduledByCustomer,
  byAdmin: true,
};

export const confirmedEvent: ReservationConfirmedEvent = {
  ...base,
  type: 'reservation.confirmed',
  status: 'confirmada',
};

export const oneOfEach: ReservationEvent[] = [
  createdEvent,
  cancelledByCustomer,
  rescheduledByCustomer,
  confirmedEvent,
];
