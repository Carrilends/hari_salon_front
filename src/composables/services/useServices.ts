import { computed, ref, watch } from 'vue';
import { useQuery } from '@tanstack/vue-query';

import { useServicesStore } from 'src/stores/service-store';
import servicesApi from 'src/api/services-api';
import Service from 'src/interfaces/service';

type ApiDataWithCount = [Service[], number];

// 1. Modificamos getServices para aceptar page y limit
export const getServices = async (
  page: number = 1,
  limit: number = 10
): Promise<ApiDataWithCount> => {
  const { data } = await servicesApi.get<ApiDataWithCount>(
    `/service?page=${page}&limit=${limit}`
  );
  return data;
};

// 2. Modificamos useServices para gestionar la paginación
export const useServices = (initialPage: number = 1, initialLimit: number = 10) => {
  const storeService = useServicesStore();

  const page = ref(initialPage);
  const limit = ref(initialLimit);
  const logs = ref(0);

  const { isLoading, data, isFetching } = useQuery<ApiDataWithCount>({
    // ¡Aquí está la clave de la paginación! El queryKey debe depender de 'page' y 'limit'
    // Cuando 'page' o 'limit' cambien, Vue Query invalidará la caché y refetcheará
    queryKey: ['services', page, limit], // Array de dependencias reactivas
    queryFn: ({ queryKey }) => {
      // Desestructuramos page y limit del queryKey
      const [, currentPage, currentLimit] = queryKey;
      return getServices(currentPage as number, currentLimit as number);
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
      page.value = newPage;
    }
  };

  // Función para cambiar el límite de registros por página
  const setLimit = (newLimit: number) => {
    if (newLimit > 0) {
      // Simple validación
      limit.value = newLimit;
      page.value = 1; // Generalmente, al cambiar el límite, volvemos a la primera página
    }
  };

  // Calcula el número total de páginas
  const totalPages = computed(() => {
    if (logs.value === 0 || limit.value === 0) return 1;
    return Math.ceil(logs.value / limit.value);
  });

  return {
    isLoading,
    isFetching, // isFetching es útil para mostrar un spinner mientras se carga la siguiente página
    services,
    logs, // Total de registros en la DB
    page, // Página actual
    limit, // Límite por página
    setPage, // Función para cambiar la página
    setLimit, // Función para cambiar el límite
    totalPages, // Total de páginas calculadas
  };
};
