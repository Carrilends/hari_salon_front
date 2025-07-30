import { ref, watch } from 'vue';
import { useQuery } from '@tanstack/vue-query';

import { AuthResponse } from 'src/api/apiTypes';
import { servicesApi } from 'src/api/services-api';
import { useAuthStore } from 'src/stores/auth-store';

interface LoginBody {
  email: string;
  password: string;
}

export const getAuthStatus = async (
  loginBody: LoginBody
): Promise<AuthResponse> => {
  const response = await servicesApi.post('/auth/login', loginBody);
  return response.data;
};

export const useAuth = () => {
  const authStore = useAuthStore();

  const loginBody = ref({
    email: '',
    password: '',
  });
  const isLogged = ref<string>('');

  const { isLoading, data, refetch } = useQuery<AuthResponse>({
    queryKey: ['authStatus', loginBody],
    queryFn: ({ queryKey }) => {
      const [, loginBody] = queryKey;
      return getAuthStatus(loginBody as LoginBody);
    },
    enabled: false,
    retry: false,
    // staleTime: Infinity,
    // refetchOnMount: false,
    // refetchOnWindowFocus: false
    // refetchOnReconnect: false,
  });

  watch(data, (newValue) => {
    if (newValue !== undefined) {
      console.log('Auth data received:', newValue);
      authStore.token = newValue.token;
      authStore.fullname = newValue.fullName;
      authStore.email = newValue.email;
      authStore.roles = newValue.roles;
    }
  });

  return {
    refetch,
    isLoading,
    data,
    isLogged,
    loginBody,
  };
};
