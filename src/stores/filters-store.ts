import { ref } from 'vue';
import { defineStore } from 'pinia';
import { GenresI } from 'src/interfaces/tag';
import { useOptionsStore } from './options-store';

export const useFiltersStore = defineStore('filters', () => {
  const optionsStore = useOptionsStore();

  const selectedGenres = ref<GenresI[]>([]);
  const selectedServicesIDs = ref<string[]>([]);

  const removeGenre = (id: string) => {
    selectedGenres.value = selectedGenres.value.filter(
      (g: GenresI) => g.id !== id
    );
  };

  const setGenres = (genres: string[]) => {
    selectedGenres.value = optionsStore.genres.filter((g: GenresI) =>
      genres.includes(g.id)
    );
  };

  const setSelectedServiceIds = (ids: string[]) => {
    selectedServicesIDs.value = [...ids];
  };

  /** Restaura IDs desde navegación u orígenes externos (misma semántica que ServicesBox). */
  const setServicesExternal = (services: string[]) => {
    setSelectedServiceIds(services);
  };

  return {
    selectedGenres,
    selectedServicesIDs,
    setGenres,
    setSelectedServiceIds,
    setServicesExternal,
    removeGenre,
    clearGenders: () => (selectedGenres.value = []),
    clearSelectedServices: () => (selectedServicesIDs.value = []),
  };
});
