import { computed } from 'vue';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/vue-query';
import { adminServiceApi, servicesApi } from 'src/api/services-api';
import type { CreateFaqBody, FaqItem, UpdateFaqBody } from 'src/api/apiTypes';

const FAQ_QUERY_KEY = ['faqs'] as const;

const getFaqs = async (): Promise<FaqItem[]> => {
  const { data } = await servicesApi.get<FaqItem[]>('/faqs');
  return data;
};

type UpdateFaqPayload = {
  id: string;
  body: UpdateFaqBody;
};

export const useFaqs = () => {
  const queryClient = useQueryClient();
  const { data, isLoading, isFetching, refetch } = useQuery<FaqItem[]>({
    queryKey: FAQ_QUERY_KEY,
    queryFn: getFaqs,
    staleTime: 1000 * 60,
  });

  const createFaqMutation = useMutation({
    mutationFn: async (body: CreateFaqBody) => {
      const { data: createdFaq } = await adminServiceApi.post<FaqItem>('/faqs', body);
      return createdFaq;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: FAQ_QUERY_KEY });
    },
  });

  const updateFaqMutation = useMutation({
    mutationFn: async ({ id, body }: UpdateFaqPayload) => {
      const { data: updatedFaq } = await adminServiceApi.patch<FaqItem>(`/faqs/${id}`, body);
      return updatedFaq;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: FAQ_QUERY_KEY });
    },
  });

  const removeFaqMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data: result } = await adminServiceApi.delete<{ deleted: boolean }>(`/faqs/${id}`);
      return result;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: FAQ_QUERY_KEY });
    },
  });

  const faqs = computed(() => data.value ?? []);

  return {
    faqs,
    isLoading,
    isFetching,
    refetch,
    createFaqMutation,
    updateFaqMutation,
    removeFaqMutation,
  };
};
