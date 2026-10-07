import { computed, ref, watch } from 'vue';
import { useQuery } from '@tanstack/vue-query';

import { useServicesStore } from 'src/stores/service-store';
import { PRECIO_ESCALA_MAX, PRECIO_ESCALA_MIN } from 'src/stores/filters-store';
import { servicesApi } from 'src/api/services-api';
import Service from 'src/interfaces/service';

type ApiDataWithCount = [Service[], number];
type fiilterService = {
  name: string;
  selectedGenres: string[];
  selectedServicesIDs: string[];
  includePriceRange: boolean;
  includePromotionsOnly: boolean;
  prices: {
    min: number;
    max: number;
  };
  page: number; // Para la paginación
  limit: number; // Para la paginación
};

// 1. Modificamos getServices para aceptar page y limit
export const getServices = async (
  fiilterService: fiilterService
): Promise<ApiDataWithCount> => {
  const { data } = await servicesApi.post<ApiDataWithCount>(
    '/service/search',
    fiilterService
  );
  return data;
};

// 2. Modificamos useServices para gestionar la paginación
export const useServices = () => {
  const storeService = useServicesStore();
  const refetch = ref(0); // Variable reactiva para forzar el refetch

  const filterService = ref<fiilterService>({
    name: '',
    // Modified by ServiceFilterDialog
    selectedGenres: [],
    selectedServicesIDs: [],
    includePriceRange: false,
    includePromotionsOnly: false,
    // La escala entera del control de precio, la misma del store.
    prices: {
      min: PRECIO_ESCALA_MIN,
      max: PRECIO_ESCALA_MAX,
    },
    // Used for pagination
    page: 1,
    limit: 10,
  });

  const logs = ref(0);

  const { isLoading, data, isFetching, error } = useQuery<ApiDataWithCount>({
    queryKey: ['services', filterService, refetch],
    queryFn: ({ queryKey }) => {
      const [, filterService] = queryKey;
      return getServices(filterService as fiilterService);
    },
    placeholderData: (previousData) => previousData,
  });

  // Usamos un computed para acceder a los servicios del store, ya que el store es el "estado principal"
  const services = computed(() => storeService.services);

  // Observamos los cambios en 'data' para actualizar el store y los logs
  watch(
    data,
    (newValue) => {
      if (newValue) {
        const [apiServices, recordsCount] = newValue;
        if (apiServices && apiServices.length > 0) {
          storeService.setServices(apiServices);
        } else {
          // Opcional: limpiar el store si no hay servicios para la página actual
          storeService.setServices([]);
        }
        logs.value = recordsCount;
      }
    },
    { immediate: true }
  );

  // Función para cambiar de página
  const setPage = (newPage: number) => {
    if (newPage > 0) {
      // Simple validación
      filterService.value.page = newPage;
    }
  };

  // Función para cambiar el límite de registros por página
  const setLimit = (newLimit: number) => {
    if (newLimit > 0) {
      // Simple validación
      filterService.value.limit = newLimit;
      filterService.value.page = 1; // Generalmente, al cambiar el límite, volvemos a la primera página
    }
  };

  // Calcula el número total de páginas
  const totalPages = computed(() => {
    if (logs.value === 0 || filterService.value.limit === 0) return 1;
    return Math.ceil(logs.value / filterService.value.limit);
  });

  /**
   * El número de registros que casan con el filtro, tal como lo devuelve
   * `POST /service/search`. Lo piden la barra («48 servicios») y el pie («12 de
   * 48 servicios»): deducirlo de `totalPages × limit` diría 50 donde hay 48.
   */
  const totalServices = computed(() => logs.value);

  return {
    isLoading, // primera carga: la página pinta el esqueleto
    isFetching, // recarga (p. ej. otra página): señal discreta, nunca esqueleto
    // `error` faltaba, y sin él no había forma de distinguir «no hay servicios»
    // de «no se pudo preguntar». La página lo convierte en el panel de error con
    // su botón de reintentar (que sube `refetch`).
    error,
    services,
    filterService,
    refetch,
    setPage, // Función para cambiar la página
    setLimit, // Función para cambiar el límite
    totalPages, // Total de páginas calculadas
    totalServices, // Total de registros, para los conteos de la barra y el pie
  };
};
