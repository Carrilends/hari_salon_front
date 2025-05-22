import axios from 'axios'

const servicesApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL,// localhost:3000/api/service
})


export default servicesApi
