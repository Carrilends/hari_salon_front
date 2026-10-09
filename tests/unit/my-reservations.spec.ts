import {
  MENSAJE_SIN_CONEXION_RESERVAS,
  cabeceraDeFecha,
  cancelErrorMessage,
  diaRelativo,
  fechaDeFila,
  fechaDeCita,
  fechaLargaDeQDate,
  horaHHmm,
  isCancelable,
  isReschedulable,
  lineaDeDetalle,
  mesLargoDeQDate,
  nombreDeEstilista,
  nombresDeServicios,
  partesEnBogota,
  rangoHorario,
  rescheduleErrorMessage,
  rescheduleSuccessMessage,
  shouldWarnWorkerMayChange,
  sinLaPropiaReserva,
  splitReservationsByTime,
} from 'src/helpers/my-reservations';
import type { ReservationDto } from 'src/interfaces/booking';
import type {
  WorkerAvailabilityEntry,
  WorkerAvailabilityResponse,
} from 'src/api/workers-api';

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

/**
 * Plan 2 (agenda clara): los textos de la tarjeta, de la fila y de los
 * diálogos. Todo se lee en la hora de Bogotá: una cita a las 8:00 del 8 es
 * «del 8» aunque en UTC ya sea otro día, y «Mañana» se cuenta por días del
 * salón, no por 24 horas.
 */
const CITA = res({
  id: 'r1',
  scheduledAt: '2026-10-08T15:30:00.000Z', // jueves 8, 10:30 en Bogotá
  endedAt: '2026-10-08T16:30:00.000Z',
  workerId: 'w1',
  worker: { id: 'w1', name: 'Monica' },
  workerPinned: true,
  totalDurationMinutes: 60,
  status: 'confirmada',
  services: [
    { serviceId: 's1', name: 'Wolf cut mujer', price: 1, durationMinutes: 30 },
    { serviceId: 's2', name: 'Uñas de gel', price: 1, durationMinutes: 30 },
  ],
});
/** Miércoles 7 de octubre, 12:00 en Bogotá. */
const MEDIODIA_DEL_7 = new Date('2026-10-07T17:00:00.000Z');

describe('partesEnBogota', () => {
  it('lee la fecha y la hora en Bogotá, no en UTC', () => {
    expect(partesEnBogota(CITA.scheduledAt)).toEqual({
      anio: 2026,
      mes: 10,
      dia: 8,
      hora: 10,
      minuto: 30,
      diaSemana: 4,
      qDate: '2026/10/08',
      minutoDelDia: 630,
    });
  });

  it('a las 23:30 de Bogotá todavía es el día anterior al de UTC', () => {
    expect(partesEnBogota('2026-10-08T04:30:00.000Z').qDate).toBe('2026/10/07');
  });

  it('acepta también un Date', () => {
    expect(partesEnBogota(MEDIODIA_DEL_7).minutoDelDia).toBe(720);
  });

  it('horaHHmm deja el cero a la izquierda (el formato de las fichas)', () => {
    expect(horaHHmm({ hora: 9, minuto: 0 })).toBe('09:00');
    expect(horaHHmm(partesEnBogota(CITA.scheduledAt))).toBe('10:30');
  });
});

describe('los textos de la tarjeta', () => {
  it('la cabecera de fecha: día corto, número y mes', () => {
    expect(cabeceraDeFecha(CITA.scheduledAt)).toEqual({
      diaSemana: 'Jue',
      numero: 8,
      mes: 'oct',
    });
  });

  it('el rango horario, sin cero a la izquierda', () => {
    expect(rangoHorario(CITA)).toBe('10:30 – 11:30');
    expect(
      rangoHorario(
        res({
          scheduledAt: '2026-10-24T14:00:00.000Z',
          endedAt: '2026-10-24T14:30:00.000Z',
        })
      )
    ).toBe('9:00 – 9:30');
  });

  it('el día relativo: hoy, mañana y «en N días»', () => {
    expect(diaRelativo('2026-10-07T20:00:00.000Z', MEDIODIA_DEL_7)).toBe('Hoy');
    expect(diaRelativo(CITA.scheduledAt, MEDIODIA_DEL_7)).toBe('Mañana');
    expect(diaRelativo('2026-10-24T14:00:00.000Z', MEDIODIA_DEL_7)).toBe(
      'En 17 días'
    );
  });

  it('el día relativo cuenta días de Bogotá, no de UTC', () => {
    // 23:30 del 7 en Bogotá (04:30 del 8 en UTC): una cita a las 8:00 del 8 es «Mañana».
    const casiMedianoche = new Date('2026-10-08T04:30:00.000Z');

    expect(diaRelativo('2026-10-08T13:00:00.000Z', casiMedianoche)).toBe(
      'Mañana'
    );
  });

  it('la línea de detalle, con la estilista que eligió', () => {
    expect(lineaDeDetalle(CITA, MEDIODIA_DEL_7)).toBe(
      'Mañana · con Monica · 60 min'
    );
  });

  it('la línea de detalle dice cuándo la estilista la asignó el salón', () => {
    expect(
      lineaDeDetalle({ ...CITA, workerPinned: false }, MEDIODIA_DEL_7)
    ).toBe('Mañana · con Monica, asignación del salón · 60 min');
  });

  it('sin nombre de estilista no deja un hueco en la frase', () => {
    const sinNombre = { ...CITA, worker: { id: 'w1', name: '' } };

    expect(nombreDeEstilista(sinNombre)).toBe('tu estilista');
    expect(lineaDeDetalle(sinNombre, MEDIODIA_DEL_7)).toBe(
      'Mañana · con tu estilista · 60 min'
    );
  });

  it('los servicios separados por comas, o «Sin servicios»', () => {
    expect(nombresDeServicios(CITA)).toBe('Wolf cut mujer, Uñas de gel');
    expect(nombresDeServicios({ services: [] })).toBe('Sin servicios');
  });
});

describe('los textos de la fila y de los diálogos', () => {
  it('la fecha de una fila pasada', () => {
    expect(fechaDeFila('2026-09-18T21:00:00.000Z')).toBe('Vie 18 sep · 16:00');
  });

  it('la fecha larga, desde un instante y desde una fecha de la tira', () => {
    expect(fechaDeCita(CITA.scheduledAt)).toBe('jueves 8');
    expect(fechaLargaDeQDate('2026/10/09')).toBe('viernes 9');
    expect(mesLargoDeQDate('2026/10/09')).toBe('octubre');
  });

  it('una fecha de la tira mal formada no inventa un día', () => {
    expect(fechaLargaDeQDate('')).toBe('');
    expect(mesLargoDeQDate('9 de octubre')).toBe('');
  });
});

/**
 * Foco de revisión 1: la disponibilidad del día trae el bloque de la cita que
 * se está moviendo. Sin quitarlo, moverla media hora el mismo día sale
 * «ocupado» con su propia estilista, aunque el backend lo acepta (excluye la
 * propia reserva al comprobar el solape).
 */
describe('sinLaPropiaReserva', () => {
  const entrada = (
    cambios: Partial<WorkerAvailabilityEntry> = {}
  ): WorkerAvailabilityEntry => ({
    id: 'w1',
    name: 'Monica',
    isDefault: false,
    assignable: true,
    usedMinutes: 90,
    capacityMinutes: 720,
    availableMinutes: 630,
    reservations: [
      { startMin: 630, endMin: 690 },
      { startMin: 900, endMin: 930 },
    ],
    ...cambios,
  });
  const disponibilidad = (
    workers: WorkerAvailabilityEntry[]
  ): WorkerAvailabilityResponse => ({
    workers,
    dayBounds: {
      openMin: 480,
      closeMin: 1200,
      effectiveStartMin: 480,
      isToday: false,
    },
    salonNow: { ymd: '2026-10-07', minOfDay: 720, tz: 'America/Bogota' },
  });

  it('quita el bloque de la propia cita a su estilista, ese día', () => {
    const recortada = sinLaPropiaReserva(
      disponibilidad([entrada()]),
      CITA,
      '2026/10/08'
    );

    expect(recortada.workers[0].reservations).toEqual([
      { startMin: 900, endMin: 930 },
    ]);
    expect(recortada.workers[0].usedMinutes).toBe(30);
    expect(recortada.workers[0].availableMinutes).toBe(690);
  });

  it('otro día no toca nada', () => {
    const original = disponibilidad([entrada()]);

    expect(sinLaPropiaReserva(original, CITA, '2026/10/09')).toBe(original);
  });

  it('no toca a otra estilista con un bloque idéntico', () => {
    const recortada = sinLaPropiaReserva(
      disponibilidad([entrada({ id: 'w2', name: 'Sonia' }), entrada()]),
      CITA,
      '2026/10/08'
    );

    expect(recortada.workers[0].reservations).toHaveLength(2);
    expect(recortada.workers[1].reservations).toHaveLength(1);
  });

  it('si hubiera dos bloques iguales, quita solo uno', () => {
    const doble = entrada({
      reservations: [
        { startMin: 630, endMin: 690 },
        { startMin: 630, endMin: 690 },
      ],
    });

    const recortada = sinLaPropiaReserva(
      disponibilidad([doble]),
      CITA,
      '2026/10/08'
    );

    expect(recortada.workers[0].reservations).toEqual([
      { startMin: 630, endMin: 690 },
    ]);
  });

  it('una cancelada no ocupa nada: no hay qué quitar', () => {
    const original = disponibilidad([entrada()]);

    expect(
      sinLaPropiaReserva(
        original,
        { ...CITA, status: 'cancelada' },
        '2026/10/08'
      )
    ).toBe(original);
  });

  it('no muta la respuesta que guarda la caché', () => {
    const original = disponibilidad([entrada()]);

    sinLaPropiaReserva(original, CITA, '2026/10/08');

    expect(original.workers[0].reservations).toHaveLength(2);
    expect(original.workers[0].usedMinutes).toBe(90);
  });
});

/**
 * Foco de revisión 4: sin respuesta del servidor el problema es la conexión,
 * no la cita. Decirle «no tiene ese hueco» la haría probar hora tras hora.
 */
describe('los errores sin conexión', () => {
  const sinRed = { isAxiosError: true, code: 'ERR_NETWORK', request: {} };

  it('mover sin conexión dice que es la conexión', () => {
    expect(rescheduleErrorMessage(sinRed, CITA)).toBe(
      MENSAJE_SIN_CONEXION_RESERVAS
    );
  });

  it('el texto de conexión no culpa a la estilista ni a la hora', () => {
    expect(MENSAJE_SIN_CONEXION_RESERVAS).toMatch(/conexión/);
    expect(MENSAJE_SIN_CONEXION_RESERVAS).not.toMatch(/hueco|ocupad/);
  });
});

describe('cancelErrorMessage', () => {
  it('409: la hora de la cita ya pasó', () => {
    expect(cancelErrorMessage({ response: { status: 409, data: {} } })).toBe(
      'Ya no se puede cancelar: la hora de la cita ya pasó.'
    );
  });

  it('400: ya estaba cancelada o cumplida', () => {
    expect(cancelErrorMessage({ response: { status: 400, data: {} } })).toBe(
      'Esta cita ya no se puede cancelar: puede que ya esté cancelada o cumplida.'
    );
  });

  it('sin respuesta: la conexión', () => {
    expect(
      cancelErrorMessage({
        isAxiosError: true,
        code: 'ERR_NETWORK',
        request: {},
      })
    ).toBe(MENSAJE_SIN_CONEXION_RESERVAS);
  });

  it('cualquier otro fallo: un texto genérico que invita a reintentar', () => {
    expect(cancelErrorMessage({ response: { status: 500, data: {} } })).toBe(
      'No se pudo cancelar la cita. Inténtalo de nuevo en unos segundos.'
    );
  });
});
