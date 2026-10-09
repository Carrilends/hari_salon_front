import type { ReservationDto } from 'src/interfaces/booking';
// Solo el tipo: el módulo de la API lee `import.meta.env`, que Jest no compila.
import type { WorkerAvailabilityResponse } from 'src/api/workers-api';
import {
  DIAS,
  MESES,
  horaCorta,
  partesDeFecha,
} from 'src/helpers/reserva-texto';

/** Por debajo de 700 px los diálogos de «Mis reservas» son hojas, como el menú «Más». */
export const CONSULTA_MOVIL_RESERVAS = '(max-width: 699px)';

/**
 * Sin respuesta del servidor el problema es la conexión, no la cita: decirle
 * «no tiene ese hueco» la haría probar hora tras hora creyendo que no hay sitio.
 */
export const MENSAJE_SIN_CONEXION_RESERVAS =
  'No pudimos conectar con el salón. Revisa tu conexión e inténtalo de nuevo.';

/**
 * Cortesía de interfaz: el botón "Cancelar" se ofrece solo cuando el ciclo de
 * vida lo permitiría (pendiente/confirmada y la hora aún no ha pasado). La regla
 * REAL la aplica el backend (§6.4); esto solo evita ofrecer una acción que fallaría.
 */
export function isCancelable(res: ReservationDto, now: Date): boolean {
  const cancelableStatus =
    res.status === 'pendiente' || res.status === 'confirmada';
  return (
    cancelableStatus && new Date(res.scheduledAt).getTime() > now.getTime()
  );
}

export interface SplitReservations {
  upcoming: ReservationDto[];
  past: ReservationDto[];
}

/**
 * Separa las reservas en próximas (a partir de ahora) y pasadas (antes de ahora),
 * ya ordenadas: las próximas de la más cercana a la más lejana; las pasadas de la
 * más reciente a la más antigua. El estado (incluida una cancelada) se distingue
 * luego con su distintivo; aquí la partición es puramente temporal.
 */
export function splitReservationsByTime(
  list: ReservationDto[],
  now: Date
): SplitReservations {
  const nowMs = now.getTime();
  const upcoming: ReservationDto[] = [];
  const past: ReservationDto[] = [];
  for (const r of list) {
    if (new Date(r.scheduledAt).getTime() >= nowMs) upcoming.push(r);
    else past.push(r);
  }
  const ascByTime = (a: ReservationDto, b: ReservationDto) =>
    new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
  upcoming.sort(ascByTime);
  past.sort((a, b) => -ascByTime(a, b));
  return { upcoming, past };
}

/**
 * Cortesía de interfaz para el botón «Cambiar fecha». Hoy coincide con
 * `isCancelable` —la regla de plazo es la misma a propósito: un umbral distinto
 * sería esquivable cancelando y reservando de nuevo—, pero se expresa aparte
 * porque son decisiones de negocio distintas y el backend puede separarlas con
 * `RESCHEDULE_MIN_LEAD_MINUTES` sin que el front tenga que adivinarlo.
 */
export function isReschedulable(res: ReservationDto, now: Date): boolean {
  const movibleStatus =
    res.status === 'pendiente' || res.status === 'confirmada';
  return movibleStatus && new Date(res.scheduledAt).getTime() > now.getTime();
}

/**
 * Motivos con los que el backend acompaña un 409 al mover una cita. Son códigos
 * estables, no textos: el mensaje del servidor se reescribe, se acorta y se
 * traduce, y decidir por él dejaría al portal contando la historia equivocada
 * sin que ninguna prueba se entere.
 *
 * Definidos en `hair_salon_back/src/reservations/infrastructure/http/
 * reservation-domain-exception.filter.ts`.
 */
type RescheduleConflictReason = 'estilista_ocupada' | 'hora_ocupada';

/**
 * Texto para un fallo al cambiar la fecha de una cita.
 *
 * El portal traducía **todo** 409 a «Esa hora ya está ocupada. Elige otra.».
 * Desde que la reprogramación puede repartir de nuevo una cita que no tenía
 * estilista elegida, ese 409 tiene dos causas con remedios distintos:
 *
 *   - `estilista_ocupada`: la ocupada es la estilista que ella eligió, así que
 *     puede cambiar de hora **o** reservar sin preferencia;
 *   - `hora_ocupada`: no queda ninguna libre, así que solo cabe cambiar de hora.
 *
 * Un 409 sin motivo conserva el texto genérico de siempre: inventarse una de las
 * dos causas sería peor que no decir cuál.
 */
export function rescheduleErrorMessage(
  error: unknown,
  res: Pick<ReservationDto, 'worker'>
): string {
  const response = (error as { response?: { status?: number; data?: unknown } })
    ?.response;
  if (!response) return MENSAJE_SIN_CONEXION_RESERVAS;
  if (response?.status !== 409) {
    return 'No se pudo cambiar la fecha. Revisa el horario e intenta de nuevo.';
  }

  const reason = (response.data as { reason?: RescheduleConflictReason })
    ?.reason;

  if (reason === 'estilista_ocupada') {
    const nombre = res.worker?.name || 'Tu estilista';
    return `${nombre} no tiene ese hueco. Prueba otra hora, o reserva de nuevo sin preferencia de estilista.`;
  }
  if (reason === 'hora_ocupada') {
    return 'No queda ninguna estilista libre a esa hora.';
  }
  return 'Esa hora ya está ocupada. Elige otra.';
}

/**
 * ¿Hay que advertirle, **antes** de mover la cita, de que puede acabar con otra
 * estilista?
 *
 * El aviso es genérico por honestidad: hasta que no se intenta mover, nadie sabe
 * quién quedará libre a la hora nueva. Pero no es para todas: si la clienta
 * eligió estilista, reprogramar **nunca** se la cambia —el backend o la conserva
 * o devuelve 409—, así que advertirla sería preocuparla por algo que no puede
 * pasarle.
 *
 * Si el dato no viene (un backend anterior a este cambio), se calla: de los dos
 * errores posibles, el caro es preocupar a quien pidió a su estilista de
 * confianza.
 */
export function shouldWarnWorkerMayChange(
  res: Pick<ReservationDto, 'workerPinned'>
): boolean {
  return res.workerPinned === false;
}

/**
 * Texto tras mover una cita con éxito. Anuncia el cambio de estilista **solo si
 * de verdad lo hubo**: decir «tu estilista sigue siendo la misma» en cada
 * reprogramación sería ruido, y el ruido se acaba ignorando.
 *
 * El cambio se detecta comparando el `workerId` que devuelve el backend con el
 * que la tarjeta ya tenía; el servidor no necesita declararlo.
 *
 * El **nombre** nuevo solo puede salir de la lista refrescada, porque la
 * respuesta del PATCH trae el id de la estilista pero no su nombre. Y solo se
 * usa si esa fila ya apunta a la estilista que devolvió el servidor: si la lista
 * va atrasada, su nombre es el de la estilista **anterior**, y decirlo sería
 * contar justo lo contrario de lo que pasó. Sin nombre fiable se avisa igual,
 * en genérico: callar el cambio es el fallo que este mensaje existe para evitar.
 */
export function rescheduleSuccessMessage(
  previous: Pick<ReservationDto, 'workerId'>,
  updated: { workerId: string },
  refreshed?: Pick<ReservationDto, 'workerId' | 'worker'> | null
): string {
  if (updated.workerId === previous.workerId) return 'Tu cita quedó movida.';

  const nombre =
    refreshed && refreshed.workerId === updated.workerId
      ? refreshed.worker?.name
      : null;

  return nombre
    ? `Tu cita quedó movida. Ahora te atiende ${nombre}.`
    : 'Tu cita quedó movida. Te atenderá otra estilista.';
}

// ---------------------------------------------------------------------------
// Plan 2 · agenda clara: textos de fecha, recorte de la propia cita, errores.
// ---------------------------------------------------------------------------

const ZONA_SALON = 'America/Bogota';
const DIA_MS = 86_400_000;
const dosCifras = (n: number) => String(n).padStart(2, '0');

export interface PartesDeFecha {
  anio: number;
  mes: number;
  dia: number;
  hora: number;
  minuto: number;
  /** 0 = domingo. */
  diaSemana: number;
  /** 'YYYY/MM/DD', el formato de la tira de días y de `businessHours`. */
  qDate: string;
  minutoDelDia: number;
}

/**
 * Un instante leído en la hora del salón. Los nombres de días y meses salen de
 * tablas propias y no de `Intl` en español: así no dependen del ICU de cada
 * navegador («jue.» con punto en unos, «jue» en otros).
 */
export function partesEnBogota(instante: string | Date): PartesDeFecha {
  const fecha = typeof instante === 'string' ? new Date(instante) : instante;
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_SALON,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(fecha);
  const n = (tipo: string) =>
    Number(partes.find((p) => p.type === tipo)?.value ?? '0');
  const anio = n('year');
  const mes = n('month');
  const dia = n('day');
  const hora = n('hour');
  const minuto = n('minute');
  const diaSemana = new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay();
  return {
    anio,
    mes,
    dia,
    hora,
    minuto,
    diaSemana,
    qDate: `${anio}/${dosCifras(mes)}/${dosCifras(dia)}`,
    minutoDelDia: hora * 60 + minuto,
  };
}

/** 'HH:mm' con cero: el formato de `HuecoDeHora.hora`. */
export function horaHHmm(p: Pick<PartesDeFecha, 'hora' | 'minuto'>): string {
  return `${dosCifras(p.hora)}:${dosCifras(p.minuto)}`;
}

/** El bloque de fecha de la tarjeta: «Jue / 8 / oct» (el CSS lo pone en versalitas). */
export function cabeceraDeFecha(iso: string): {
  diaSemana: string;
  numero: number;
  mes: string;
} {
  const p = partesEnBogota(iso);
  return {
    diaSemana: DIAS[p.diaSemana].slice(0, 3),
    numero: p.dia,
    mes: MESES[p.mes - 1].slice(0, 3),
  };
}

/** «10:30 – 11:30». */
export function rangoHorario(
  res: Pick<ReservationDto, 'scheduledAt' | 'endedAt'>
): string {
  const inicio = partesEnBogota(res.scheduledAt);
  const fin = partesEnBogota(res.endedAt);
  return `${horaCorta(horaHHmm(inicio))} – ${horaCorta(horaHHmm(fin))}`;
}

/**
 * «Hoy», «Mañana», «En 17 días». Se cuentan días del calendario del salón, no
 * bloques de 24 horas: a las 23:30 una cita a las 8:00 es «Mañana».
 */
export function diaRelativo(iso: string, ahora: Date): string {
  const hoy = partesEnBogota(ahora);
  const cita = partesEnBogota(iso);
  const dias = Math.round(
    (Date.UTC(cita.anio, cita.mes - 1, cita.dia) -
      Date.UTC(hoy.anio, hoy.mes - 1, hoy.dia)) /
      DIA_MS
  );
  if (dias <= 0) return 'Hoy';
  if (dias === 1) return 'Mañana';
  return `En ${dias} días`;
}

/** El nombre de la estilista, o «tu estilista» si el backend no lo trajo. */
export function nombreDeEstilista(res: Pick<ReservationDto, 'worker'>): string {
  return res.worker?.name || 'tu estilista';
}

/**
 * «Mañana · con Monica · 60 min». Si la estilista la repartió el sistema, se
 * dice («, asignación del salón»): es la que puede cambiar al mover la cita.
 */
export function lineaDeDetalle(
  res: Pick<
    ReservationDto,
    'scheduledAt' | 'worker' | 'workerPinned' | 'totalDurationMinutes'
  >,
  ahora: Date
): string {
  const asignada = res.workerPinned === false ? ', asignación del salón' : '';
  return `${diaRelativo(res.scheduledAt, ahora)} · con ${nombreDeEstilista(
    res
  )}${asignada} · ${res.totalDurationMinutes} min`;
}

/** «Vie 18 sep · 16:00»: la fecha de una fila pasada. */
export function fechaDeFila(iso: string): string {
  const p = partesEnBogota(iso);
  return `${DIAS[p.diaSemana].slice(0, 3)} ${p.dia} ${MESES[p.mes - 1].slice(
    0,
    3
  )} · ${horaCorta(horaHHmm(p))}`;
}

/** «jueves 8»: los títulos de los diálogos («¿Cancelar tu cita del jueves 8?»). */
export function fechaDeCita(iso: string): string {
  const p = partesEnBogota(iso);
  return `${DIAS[p.diaSemana].toLowerCase()} ${p.dia}`;
}

/** «viernes 9» desde una fecha de la tira ('YYYY/MM/DD'); '' si no lo es. */
export function fechaLargaDeQDate(qDate: string): string {
  const p = partesDeFecha(qDate);
  return p ? `${DIAS[p.diaSemana].toLowerCase()} ${p.dia}` : '';
}

/** «octubre» desde una fecha de la tira; '' si no lo es. */
export function mesLargoDeQDate(qDate: string): string {
  const p = partesDeFecha(qDate);
  return p ? MESES[p.mes - 1] : '';
}

/** «Wolf cut mujer, Uñas de gel», o «Sin servicios». */
export function nombresDeServicios(
  res: Pick<ReservationDto, 'services'>
): string {
  const nombres = (res.services ?? []).map((s) => s.name);
  return nombres.length ? nombres.join(', ') : 'Sin servicios';
}

/**
 * La disponibilidad del día **sin** el bloque de la cita que se está moviendo.
 *
 * `GET /workers/availability` cuenta todas las reservas no canceladas, también
 * la que la clienta quiere mover; el backend, al comprobar el solape, la
 * excluye. Sin este recorte el portal tacharía horas que el servidor aceptaría
 * (moverla media hora el mismo día, por ejemplo).
 *
 * Solo toca el día de la cita, solo a su estilista y un solo bloque (el que
 * coincide en inicio y fin). Devuelve una copia: la respuesta original vive en
 * la caché de consultas y la comparten otras pantallas.
 */
export function sinLaPropiaReserva(
  disponibilidad: WorkerAvailabilityResponse,
  reserva: Pick<
    ReservationDto,
    'scheduledAt' | 'workerId' | 'totalDurationMinutes' | 'status'
  >,
  fechaQDate: string
): WorkerAvailabilityResponse {
  if (reserva.status === 'cancelada') return disponibilidad;
  const inicio = partesEnBogota(reserva.scheduledAt);
  if (inicio.qDate !== fechaQDate) return disponibilidad;

  const desde = inicio.minutoDelDia;
  const hasta = desde + reserva.totalDurationMinutes;
  let quitado = false;

  return {
    ...disponibilidad,
    workers: disponibilidad.workers.map((w) => {
      if (quitado || w.id !== reserva.workerId) return w;
      const indice = w.reservations.findIndex(
        (b) => b.startMin === desde && b.endMin === hasta
      );
      if (indice === -1) return w;
      quitado = true;
      const usedMinutes = Math.max(
        0,
        w.usedMinutes - reserva.totalDurationMinutes
      );
      return {
        ...w,
        reservations: w.reservations.filter((_, i) => i !== indice),
        usedMinutes,
        availableMinutes: Math.min(
          w.capacityMinutes,
          w.availableMinutes + (w.usedMinutes - usedMinutes)
        ),
      };
    }),
  };
}

/**
 * Texto para un fallo al cancelar (leído en `cancel-reservation.use-case.ts` y
 * en el filtro de errores de dominio): 409 = la hora ya pasó; 400 = transición
 * inválida (ya cancelada o cumplida); sin respuesta = la conexión.
 */
export function cancelErrorMessage(error: unknown): string {
  const response = (error as { response?: { status?: number } })?.response;
  if (!response) return MENSAJE_SIN_CONEXION_RESERVAS;
  if (response.status === 409) {
    return 'Ya no se puede cancelar: la hora de la cita ya pasó.';
  }
  if (response.status === 400) {
    return 'Esta cita ya no se puede cancelar: puede que ya esté cancelada o cumplida.';
  }
  return 'No se pudo cancelar la cita. Inténtalo de nuevo en unos segundos.';
}
