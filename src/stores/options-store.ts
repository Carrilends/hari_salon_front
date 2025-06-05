import { ref } from 'vue';
import { defineStore } from 'pinia';
import { ChildTag, GenresI, Tag } from 'src/interfaces/tag';

export const useOptionsStore = defineStore(
  'options',
  () => {
    const genres = ref<GenresI[]>([]);
    const principalServices = ref<Tag[]>([]);
    const restServices = ref<ChildTag[]>([]);
    // const servicesNames = ref<string[]>([]);

    return {
      // State
      genres,
      restServices,
      principalServices,
      // servicesNames,
      // Actions
      setGenres(newGenres: GenresI[]) {
        genres.value = newGenres;
      },
      setRestServices(newRestServices: ChildTag[]) {
        restServices.value = newRestServices;
      },
      setPrincipalServices(newPrincipalServices: Tag[]) {
        principalServices.value = newPrincipalServices;
      },
      // Actions Getters
      getGenres() {
        return genres.value;
      },
    };
  },
  { persist: true }
);
