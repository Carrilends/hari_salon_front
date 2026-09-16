import type { ReservationEvent } from 'src/interfaces/booking';
import { oneOfEach } from './fixtures/reservation-events';

/**
 * La unión del frontend es un espejo a mano de
 * `hair_salon_back/src/notifications/domain/events/notifiable-event.ts`. Este
 * spec fija los cuatro discriminantes que emite el backend: si el back añade un
 * quinto, el que amplíe la unión tiene que pasar también por aquí.
 */
describe('unión de eventos de reserva', () => {
  it('cubre los cuatro tipos que emite el backend', () => {
    const types = oneOfEach.map((e: ReservationEvent) => e.type).sort();
    expect(types).toEqual([
      'reservation.cancelled',
      'reservation.confirmed',
      'reservation.created',
      'reservation.rescheduled',
    ]);
  });

  it('solo el evento de cambio de hora lleva la hora anterior', () => {
    for (const event of oneOfEach) {
      const hasPrevious = 'previousScheduledAt' in event;
      expect(hasPrevious).toBe(event.type === 'reservation.rescheduled');
    }
  });

  it('cancelar y mover llevan byAdmin; crear y confirmar no', () => {
    for (const event of oneOfEach) {
      const hasByAdmin = 'byAdmin' in event;
      expect(hasByAdmin).toBe(
        event.type === 'reservation.cancelled' ||
          event.type === 'reservation.rescheduled'
      );
    }
  });
});
