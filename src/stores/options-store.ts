import { ref } from 'vue';
import { defineStore } from 'pinia';
import type { Genres, GenresI, Tag } from 'src/interfaces/tag';

const icons: Record<Genres, string> = {
  Masculino: 'face',
  Femenino: 'face_3',
  Unisex: 'wc',
  Niños: 'child_care',
};

export const useOptionsStore = defineStore(
  'options',
  () => {
    const genres = ref<GenresI[]>([]);
    const principalServices = ref<Tag[]>([]);
    const restServices = ref<Tag[]>([]);
    // const servicesNames = ref<string[]>([]);

    return {
      // State
      genres,
      restServices,
      principalServices,
      // servicesNames,
      // Actions
      setGenres(newGenres: GenresI[]) {
        genres.value = newGenres.map((genre) => ({
          ...genre,
          icon: icons[genre.name],
        }));
      },
      setRestServices(newRestServices: Tag[]) {
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
