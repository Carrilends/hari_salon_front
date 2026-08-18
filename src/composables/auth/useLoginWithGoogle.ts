import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { authApi } from 'src/api/auth-api';
import { useAuthStore } from 'src/stores/auth-store';
import type { AuthResponse } from 'src/api/apiTypes';

type ApiError = {
  response?: { status?: number; data?: { message?: string | string[] } };
};

function messageOf(err: unknown): string {
  const msg = (err as ApiError)?.response?.data?.message;
  return Array.isArray(msg) ? msg.join(', ') : (msg ?? '');
}

/**
 * Flujo compartido del inicio de sesión con Google: recibe el ID token del
 * botón, lo canjea en el backend, hidrata el store y redirige. Si el backend
 * exige el consentimiento (cuenta nueva, S9), lo pide en un diálogo y reintenta.
 */
export function useLoginWithGoogle(options?: { redirectTo?: string }) {
  const router = useRouter();
  const $q = useQuasar();
  const authStore = useAuthStore();
  const isLoading = ref(false);

  async function complete(data: AuthResponse) {
    authStore.setSession(
      data.token,
      {
        fullName: data.fullName,
        email: data.email,
        roles: data.roles,
        emailVerified: data.emailVerified,
      },
      data.expiresIn * 1000 + Date.now()
    );
    await router.push({ path: options?.redirectTo ?? '/services' });
  }

  async function handleCredential(idToken: string, dataPolicyAccepted?: boolean) {
    isLoading.value = true;
    try {
      const data = await authApi.loginWithGoogle(idToken, dataPolicyAccepted);
      await complete(data);
    } catch (err: unknown) {
      const status = (err as ApiError)?.response?.status;
      const msg = messageOf(err);
      // Cuenta nueva por Google: el backend exige el consentimiento (S9). Se pide
      // aquí y se reintenta, en vez de mandar al usuario a la pantalla de registro.
      if (
        status === 400 &&
        /Política de Tratamiento/i.test(msg) &&
        !dataPolicyAccepted
      ) {
        $q.dialog({
          title: 'Política de Tratamiento de Datos',
          message:
            'Para crear tu cuenta con Google debes aceptar la Política de Tratamiento de Datos Personales (Ley 1581 de 2012).',
          cancel: 'Cancelar',
          ok: 'Acepto',
          persistent: true,
        }).onOk(() => {
          void handleCredential(idToken, true);
        });
        return;
      }
      $q.notify({
        type: 'negative',
        message: msg || 'No se pudo iniciar sesión con Google',
      });
    } finally {
      isLoading.value = false;
    }
  }

  return { handleCredential, isLoading };
}
