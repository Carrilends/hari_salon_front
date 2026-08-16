import { ref } from 'vue';
import { useMutation } from '@tanstack/vue-query';
import { authApi } from 'src/api/auth-api';

export function useForgotPassword() {
  const email = ref('');
  const sent = ref(false);

  const mutation = useMutation({
    mutationFn: () => authApi.forgotPassword(email.value),
    // El backend responde igual exista o no la cuenta; la interfaz debe
    // reflejar esa ambigüedad y no confirmar si el correo está registrado.
    onSuccess: () => {
      sent.value = true;
    },
  });

  return {
    email,
    sent,
    submit: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}
