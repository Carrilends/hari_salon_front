import { computed, ref, watch } from 'vue';
import { useQuery } from '@tanstack/vue-query';

import { useServicesStore } from 'src/stores/service-store';
import { servicesApi } from 'src/api/services-api';
import Service from 'src/interfaces/service';

type ApiDataWithCount = [Service[], number];
type fiilterService = {
  name: string;
  selectedGenres: string[];
  selectedServicesIDs: string[];
  includePriceRange: boolean;
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

  const filterService = ref<fiilterService>({
    name: '',
    // Modified by ServiceFilterDialog
    selectedGenres: [],
    selectedServicesIDs: [],
    includePriceRange: false,
    prices: {
      min: 5,
      max: 200,
    },
    // Used for pagination
    page: 1,
    limit: 10,
  });

  const logs = ref(0);

  const { isLoading, data, isFetching } = useQuery<ApiDataWithCount>({
    // ¡Aquí está la clave de la paginación! El queryKey debe depender de 'page' y 'limit'
    // Cuando 'page' o 'limit' cambien, Vue Query invalidará la caché y refetcheará
    queryKey: ['services', filterService], // Array de dependencias reactivas
    queryFn: ({ queryKey }) => {
      // Desestructuramos page y limit del queryKey
      const [, filterService] = queryKey;
      return getServices(filterService as fiilterService);
    },
    // staleTime: 1000 * 60 * 2, // Puedes mantenerlo si es necesario
    // Esto es útil para la paginación, los datos anteriores se mantienen mientras se carga la nueva página
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

  return {
    isLoading,
    isFetching, // isFetching es útil para mostrar un spinner mientras se carga la siguiente página
    services,
    filterService,
    setPage, // Función para cambiar la página
    setLimit, // Función para cambiar el límite
    totalPages, // Total de páginas calculadas
  };
};
