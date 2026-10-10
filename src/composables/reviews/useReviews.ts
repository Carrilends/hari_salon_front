import { computed } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import { servicesApi } from 'src/api/services-api';
import { queryKeys } from 'src/api/query-keys';
import type { ReviewItem } from 'src/api/apiTypes';

const getReviews = async (): Promise<ReviewItem[]> => {
  const { data } = await servicesApi.get<ReviewItem[]>('/reviews');
  return data;
};

export const useReviews = () => {
  const { data, isPending, isLoading, isError, isFetching, refetch } = useQuery<
    ReviewItem[]
  >({
    queryKey: queryKeys.reviews.all,
    queryFn: getReviews,
    staleTime: 1000 * 60,
  });

  const reviews = computed(() => data.value ?? []);
  const averageScore = computed(() => {
    if (!reviews.value.length) return 0;
    const total = reviews.value.reduce(
      (acc, review) => acc + Number(review.score || 0),
      0
    );
    return Number((total / reviews.value.length).toFixed(1));
  });

  return {
    reviews,
    averageScore,
    /**
     * Sin datos todavía: cargando O en pausa sin red (TanStack v5,
     * `networkMode: 'online'`, deja la consulta en `pending` con
     * `fetchStatus: 'paused'`, y entonces `isLoading` es `false`). Quien
     * tenga que distinguir «vacío» de «aún no sé» mira esto, no `isLoading`.
     */
    isPending,
    isLoading,
    isError,
    isFetching,
    refetch,
  };
};
