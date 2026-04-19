import { computed, type MaybeRefOrGetter, toValue } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import {
  fetchWorkerAvailability,
  type WorkerAvailabilityResponse,
} from 'src/api/workers-api';

export function useWorkerAvailability(
  dateQDate: MaybeRefOrGetter<string>,
  dialogOpen: MaybeRefOrGetter<boolean>
) {
  const dateYmd = computed(() => toValue(dateQDate).replace(/\//g, '-'));
  const enabled = computed(() => Boolean(toValue(dialogOpen) && toValue(dateQDate)));

  return useQuery<WorkerAvailabilityResponse>({
    queryKey: computed(() => ['worker-availability', dateYmd.value]),
    queryFn: () => fetchWorkerAvailability(dateYmd.value),
    enabled,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
}
