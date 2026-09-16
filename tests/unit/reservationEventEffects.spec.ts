import {
  formatSalonDateTime,
  reservationEventEffects,
} from 'src/composables/notifications/reservationEventEffects';
import { queryKeys } from 'src/api/query-keys';
import {
  cancelledByAdmin,
  cancelledByCustomer,
  confirmedEvent,
  createdEvent,
  rescheduledByAdmin,
  rescheduledByCustomer,
} from './fixtures/reservation-events';

/** Formateador identidad: las pruebas miran el texto, no la localización. */
const asIs = (iso: string) => iso;

const ALL_THREE = [
  queryKeys.reservations.all,
  queryKeys.occupancy.all,
  queryKeys.workerAvailability.all,
];

describe('reservationEventEffects — tabla evento → aviso + claves', () => {
  describe('reservation.created', () => {
    const fx = reservationEventEffects(createdEvent, asIs);

    it('avisa de la reserva nueva con la hora', () => {
      expect(fx.notice.type).toBe('positive');
      expect(fx.notice.message).toBe('Nueva reserva de Ana');
      expect(fx.notice.caption).toBe(createdEvent.scheduledAt);
    });

    it('invalida reservas, ocupación y disponibilidad', () => {
      expect(fx.invalidate).toEqual(ALL_THREE);
    });
  });

  describe('reservation.cancelled', () => {
    it('si canceló la clienta, lo dice con su nombre', () => {
      const fx = reservationEventEffects(cancelledByCustomer, asIs);
      expect(fx.notice.type).toBe('warning');
      expect(fx.notice.message).toBe('Ana canceló su cita');
      expect(fx.notice.caption).toBe(cancelledByCustomer.scheduledAt);
    });

    it('si canceló la peluquería, lo dice así', () => {
      const fx = reservationEventEffects(cancelledByAdmin, asIs);
      expect(fx.notice.message).toBe('Cancelada por la peluquería: Ana');
    });

    it('invalida las tres claves: la fila desaparece y la ventana se libera', () => {
      const fx = reservationEventEffects(cancelledByCustomer, asIs);
      expect(fx.invalidate).toEqual(ALL_THREE);
    });
  });

  describe('reservation.rescheduled', () => {
    it('muestra antes → después cuando la mueve la clienta', () => {
      const fx = reservationEventEffects(rescheduledByCustomer, asIs);
      expect(fx.notice.type).toBe('info');
      expect(fx.notice.message).toBe('Ana movió su cita');
      expect(fx.notice.caption).toBe(
        `${rescheduledByCustomer.previousScheduledAt} → ${rescheduledByCustomer.scheduledAt}`
      );
    });

    it('lo atribuye a la peluquería si byAdmin', () => {
      const fx = reservationEventEffects(rescheduledByAdmin, asIs);
      expect(fx.notice.message).toBe('La peluquería movió la cita de Ana');
    });

    it('invalida las tres claves: cambian dos ventanas', () => {
      const fx = reservationEventEffects(rescheduledByCustomer, asIs);
      expect(fx.invalidate).toEqual(ALL_THREE);
    });
  });

  describe('reservation.confirmed', () => {
    const fx = reservationEventEffects(confirmedEvent, asIs);

    it('avisa de la confirmación con la hora', () => {
      expect(fx.notice.type).toBe('positive');
      expect(fx.notice.message).toBe('Confirmada: Ana');
      expect(fx.notice.caption).toBe(confirmedEvent.scheduledAt);
    });

    it('solo invalida la lista: confirmar no cambia la ventana', () => {
      expect(fx.invalidate).toEqual([queryKeys.reservations.all]);
    });
  });

  it('cada aviso lleva un icono', () => {
    for (const event of [createdEvent, cancelledByCustomer, rescheduledByCustomer, confirmedEvent]) {
      expect(reservationEventEffects(event, asIs).notice.icon).toBeTruthy();
    }
  });
});

describe('formatSalonDateTime', () => {
  it('muestra la hora en America/Bogota aunque el ISO venga en UTC', () => {
    // 14:00Z son las 09:00 en Bogotá (UTC-5, sin horario de verano).
    const out = formatSalonDateTime('2026-09-16T14:00:00.000Z');
    expect(out).toContain('2026');
    expect(out).toMatch(/9:00/);
    expect(out).not.toMatch(/14:00/);
  });
});
