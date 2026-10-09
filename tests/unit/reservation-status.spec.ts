/**
 * El estado de una reserva, dicho sin colores de Quasar (M2).
 *
 * Antes devolvía `{ label, color }` con nombres de la paleta de Quasar
 * («orange», «positive»…), que la remodelación no tiene. Ahora devuelve lo que
 * hace falta para pintarlo con tokens y sin depender del color: el texto, el
 * icono de trazo, la clase que pone los colores y si la fecha va tachada.
 */
import { reservationStatusMeta } from 'src/helpers/reservation-status';
import type { ReservationStatus } from 'src/interfaces/booking';

const ESTADOS: ReservationStatus[] = [
  'pendiente',
  'confirmada',
  'cumplida',
  'cancelada',
];

describe('reservationStatusMeta', () => {
  it.each([
    ['pendiente', 'Pendiente', 'reloj', 'estado--pendiente', false],
    ['confirmada', 'Confirmada', 'check', 'estado--confirmada', false],
    ['cumplida', 'Cumplida', 'cumplida', 'estado--cumplida', false],
    ['cancelada', 'Cancelada', 'cancelada', 'estado--cancelada', true],
  ] as const)(
    '%s se dice «%s», con el icono %s y la clase %s (tachada: %s)',
    (estado, label, icono, clase, tachada) => {
      expect(reservationStatusMeta(estado)).toEqual({
        label,
        icono,
        clase,
        tachada,
      });
    }
  );

  it('ya no habla en colores de Quasar', () => {
    for (const estado of ESTADOS) {
      expect(reservationStatusMeta(estado)).not.toHaveProperty('color');
    }
  });

  it('solo la cancelada se tacha', () => {
    const tachadas = ESTADOS.filter((e) => reservationStatusMeta(e).tachada);

    expect(tachadas).toEqual(['cancelada']);
  });

  it('un estado desconocido conserva su texto y se pinta como pendiente, sin tachar', () => {
    const meta = reservationStatusMeta('otro' as never);

    expect(meta.label).toBe('otro');
    expect(meta.icono).toBe('reloj');
    expect(meta.clase).toBe('estado--pendiente');
    expect(meta.tachada).toBe(false);
  });

  it('devuelve una copia: cambiarla no cambia la siguiente', () => {
    const primera = reservationStatusMeta('pendiente');
    primera.label = 'cambiada';

    expect(reservationStatusMeta('pendiente').label).toBe('Pendiente');
  });
});
