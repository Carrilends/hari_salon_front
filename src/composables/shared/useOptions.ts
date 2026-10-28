import { useQuery } from '@tanstack/vue-query';
import { watch } from 'vue';

import { OptionsApiResponse } from 'src/api/apiTypes';
import optionsApi from 'src/api/options-api';
import { useOptionsStore } from 'src/stores/options-store';
import { EN_SERVIDOR } from 'src/composables/shared/en-servidor';

export const getOptions = async (): Promise<OptionsApiResponse> => {
  const { data } = await optionsApi.get<OptionsApiResponse>('/filters');
  return data;
};

export const useOptions = () => {
  const optionsStore = useOptionsStore();

  const { isLoading, data } = useQuery<OptionsApiResponse>({
    queryKey: ['options'],
    queryFn: getOptions,
    // No se precarga: `options-api` tiene una base relativa, que en Node
    // (`quasar ssg generate`) iría a `localhost:80`. El navegador la pide al
    // montar.
    enabled: !EN_SERVIDOR,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // `immediate`: con `staleTime: Infinity` la respuesta suele estar ya en la
  // caché (la pidió otra página) y `data` no vuelve a cambiar; sin él, el store
  // no la recibiría nunca.
  watch(
    data,
    (newValue) => {
      if (newValue) {
        optionsStore.setGenres(newValue.genders);
        optionsStore.setPrincipalServices(newValue.principalParents);
      }
    },
    { immediate: true }
  );

  return { isLoading };
};
