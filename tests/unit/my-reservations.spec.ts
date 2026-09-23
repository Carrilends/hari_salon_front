import {
  isCancelable,
  isReschedulable,
  rescheduleErrorMessage,
  splitReservationsByTime,
} from 'src/helpers/my-reservations';
import type { ReservationDto } from 'src/interfaces/booking';

function res(over: Partial<ReservationDto> = {}): ReservationDto {
  return {
    id: 'r1',
    scheduledAt: '2026-08-25T14:00:00.000Z',
    endedAt: '2026-08-25T15:00:00.000Z',
    workerId: 'w1',
    worker: { id: 'w1', name: 'Ana' },
    totalDurationMinutes: 60,
    status: 'pendiente',
    userId: 'u1',
    contact: null,
    services: [
      { serviceId: 's1', name: 'Corte', price: 20000, durationMinutes: 60 },
    ],
    ...over,
  };
}

const NOW = new Date('2026-08-20T12:00:00.000Z');

describe('isCancelable', () => {
  it('pendiente en el futuro es cancelable', () => {
    expect(isCancelable(res({ status: 'pendiente' }), NOW)).toBe(true);
  });

  it('confirmada en el futuro es cancelable', () => {
    expect(isCancelable(res({ status: 'confirmada' }), NOW)).toBe(true);
  });

  it('cumplida no es cancelable', () => {
    expect(isCancelable(res({ status: 'cumplida' }), NOW)).toBe(false);
  });

  it('cancelada no es cancelable', () => {
    expect(isCancelable(res({ status: 'cancelada' }), NOW)).toBe(false);
  });

  it('una reserva cuya hora ya pasó no es cancelable, aunque esté confirmada', () => {
    expect(
      isCancelable(
        res({ status: 'confirmada', scheduledAt: '2026-08-19T10:00:00.000Z' }),
        NOW
      )
    ).toBe(false);
  });
});

describe('splitReservationsByTime', () => {
  it('separa próximas (>= ahora) de pasadas (< ahora)', () => {
    const futura = res({ id: 'f', scheduledAt: '2026-08-25T14:00:00.000Z' });
    const pasada = res({ id: 'p', scheduledAt: '2026-08-10T14:00:00.000Z' });

    const { upcoming, past } = splitReservationsByTime([pasada, futura], NOW);

    expect(upcoming.map((r) => r.id)).toEqual(['f']);
    expect(past.map((r) => r.id)).toEqual(['p']);
  });

  it('ordena las próximas de la más cercana a la más lejana', () => {
    const lejana = res({ id: 'a', scheduledAt: '2026-08-30T14:00:00.000Z' });
    const cercana = res({ id: 'b', scheduledAt: '2026-08-22T14:00:00.000Z' });

    const { upcoming } = splitReservationsByTime([lejana, cercana], NOW);

    expect(upcoming.map((r) => r.id)).toEqual(['b', 'a']);
  });

  it('ordena las pasadas de la más reciente a la más antigua', () => {
    const antigua = res({ id: 'a', scheduledAt: '2026-08-01T14:00:00.000Z' });
    const reciente = res({ id: 'b', scheduledAt: '2026-08-15T14:00:00.000Z' });

    const { past } = splitReservationsByTime([antigua, reciente], NOW);

    expect(past.map((r) => r.id)).toEqual(['b', 'a']);
  });
});

describe('isReschedulable', () => {
  it('pendiente en el futuro se puede mover', () => {
    expect(isReschedulable(res({ status: 'pendiente' }), NOW)).toBe(true);
  });

  it('confirmada en el futuro se puede mover y CONSERVA su estado', () => {
    // El backend no la degrada a pendiente: degradarla la expondría al cron que
    // cancela las pendientes vencidas.
    expect(isReschedulable(res({ status: 'confirmada' }), NOW)).toBe(true);
  });

  it.each(['cumplida', 'cancelada'] as const)(
    'una reserva %s ya no se mueve',
    (status) => {
      expect(isReschedulable(res({ status }), NOW)).toBe(false);
    }
  );

  it('una reserva cuya hora ya pasó no se puede mover', () => {
    expect(
      isReschedulable(
        res({ status: 'confirmada', scheduledAt: '2026-08-19T10:00:00.000Z' }),
        NOW
      )
    ).toBe(false);
  });
});

/**
 * El mensaje del 409 al mover una cita.
 *
 * El portal traducía **todo** 409 a «Esa hora ya está ocupada. Elige otra.».
 * Desde que la reprogramación puede repartir de nuevo una cita sin preferencia
 * de estilista, ese 409 tiene dos causas con remedios distintos: si la ocupada
 * es la estilista que la clienta eligió, puede cambiar de hora **o** reservar
 * sin preferencia; si no queda ninguna libre, solo cambiar de hora. Un texto
 * único obliga a adivinar cuál de los dos le sirve.
 *
 * Se decide por el **código** que manda el backend, nunca por el texto de su
 * mensaje: el texto se reescribe y el portal se quedaría contando la historia
 * equivocada sin que ninguna prueba se entere.
 */
describe('rescheduleErrorMessage', () => {
  const conflicto = (reason?: string) => ({
    response: { status: 409, data: reason ? { reason } : {} },
  });

  it('nombra a la estilista cuando la ocupada es la que eligió la clienta', () => {
    const mensaje = rescheduleErrorMessage(
      conflicto('estilista_ocupada'),
      res({ worker: { id: 'w1', name: 'Sonia' } })
    );

    expect(mensaje).toContain('Sonia');
    expect(mensaje).toContain('sin preferencia');
  });

  it('cuando el salón está lleno no culpa a ninguna estilista', () => {
    const mensaje = rescheduleErrorMessage(
      conflicto('hora_ocupada'),
      res({ worker: { id: 'w1', name: 'Sonia' } })
    );

    expect(mensaje).not.toContain('Sonia');
    expect(mensaje).toContain('ninguna estilista libre');
  });

  it('un 409 sin motivo se queda en el texto genérico de siempre', () => {
    // Compatibilidad: si el backend fuera anterior a este cambio, inventarse una
    // de las dos causas sería peor que no decir cuál.
    expect(rescheduleErrorMessage(conflicto(), res())).toBe(
      'Esa hora ya está ocupada. Elige otra.'
    );
  });

  it('lo que no es 409 sigue siendo el error de horario/plazo', () => {
    const mensaje = rescheduleErrorMessage(
      { response: { status: 400, data: {} } },
      res()
    );

    expect(mensaje).toContain('No se pudo cambiar la fecha');
  });

  it('sin nombre de estilista no deja un hueco en la frase', () => {
    const mensaje = rescheduleErrorMessage(
      conflicto('estilista_ocupada'),
      res({ worker: { id: 'w1', name: '' } })
    );

    expect(mensaje).toContain('Tu estilista');
  });
});
