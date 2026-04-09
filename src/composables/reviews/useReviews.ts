import { computed } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import { servicesApi } from 'src/api/services-api';
import type { ReviewItem } from 'src/api/apiTypes';

const getReviews = async (): Promise<ReviewItem[]> => {
  const { data } = await servicesApi.get<ReviewItem[]>('/reviews');
  return data;
};

export const useReviews = () => {
  const { data, isLoading, isFetching, refetch } = useQuery<ReviewItem[]>({
    queryKey: ['reviews'],
    queryFn: getReviews,
    staleTime: 1000 * 60,
  });

  const reviews = computed(() => data.value ?? []);
  const averageScore = computed(() => {
    if (!reviews.value.length) return 0;
    const total = reviews.value.reduce((acc, review) => acc + Number(review.score || 0), 0);
    return Number((total / reviews.value.length).toFixed(1));
  });

  return {
    reviews,
    averageScore,
    isLoading,
    isFetching,
    refetch,
  };
};
