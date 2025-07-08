import { useFiltersStore } from 'src/stores/filters-store';
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
  const filtersStore = useFiltersStore();

  const includePriceRange = ref(false);
  const prices = ref({
    min: 5,
    max: 200,
  });

  // ---------------- Functions ----------------

  const cleanFilters = () => {
    filtersStore.clearGenders();
    includePriceRange.value = false;
    clearServices();
    sendFilter();
  };

  const sendFilter = () => {
    emit('update:services', {
      selectedGenres: filtersStore.selectedGenres.map((s) => s.id),
      selectedServicesIDs: filtersStore.selectedServicesIDs.map((s) => s),
      includePriceRange: includePriceRange.value,
      prices: {
        min: prices.value.min,
        max: prices.value.max,
      },
    });
  };

  const clearServices = () => {
    filtersStore.clearPrincipalServices();
    filtersStore.clearRestServices();
    filtersStore.clearSelectedServices();
    filtersStore.clearServicesToShow();
  };

  // ---------------- Computed ----------------
  const amountOfFilters = computed(() => {
    const genres = filtersStore.selectedGenres.length;
    const services = filtersStore.selectedServicesIDs.length;
    const havePrice = includePriceRange.value;
    return genres + services + (havePrice ? 1 : 0);
  });

  watch(
    () => amountOfFilters.value,
    (newValue) => {
      emit('update:amount', newValue);
    }
  );

  return {
    // Pricipales secciones
    // administracion de secciones
    includePriceRange,
    prices,
    // Computed
    amountOfFilters,
    // Funciones
    cleanFilters,
    clearServices,
    sendFilter,
  };
};
