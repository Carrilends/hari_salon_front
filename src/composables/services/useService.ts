import { computed, /* Ref, */ watch } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import { useQuasar } from 'quasar';

import { useServicesStore } from 'src/stores/service-store';
import { adminServiceApi, servicesApi } from 'src/api/services-api';
import Service from 'src/interfaces/service';
import ServiceDialog from 'src/components/dialogs/serviceDialog.vue';
import { ref } from 'vue';
import { useBookStore } from 'src/stores/book-store';

// 1. Modificamos getServices para aceptar page y limit
export const getService = async (id: string): Promise<Service> => {
  const { data } = await servicesApi.get<Service>(`/service/${id}`);
  return data;
};

// 1.2 Delete
export const deleteService = async (id: string): Promise<void> => {
  await adminServiceApi.delete(`/service/${id}`);
};

// 2. Modificamos useServices para gestionar la paginación
export const useService = (/* serviceIdRef: Ref<string> */) => {
  const q = useQuasar();
  const storeService = useServicesStore();
  const bookStore = useBookStore();
  const serviceIdRef = ref<string>('');

  const { isLoading, data, isFetching } = useQuery<Service>({
    queryKey: ['service', serviceIdRef],
    queryFn: ({ queryKey }) => {
      const [, currentServiceId] = queryKey;
      // Aseguramos que currentServiceId sea string y no esté vacío antes de llamar a la API
      if (typeof currentServiceId === 'string' && currentServiceId) {
        return getService(currentServiceId);
      }
      // Si no hay ID, devolvemos una promesa que resuelve a un objeto Service vacío > Promise<Service>
      return Promise.resolve({} as Service);
    },
    staleTime: 1000 * 60 * 3,
    placeholderData: (previousData) => previousData,
  });

  // Usamos un computed para acceder a los servicios del store, ya que el store es el "estado principal"
  const service = computed(() => storeService.service);

  // Observamos los cambios en 'data'. Este watch ahora se activará cuando la query se complete.
  watch(data, (newValue) => {
    if (newValue && newValue.id) {
      storeService.setService(newValue);
      q.dialog({
        component: ServiceDialog,
        componentProps: {
          service: service.value,
          isFromBooking: false,
        },
        persistent: true,
      }).onOk((e) => {
        if (e === 'cancel') {
          serviceIdRef.value = ''; // Limpiamos el ID para cerrar el diálogo
          storeService.setService({} as Service); // Limpiamos el servicio en el store
        } else {
          serviceIdRef.value = '';
          bookStore.addBooking(e);
          // Limpiamos el ID también al aceptar
        }
      });
      // Si no hay un servicio válido (por ejemplo, al limpiar el ID)
    } else if (!newValue?.id) {
      storeService.setService({} as Service);
      // Opcional: Cerrar el diálogo si ya está abierto y se limpia el ID
      // if (q.dialog.isActive) { q.dialog.hide() } // Depende de cómo quieras manejarlo
    }
  });

  return {
    isLoading,
    isFetching,
    serviceIdRef,
  };
};
