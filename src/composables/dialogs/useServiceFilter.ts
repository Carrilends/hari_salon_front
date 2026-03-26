import { useFiltersStore } from 'src/stores/filters-store';
import { useOptionsStore } from 'src/stores/options-store';
import type { GenresI } from 'src/interfaces/tag';
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

export type FilterGenreChip = GenresI & { selected: boolean };

export const useFilterService = (emit: FiltersEmits) => {
  const filtersStore = useFiltersStore();
  const optionsStore = useOptionsStore();

  const includePriceRange = ref(false);
  const prices = ref({
    min: 5,
    max: 200,
  });

  const buildFilterGenres = (): FilterGenreChip[] =>
    optionsStore.genres.map((genre) => ({
      ...genre,
      selected: filtersStore.selectedGenres.some((sg) => sg.id === genre.id),
    }));

  const filterGenres = ref<FilterGenreChip[]>(buildFilterGenres());

  const syncGenresFromStore = () => {
    filterGenres.value = buildFilterGenres();
  };

  watch(
    () => filtersStore.selectedGenres,
    () => {
      syncGenresFromStore();
    },
    { deep: true }
  );

  watch(
    () => optionsStore.genres,
    () => {
      syncGenresFromStore();
    },
    { deep: true }
  );

  watch(
    filterGenres,
    () => {
      const next = optionsStore.genres.filter((g) =>
        filterGenres.value.some((fg) => fg.id === g.id && fg.selected)
      );
      const oldIds = filtersStore.selectedGenres
        .map((g) => g.id)
        .sort()
        .join(',');
      const newIds = next
        .map((g) => g.id)
        .sort()
        .join(',');
      if (oldIds !== newIds) {
        filtersStore.selectedGenres = next;
      }
    },
    { deep: true }
  );

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
    filtersStore.clearSelectedServices();
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
    includePriceRange,
    prices,
    filterGenres,
    amountOfFilters,
    cleanFilters,
    clearServices,
    sendFilter,
  };
};
