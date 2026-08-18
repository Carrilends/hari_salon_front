import axios from 'axios'
import { attachRefreshInterceptor } from './refresh-interceptor'
const optionsApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL + '/shared-info',
  withCredentials: true,
})
attachRefreshInterceptor(optionsApi)

export default optionsApi
