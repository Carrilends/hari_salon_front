// src/composables/auth.ts
import { ref } from 'vue';
import { useMutation } from '@tanstack/vue-query';
import { AuthResponse } from 'src/api/apiTypes';
import { authApi } from 'src/api/auth-api';
import { useAuthStore } from 'src/stores/auth-store';

interface LoginBody {
  email: string;
  password: string;
}

/**
 * Un login es un comando, no una consulta: se modela con `useMutation`. La
 * llamada HTTP pasa por el cliente centralizado `authApi`.
 */
export const useAuth = () => {
  const authStore = useAuthStore();

  const loginBody = ref<LoginBody>({
    email: '',
    password: '',
  });

  const mutation = useMutation<AuthResponse, unknown, void>({
    mutationFn: () => authApi.login(loginBody.value),
    onSuccess: (val) => {
      authStore.setSession(
        val.token,
        {
          fullName: val.fullName,
          email: val.email,
          roles: val.roles,
          emailVerified: val.emailVerified,
        },
        val.expiresIn * 1000 + Date.now()
      );
    },
  });

  async function login(): Promise<AuthResponse> {
    try {
      const data = await mutation.mutateAsync();
      if (!data?.token) {
        authStore.logout();
        throw new Error('Respuesta inválida del servidor');
      }
      return data;
    } catch (err) {
      // Si algo falló, dejar la sesión limpia.
      authStore.logout();
      throw err;
    }
  }

  return {
    login,
    isLoading: mutation.isPending,
    data: mutation.data,
    error: mutation.error,
    loginBody,
  };
};
