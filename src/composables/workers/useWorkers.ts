import { computed } from 'vue';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/vue-query';
import {
  createWorker,
  fetchWorkers,
  removeWorker,
  updateWorker,
  type WorkerItem,
} from 'src/api/workers-api';

const WORKERS_QUERY_KEY = ['workers'] as const;

type UpdateWorkerPayload = {
  id: string;
  body: { name: string };
};

export const useWorkers = () => {
  const queryClient = useQueryClient();
  const { data, isLoading, isFetching, refetch } = useQuery<WorkerItem[]>({
    queryKey: WORKERS_QUERY_KEY,
    queryFn: fetchWorkers,
    staleTime: 1000 * 60,
  });

  const createWorkerMutation = useMutation({
    mutationFn: createWorker,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: WORKERS_QUERY_KEY });
    },
  });

  const updateWorkerMutation = useMutation({
    mutationFn: ({ id, body }: UpdateWorkerPayload) => updateWorker(id, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: WORKERS_QUERY_KEY });
    },
  });

  const removeWorkerMutation = useMutation({
    mutationFn: removeWorker,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: WORKERS_QUERY_KEY });
    },
  });

  const workers = computed(() => data.value ?? []);

  return {
    workers,
    isLoading,
    isFetching,
    refetch,
    createWorkerMutation,
    updateWorkerMutation,
    removeWorkerMutation,
  };
};
