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
