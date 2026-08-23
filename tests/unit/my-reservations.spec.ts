import {
  isCancelable,
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
