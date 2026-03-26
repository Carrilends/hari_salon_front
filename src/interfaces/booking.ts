import type Service from './service';

/** Una fila en el carrito: un servicio y cuántas veces se reservó. */
export interface BookingLine {
  service: Service;
  quantity: number;
}
