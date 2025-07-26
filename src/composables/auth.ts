import { useQuery } from '@tanstack/vue-query';
import { AuthResponse } from 'src/api/apiTypes';
import servicesApi from 'src/api/services-api';
import { ref, watch } from 'vue';

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
    console.log('Auth status!! DATA', newValue);

    if (newValue !== undefined) {
      console.log('Auth status updated: DATA', newValue);
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
