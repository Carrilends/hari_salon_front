// src/composables/auth.ts
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
  const { data } = await servicesApi.post('/auth/login', loginBody);
  return data;
};

export const useAuth = () => {
  const authStore = useAuthStore();

  const loginBody = ref<LoginBody>({
    email: '',
    password: '',
  });

  const { isLoading, data, refetch, error } = useQuery<AuthResponse>({
    queryKey: ['authStatus', loginBody],
    queryFn: ({ queryKey }) => {
      const [, body] = queryKey;
      return getAuthStatus(body as LoginBody);
    },
    enabled: false,
    retry: false,
  });

  // si prefieres onSuccess/onError, puedes pasarlos en las options del useQuery;
  // con watch también funciona bien:
  watch(data, (val) => {
    if (!val) return;
    // Guarda todo en el store con cálculo de expiración (decodifica del JWT)
    authStore.setSession(val.token, {
      fullName: val.fullName,
      email: val.email,
      roles: val.roles,
    });
  });

  async function login(): Promise<AuthResponse> {
    const result = await refetch();
    if (result.error) {
      // seguridad: si algo falló, asegúrate de dejar limpio
      authStore.logout();
      throw result.error;
    }
    if (!result.data?.token) {
      authStore.logout();
      throw new Error('Respuesta inválida del servidor');
    }
    return result.data;
  }

  return {
    login, // <-- usa este en el componente
    isLoading,
    data,
    error,
    loginBody,
  };
};
