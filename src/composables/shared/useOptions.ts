import { useQuery } from '@tanstack/vue-query';
import { watch } from 'vue';

import { OptionsApiResponse } from 'src/api/apiTypes';
import optionsApi from 'src/api/options-api';
import { useOptionsStore } from 'src/stores/options-store';

export const getOptions = async (): Promise<OptionsApiResponse> => {
  const { data } = await  optionsApi.get<OptionsApiResponse>('/filters');
  return data;
}

export const useOptions = () => {
  const optionsStore = useOptionsStore();

  const { isLoading, data } = useQuery<OptionsApiResponse>({
    queryKey: ['options'],
    queryFn: getOptions,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  })

  watch(data, (newValue) => {
    if (newValue) {
      // Aquí podrías hacer algo con los nuevos datos, como guardarlos en un store o en un estado local
      optionsStore.setGenres(newValue.genders);
      optionsStore.setRestServices(newValue.childrens);
      optionsStore.setPrincipalServices(newValue.principalParents);
    }
  })

  return { isLoading }
}
