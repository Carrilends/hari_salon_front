import { ref } from 'vue';
import { useMutation } from '@tanstack/vue-query';
import { authApi } from 'src/api/auth-api';

export function useResetPassword() {
  const done = ref(false);

  const mutation = useMutation({
    mutationFn: (vars: { token: string; newPassword: string }) =>
      authApi.resetPassword(vars.token, vars.newPassword),
    onSuccess: () => {
      done.value = true;
    },
  });

  return {
    done,
    submit: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}
