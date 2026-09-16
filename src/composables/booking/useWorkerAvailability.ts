import { computed, type MaybeRefOrGetter, toValue } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import {
  fetchWorkerAvailability,
  type WorkerAvailabilityResponse,
} from 'src/api/workers-api';
import { queryKeys } from 'src/api/query-keys';

export function useWorkerAvailability(
  dateQDate: MaybeRefOrGetter<string>,
  dialogOpen: MaybeRefOrGetter<boolean>
) {
  const dateYmd = computed(() => toValue(dateQDate).replace(/\//g, '-'));
  const enabled = computed(() => Boolean(toValue(dialogOpen) && toValue(dateQDate)));

  return useQuery<WorkerAvailabilityResponse>({
    queryKey: computed(() => queryKeys.workerAvailability.day(dateYmd.value)),
    queryFn: () => fetchWorkerAvailability(dateYmd.value),
    enabled,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
}
