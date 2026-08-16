import { useMutation } from '@tanstack/vue-query';
import { authApi } from 'src/api/auth-api';

export function useVerifyEmail() {
  const mutation = useMutation({
    mutationFn: (token: string) => authApi.verifyEmail(token),
  });

  return {
    verify: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isSuccess: mutation.isSuccess,
    error: mutation.error,
  };
}
