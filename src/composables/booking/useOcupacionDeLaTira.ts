import { computed, type MaybeRefOrGetter, toValue } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import { fetchReservationOccupancy } from 'src/api/reservations-api';
import type { ReservationOccupancyResponse } from 'src/helpers/booking-occupancy';
import { queryKeys } from 'src/api/query-keys';

/**
 * La ocupación de los días de la tira del cajón de reserva, en una sola
 * consulta: catorce días pueden partir dos meses, y la consulta por mes de
 * `useReservationOccupancy` (la del `q-date` de antes) haría falta dos veces.
 * El backend acepta cualquier rango `from`–`to`.
 *
 * Su clave cuelga de `occupancy.all`, así que el canal en tiempo real y el
 * éxito de una reserva ya la invalidan.
 */
export function useOcupacionDeLaTira(
  rango: MaybeRefOrGetter<{ desde: string; hasta: string }>,
  activo: MaybeRefOrGetter<boolean>
) {
  return useQuery<ReservationOccupancyResponse>({
    queryKey: computed(() =>
      queryKeys.occupancy.rango(toValue(rango).desde, toValue(rango).hasta)
    ),
    queryFn: () =>
      fetchReservationOccupancy(toValue(rango).desde, toValue(rango).hasta),
    enabled: computed(() => Boolean(toValue(activo))),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}
