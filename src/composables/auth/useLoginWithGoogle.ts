import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { authApi } from 'src/api/auth-api';
import { useAuthStore } from 'src/stores/auth-store';
import { mensajeDeAcceso } from 'src/helpers/mensajes-acceso';
import type { AuthResponse } from 'src/api/apiTypes';

type ApiError = {
  response?: { status?: number; data?: { message?: string | string[] } };
};

function messageOf(err: unknown): string {
  const msg = (err as ApiError)?.response?.data?.message;
  return Array.isArray(msg) ? msg.join(', ') : msg ?? '';
}

/**
 * Flujo compartido del inicio de sesión con Google: recibe el ID token del
 * botón, lo canjea en el backend, hidrata el store y redirige.
 *
 * Sin Quasar (decisión A11): el error queda en `error` para que la página lo
 * pinte en línea, y si el backend exige el consentimiento (cuenta nueva, S9)
 * se levanta `pidiendoConsentimiento`; la página abre `ConsentimientoGoogle` y
 * llama a `aceptarConsentimiento()` (reintenta con `true`) o a
 * `rechazarConsentimiento()`.
 */
export function useLoginWithGoogle(options?: { redirectTo?: string }) {
  const router = useRouter();
  const authStore = useAuthStore();
  const isLoading = ref(false);
  const error = ref('');
  const pidiendoConsentimiento = ref(false);
  /** La credencial que espera el consentimiento; se gasta una sola vez. */
  let credencialPendiente = '';

  async function complete(data: AuthResponse) {
    authStore.setSession(
      data.token,
      {
        fullName: data.fullName,
        email: data.email,
        roles: data.roles ?? ['user'],
        emailVerified: data.emailVerified,
      },
      data.expiresIn * 1000 + Date.now()
    );
    await router.push({ path: options?.redirectTo ?? '/services' });
  }

  async function handleCredential(
    idToken: string,
    dataPolicyAccepted?: boolean
  ): Promise<void> {
    isLoading.value = true;
    error.value = '';
    try {
      const data = await authApi.loginWithGoogle(idToken, dataPolicyAccepted);
      await complete(data);
    } catch (err: unknown) {
      const status = (err as ApiError)?.response?.status;
      // Cuenta nueva por Google: el backend exige el consentimiento (S9). Se
      // pide aquí y se reintenta, en vez de mandar a la pantalla de registro.
      // Si ya se había mandado `true`, no se pregunta otra vez: es un error.
      if (
        status === 400 &&
        /Política de Tratamiento/i.test(messageOf(err)) &&
        !dataPolicyAccepted
      ) {
        credencialPendiente = idToken;
        pidiendoConsentimiento.value = true;
        return;
      }
      error.value = mensajeDeAcceso(err, 'google');
    } finally {
      isLoading.value = false;
    }
  }

  function aceptarConsentimiento(): void {
    const credencial = credencialPendiente;
    credencialPendiente = '';
    pidiendoConsentimiento.value = false;
    if (credencial) void handleCredential(credencial, true);
  }

  function rechazarConsentimiento(): void {
    credencialPendiente = '';
    pidiendoConsentimiento.value = false;
  }

  return {
    handleCredential,
    isLoading,
    error,
    pidiendoConsentimiento,
    aceptarConsentimiento,
    rechazarConsentimiento,
  };
}
