import type { ReservationDto } from 'src/interfaces/booking';

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
