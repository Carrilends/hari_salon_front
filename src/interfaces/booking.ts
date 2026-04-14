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
