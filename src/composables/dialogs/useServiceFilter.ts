import type { GenresI, Tag } from 'src/interfaces/tag';
import { useOptionsStore } from 'src/stores/options-store';
import { computed, ref, watch } from 'vue';

export const useFilterService = () => {
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
    min: 15,
    max: 100,
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
  };

  const sendFilter = () => {
    console.log({
      selectedGenres: selectedGenres.value.map((s) => s.id),
      selectedServicesIDs: selectedServicesIDs.value.map((s) => s),
      includePriceRange: includePriceRange.value,
      prices: prices.value,
    });
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

  return {
    // Pricipales secciones
    genderOptions,
    principalServices,
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
    sendFilter,
  };
};
