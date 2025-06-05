import axios from 'axios'
const optionsApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL + '/shared-info',
})

export default optionsApi
