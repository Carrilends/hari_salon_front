import { ref } from 'vue';
import { authApi } from 'src/api/auth-api';
import { errorDeCuenta } from 'src/helpers/mensajes-cuenta';

/**
 * Pide el enlace de restablecer al correo de la cuenta, sin salir de Mi cuenta
 * (plan 6, C3). Es el mismo `POST /auth/forgot-password` que la página de
 * recuperar, y el enlace lleva a la misma página de restablecer; aquí no hace
 * falta escribir el correo, porque ya se sabe. Sirve para crear la primera
 * contraseña de una cuenta de Google y para «¿No la recuerdas?».
 *
 * A diferencia de la página de recuperar (respuesta neutra a propósito), aquí
 * la clienta ya entró: un fallo de red se le dice, para que lo reintente.
 */
export function useEnlaceContrasena() {
  const enviando = ref(false);
  const enviadoA = ref('');
  const error = ref('');

  async function enviar(correo: string): Promise<void> {
    if (enviando.value) return;
    enviando.value = true;
    error.value = '';
    try {
      await authApi.forgotPassword(correo);
      enviadoA.value = correo;
    } catch (err: unknown) {
      error.value = errorDeCuenta(err, 'enlace').texto;
    } finally {
      enviando.value = false;
    }
  }

  return { enviando, enviadoA, error, enviar };
}
