import { ref } from 'vue'
import { defineStore } from 'pinia'
import Service from 'src/interfaces/service';

export const useServicesStore = defineStore('services', () => {
  const currentPage = ref<number>(1);
  const totalPages = ref<number>(10);
  const services = ref<Service[]>([]);

  // One Service
  const service = ref<Service>({} as Service);

  return {
    // State
    currentPage,
    totalPages,
    services,
    service,
    // Actions
    setCurrentPage(page: number) {
      currentPage.value = page;
    },
    setTotalPages(pages: number) {
      totalPages.value = pages;
    },
    setServices(servicesList: Service[]) {
      services.value = servicesList;
    },
    setService(serviceReceived: Service) {
      service.value = serviceReceived;
    },
  };
});
