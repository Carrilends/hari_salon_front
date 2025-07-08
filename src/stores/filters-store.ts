import { ref } from 'vue';
import { defineStore } from 'pinia';
import { GenresI, Tag } from 'src/interfaces/tag';
import { useOptionsStore } from './options-store';

export const useFiltersStore = defineStore('filters', () => {
  const optionsStore = useOptionsStore();

  const selectedGenres = ref<GenresI[]>([]);
  const principalServices = ref<Tag[]>([
    ...optionsStore.principalServices.map((s) => ({ ...s, selected: false })),
  ]);
  const restServices = ref<Tag[]>([
    ...optionsStore.restServices.map((s) => ({ ...s, selected: false })),
  ]);
  const servicesToShow = ref<Tag[]>([]);
  const selectedServicesIDs = ref<string[]>([]);

  // Setters
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

  const setServices = (services: string[]) => {
    selectedServicesIDs.value = services;
    servicesToShow.value = restServices.value.filter(
      (s) => services.includes(s.parent || '') || s.selected
    );
  };

  const setServicesToShow = () => {
    servicesToShow.value = restServices.value.filter(
      (s) =>
        selectedServicesIDs.value.includes(s.parent || '') || s.selected
    );
  };

  const manageServicesID = (id: string, selected: boolean) => {
    if (selected) {
      selectedServicesIDs.value.push(id);
    } else {
      selectedServicesIDs.value = selectedServicesIDs.value.filter(
        (s) => s !== id
      );
    }
    setServicesToShow();
  }

  return {
    // state
    selectedGenres,
    principalServices,
    selectedServicesIDs,
    servicesToShow,
    restServices,
    // getters
    // Setters
    setGenres,
    setServices,
    setServicesToShow,
    manageServicesID,
    removeGenre,
    clearGenders: () => (selectedGenres.value = []),
    clearPrincipalServices: () => {
      principalServices.value = principalServices.value.map((s) => ({
        ...s,
        selected: false,
      }));
    },
    clearRestServices: () => {
      restServices.value = restServices.value.map((s) => ({
        ...s,
        selected: false,
      }));
    },
    clearSelectedServices: () => (selectedServicesIDs.value = []),
    clearServicesToShow: () => {
      servicesToShow.value = [];
    },
  };
});

// const genderOptions = optionsStore.genres;
