/**
 * Traduce un error de la API de autenticación a una frase para la pantalla.
 *
 * Los avisos flotantes de Quasar se iban solos, con colores que no son de la
 * paleta, y repetían el texto crudo del backend. Ahora el error se pinta en
 * línea, encima del botón que envía (`AvisoAcceso.vue`, decisión A7), y su
 * texto sale de aquí. Puro a propósito: se prueba sin montar nada y lo
 * comparten las cinco pantallas y el acceso con Google.
 *
 * Formas que devuelve el backend (`hair_salon_back/src/auth`):
 * - entrar con credenciales malas o cuenta inactiva → 401 (se responde igual
 *   para no revelar si la cuenta existe);
 * - correo ya registrado → 400 «El correo ya está registrado» (no 409);
 * - validación del DTO → 400 con `message` en arreglo (class-validator);
 * - enlace inexistente, caducado o usado → 400, los tres iguales a propósito;
 * - Google: 401 «Token de Google inválido», 400 si la cuenta de Google no
 *   tiene el correo verificado.
 */
export type ContextoAcceso =
  | 'entrar'
  | 'registro'
  | 'recuperar'
  | 'restablecer'
  | 'google';

export const MENSAJE_CREDENCIALES =
  'El correo o la contraseña no coinciden. Revísalos e inténtalo otra vez.';

export const MENSAJE_SIN_CONEXION =
  'No pudimos conectar. Revisa tu conexión e inténtalo de nuevo.';

export const MENSAJE_DE_RESPALDO: Record<ContextoAcceso, string> = {
  entrar: 'No pudimos iniciar tu sesión. Inténtalo de nuevo en un momento.',
  registro: 'No pudimos crear tu cuenta. Inténtalo de nuevo en un momento.',
  recuperar: 'No pudimos enviar el enlace. Inténtalo de nuevo en un momento.',
  restablecer:
    'No pudimos guardar tu contraseña. Inténtalo de nuevo en un momento.',
  google: 'No pudimos entrar con Google. Inténtalo otra vez o usa tu correo.',
};

type ErrorDeApi = {
  request?: unknown;
  code?: string;
  response?: { status?: number; data?: { message?: unknown } };
};

/** El estado HTTP de un error de Axios, o `undefined` si no hubo respuesta. */
export function estadoDeError(err: unknown): number | undefined {
  if (!err || typeof err !== 'object') return undefined;
  const estado = (err as ErrorDeApi).response?.status;
  return typeof estado === 'number' ? estado : undefined;
}

function textoDelServidor(message: unknown): string {
  if (typeof message === 'string') return message.trim();
  if (Array.isArray(message)) {
    return message
      .filter((m): m is string => typeof m === 'string' && m.trim() !== '')
      .map((m) => m.trim())
      .join(', ');
  }
  return '';
}

export function mensajeDeAcceso(
  err: unknown,
  contexto: ContextoAcceso
): string {
  const respaldo = MENSAJE_DE_RESPALDO[contexto];
  if (!err || typeof err !== 'object') return respaldo;

  const error = err as ErrorDeApi;
  const respuesta = error.response;
  if (!respuesta) {
    // Axios sin respuesta: la petición salió y no volvió nada (red caída,
    // servidor apagado). Un `Error` cualquiera, sin `request`, es otra cosa.
    return error.request !== undefined || error.code === 'ERR_NETWORK'
      ? MENSAJE_SIN_CONEXION
      : respaldo;
  }

  if (respuesta.status === 401 && contexto === 'entrar') {
    return MENSAJE_CREDENCIALES;
  }
  if (respuesta.status === 400 || respuesta.status === 409) {
    return textoDelServidor(respuesta.data?.message) || respaldo;
  }
  return respaldo;
}
