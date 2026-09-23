import {
  isCancelable,
  isReschedulable,
  rescheduleErrorMessage,
  rescheduleSuccessMessage,
  shouldWarnWorkerMayChange,
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
    // Por defecto, la repartió el sistema: es el caso mayoritario («Sin
    // preferencia» en el formulario, o el chat, que nunca manda estilista).
    workerPinned: false,
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

/**
 * El aviso **previo**: «cambiar la hora puede significar que te atienda otra
 * estilista».
 *
 * Es genérico a propósito —«puede»— porque hasta que no se intenta mover nadie
 * sabe quién quedará libre. Y no se le enseña a todo el mundo: si la clienta
 * eligió estilista (`workerPinned`), reprogramar **nunca** se la cambia —o la
 * conserva, o devuelve 409—, así que advertirla sería preocuparla por algo que
 * no puede pasarle.
 */
describe('shouldWarnWorkerMayChange', () => {
  it('avisa cuando la estilista la repartió el sistema', () => {
    expect(shouldWarnWorkerMayChange(res({ workerPinned: false }))).toBe(true);
  });

  it('NO avisa cuando la clienta eligió estilista', () => {
    expect(shouldWarnWorkerMayChange(res({ workerPinned: true }))).toBe(false);
  });

  it('ante un backend que no manda el dato, se calla', () => {
    // Sin el dato no se sabe cuál de los dos casos es, y de los dos errores
    // posibles el caro es preocupar a quien eligió a su estilista de confianza.
    const sinDato = { ...res(), workerPinned: undefined } as never;
    expect(shouldWarnWorkerMayChange(sinDato)).toBe(false);
  });
});

/**
 * El aviso **posterior**: solo si de verdad cambió.
 *
 * Decir «tu estilista sigue siendo la misma» en cada reprogramación sería ruido,
 * y el ruido se acaba ignorando. La respuesta del backend ya trae el `workerId`
 * nuevo, así que el cambio se detecta comparándolo con el que la tarjeta ya
 * tenía: no hace falta que el servidor lo declare.
 */
describe('rescheduleSuccessMessage', () => {
  it('sin cambio de estilista, el mensaje de siempre', () => {
    const mensaje = rescheduleSuccessMessage(
      res({ workerId: 'w1' }),
      { workerId: 'w1' },
      res({ workerId: 'w1', worker: { id: 'w1', name: 'Ana' } })
    );

    expect(mensaje).toBe('Tu cita quedó movida.');
  });

  it('con cambio, nombra a la estilista nueva', () => {
    // En el portal SÍ se puede nombrar: la interfaz ya muestra estilistas con
    // nombre y la clienta los elige en el formulario.
    const mensaje = rescheduleSuccessMessage(
      res({ workerId: 'w1' }),
      { workerId: 'w2' },
      res({ workerId: 'w2', worker: { id: 'w2', name: 'Monica' } })
    );

    expect(mensaje).toContain('Monica');
    expect(mensaje).toContain('movida');
  });

  it('con cambio y sin lista refrescada, lo dice igual sin nombre', () => {
    // El nombre nuevo sale de la lista ya refrescada; si aún no ha llegado,
    // callarse el cambio sería justo el fallo que este aviso evita.
    const mensaje = rescheduleSuccessMessage(res({ workerId: 'w1' }), {
      workerId: 'w2',
    });

    expect(mensaje).toMatch(/otra estilista/i);
  });

  it('NUNCA nombra a la estilista de una lista que todavía va atrasada', () => {
    // El peligro real: si la lista aún trae la fila vieja, su `worker.name` es
    // el de la estilista ANTERIOR. Nombrarla sería decirle exactamente lo
    // contrario de lo que pasó. Solo se nombra si la fila refrescada apunta ya
    // a la estilista que devolvió el servidor.
    const mensaje = rescheduleSuccessMessage(
      res({ workerId: 'w1' }),
      { workerId: 'w2' },
      res({ workerId: 'w1', worker: { id: 'w1', name: 'Ana' } })
    );

    expect(mensaje).not.toContain('Ana');
    expect(mensaje).toMatch(/otra estilista/i);
  });
});
