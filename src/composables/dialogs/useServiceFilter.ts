import type { GenresI, Tag } from 'src/interfaces/tag';
import { useOptionsStore } from 'src/stores/options-store';
import { computed, ref, watch } from 'vue';

export type FiltersEmits = {
  (e: 'update:amount', value: number): void;
  (e: 'update:services', value: FilterService): void;
};

export type FilterService = {
  selectedGenres: string[];
  selectedServicesIDs: string[];
  includePriceRange: boolean;
  prices: {
    min: number;
    max: number;
  };
};

export const useFilterService = (emit: FiltersEmits) => {
  const optionsStore = useOptionsStore();

  // Seccion de generos
  const genderOptions = optionsStore.genres;
  // Seccion de servicios principales
  const principalServices = ref<Tag[]>([
    ...optionsStore.principalServices.map((s) => ({ ...s, selected: false })),
  ]);
  // Seccion de resto de servicios
  const restServices = ref<Tag[]>([
    ...optionsStore.restServices.map((s) => ({ ...s, selected: false })),
  ]);
  // Seccion de servicios seleccionados
  const servicesToShow = ref<Tag[]>([]);
  // Formulario de envio de filtros
  const selectedGenres = ref<GenresI[]>([]);
  const selectedServicesIDs = ref<string[]>([]);
  const includePriceRange = ref(false);
  const prices = ref({
    min: 5,
    max: 200,
  });

  // ---------------- Functions ----------------
  const pickServices = (id: string, selected: boolean) => {
    if (selected) {
      selectedServicesIDs.value.push(id);
    } else {
      selectedServicesIDs.value = selectedServicesIDs.value.filter(
        (s) => s !== id
      );
    }
  };
  const removeGenre = (id: string) => {
    selectedGenres.value = selectedGenres.value.filter(
      (g: GenresI) => g.id !== id
    );
  };

  const cleanFilters = () => {
    selectedGenres.value = [];
    principalServices.value = principalServices.value.map((s) => ({
      ...s,
      selected: s.selected && false,
    }));
    restServices.value = restServices.value.map((s) => ({
      ...s,
      selected: s.selected && false,
    }));
    selectedServicesIDs.value = [];
    includePriceRange.value = false;
    sendFilter();
  };

  const sendFilter = () => {
    emit('update:services', {
      selectedGenres: selectedGenres.value.map((s) => s.id),
      selectedServicesIDs: selectedServicesIDs.value.map((s) => s),
      includePriceRange: includePriceRange.value,
      prices: {
        min: prices.value.min,
        max: prices.value.max,
      },
    });
  };

  const clearGenders = () => (selectedGenres.value = []);

  const clearServices = () => {
    principalServices.value = principalServices.value.map((s) => ({
      ...s,
      selected: false,
    }));
    restServices.value = restServices.value.map((s) => ({
      ...s,
      selected: false,
    }));
    selectedServicesIDs.value = [];
  };
  // ---------------- Computed ----------------
  const amountOfFilters = computed(() => {
    const genres = selectedGenres.value.length;
    const services = selectedServicesIDs.value.length;
    const havePrice = includePriceRange.value;
    return genres + services + (havePrice ? 1 : 0);
  });

  // ---------------- WATCHERS ----------------
  watch(
    () => selectedServicesIDs.value,
    () => {
      servicesToShow.value = restServices.value.filter(
        (s) => selectedServicesIDs.value.includes(s.parent || '') || s.selected
      );
    },
    { deep: true }
  );

  watch(amountOfFilters, (newVal) => {
    emit('update:amount', newVal);
  });

  return {
    // Pricipales secciones
    genderOptions,
    principalServices,
    selectedServicesIDs,
    // administracion de secciones
    selectedGenres,
    includePriceRange,
    servicesToShow,
    prices,
    // Computed
    amountOfFilters,
    // Funciones
    pickServices,
    removeGenre,
    cleanFilters,
    clearServices,
    clearGenders,
    sendFilter,
  };
};
