import { watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useQuery } from '@tanstack/vue-query'

import { useServicesStore } from 'src/stores/service-store'
import servicesApi from 'src/api/services-api'
import Service from 'src/interfaces/service'

export const getServices = async ():Promise<Service[]> => {
  const { data } = await servicesApi.get<Service[]>('/service')
  return data
}

export const useServices = () => {

  const storeService = useServicesStore()
  const { services } = storeToRefs(storeService)

  const { isLoading, data } = useQuery({
    queryKey: ['services'], // ['services?page=1&limit=10', page, limit] // ['services?page=', 1]
    queryFn: () => getServices(),
    // staleTime: 1000 * 60 * 2,
  })

  watch(data, services => {
    if (services) {
      storeService.setServices(services)
    }
  })

  return {
    isLoading,
    services
  }
}

