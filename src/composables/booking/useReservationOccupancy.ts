import { computed, type MaybeRefOrGetter, toValue } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import { fetchReservationOccupancy } from 'src/api/reservations-api';
import type { ReservationOccupancyResponse } from 'src/helpers/booking-occupancy';
import { ymdRangeForCalendarMonth } from 'src/helpers/booking-occupancy';

export function useReservationOccupancy(
  year: MaybeRefOrGetter<number>,
  month: MaybeRefOrGetter<number>,
  dialogOpen: MaybeRefOrGetter<boolean>
) {
  const fromTo = computed(() =>
    ymdRangeForCalendarMonth(toValue(year), toValue(month))
  );
  const enabled = computed(() => Boolean(toValue(dialogOpen)));

  return useQuery<ReservationOccupancyResponse>({
    queryKey: computed(() => [
      'reservation-occupancy',
      toValue(year),
      toValue(month),
    ]),
    queryFn: () =>
      fetchReservationOccupancy(fromTo.value.from, fromTo.value.to),
    enabled,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}
