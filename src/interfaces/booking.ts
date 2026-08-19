import type Service from './service';

/** Una fila en el carrito: un servicio y cuántas veces se reservó. */
export interface BookingLine {
  service: Service;
  quantity: number;
}

/** Reserva almacenada en el servidor (respuesta de GET /reservations). */
export interface ReservationDto {
  id: string;
  scheduledAt: string;
  endedAt: string;
  workerId: string;
  worker: { id: string; name: string };
  totalDurationMinutes: number;
}

/**
 * Evento en tiempo real que emite el backend por WebSocket al crear una reserva
 * (Fase 4). Las fechas viajan como cadenas ISO tras serializarse a JSON.
 */
export interface ReservationCreatedEvent {
  type: 'reservation.created';
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
