import {
  estadoDeError,
  MENSAJE_SIN_CONEXION,
} from 'src/helpers/mensajes-acceso';

/**
 * Traduce un error de las rutas de Mi cuenta a una frase en línea (plan 6,
 * C2). Hermano de `mensajeDeAcceso` (que no se toca: es del acceso), con los
 * contextos de esta página.
 *
 * Formas del backend (`hair_salon_back/src/auth`):
 * - `PATCH /auth/me/email|password` con la contraseña actual mal (o una cuenta
 *   sin contraseña) → 401 «Credenciales inválidas». El interceptor intenta una
 *   renovación y reintenta; el reintento vuelve a dar 401 y llega aquí.
 * - Cualquier otro 401 = la renovación falló: la sesión caducó.
 * - 400 con texto en español: «El correo ya está registrado», «El nuevo
 *   correo debe ser distinto del actual», «La nueva contraseña debe ser
 *   distinta de la actual», «Correo electrónico inválido: …». El arreglo de
 *   class-validator viene en inglés: se cambia por el respaldo.
 */
export type ContextoCuenta =
  | 'perfil'
  | 'correo'
  | 'contrasena'
  | 'enlace'
  | 'reenvio'
  | 'cerrar-todas';

export type ErrorDeCuenta = {
  texto: string;
  /** El campo al que pertenece el error, si es de un campo. */
  campo: 'contrasena-actual' | null;
};

export const MENSAJE_CONTRASENA_ACTUAL = 'La contraseña actual no es correcta.';

export const MENSAJE_SESION_CADUCADA =
  'Tu sesión caducó. Vuelve a entrar e inténtalo otra vez.';

export const RESPALDO_CUENTA: Record<ContextoCuenta, string> = {
  perfil: 'No pudimos guardar tu nombre. Inténtalo de nuevo en un momento.',
  correo: 'No pudimos cambiar tu correo. Inténtalo de nuevo en un momento.',
  contrasena:
    'No pudimos cambiar tu contraseña. Inténtalo de nuevo en un momento.',
  enlace: 'No pudimos enviar el enlace. Inténtalo de nuevo en un momento.',
  reenvio: 'No pudimos reenviar el enlace. Inténtalo de nuevo en un momento.',
  'cerrar-todas':
    'No pudimos cerrar las demás sesiones. Inténtalo de nuevo en un momento.',
};

type ErrorDeApi = {
  request?: unknown;
  code?: string;
  response?: { data?: { message?: unknown } };
};

export function errorDeCuenta(
  err: unknown,
  contexto: ContextoCuenta
): ErrorDeCuenta {
  const respaldo: ErrorDeCuenta = {
    texto: RESPALDO_CUENTA[contexto],
    campo: null,
  };
  if (!err || typeof err !== 'object') return respaldo;

  const error = err as ErrorDeApi;
  const estado = estadoDeError(err);
  if (estado === undefined) {
    // Axios sin respuesta: la petición salió y no volvió nada.
    return error.request !== undefined || error.code === 'ERR_NETWORK'
      ? { texto: MENSAJE_SIN_CONEXION, campo: null }
      : respaldo;
  }

  if (estado === 401) {
    return contexto === 'correo' || contexto === 'contrasena'
      ? { texto: MENSAJE_CONTRASENA_ACTUAL, campo: 'contrasena-actual' }
      : { texto: MENSAJE_SESION_CADUCADA, campo: null };
  }

  if (estado === 400 || estado === 409) {
    const mensaje = error.response?.data?.message;
    if (typeof mensaje === 'string' && mensaje.trim() !== '') {
      return { texto: mensaje.trim(), campo: null };
    }
  }
  return respaldo;
}
