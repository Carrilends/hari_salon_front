import { ref } from 'vue'
import { defineStore } from 'pinia'
import Service from 'src/interfaces/service'
import servicesApi from 'src/api/services-api'
// import type {} from 'interface'

export const getService = async (id: string):Promise<Service> => {
  const { data } = await servicesApi.get<Service>(`/service/${id}`)
  return data
}

export const useServicesStore = defineStore('services', () => {
  // Loading state
  const loadingState = ref<boolean>(false)

  const currentPage = ref<number>(1)
  const totalPages = ref<number>(10)
  const services = ref<Service[]>([])

  // One Service
  const service = ref<Service>({} as Service)



  return {
    // State
    currentPage,
    totalPages,
    services,
    service,
    // Actions
    setCurrentPage(page: number) {
      currentPage.value = page
    },
    setTotalPages(pages: number) {
      totalPages.value = pages
    },
    setServices(servicesList: Service[]) {
      services.value = servicesList
    },
    async getServiceById(serviceId: string) {
      loadingState.value = true
      service.value = await getService(serviceId)
      loadingState.value = false
    },
  }
})
