/**
 * Datos de prueba del flujo de acceso: la forma de los errores de Axios que
 * devuelve el backend (`hair_salon_back/src/auth`) y una sesión válida.
 *
 * Solo datos: no se usan dentro de las fábricas de `jest.mock`, que se elevan
 * por encima de los `import`.
 */
import type { AuthResponse } from 'src/api/apiTypes';

export type ErrorHttpDePrueba = {
  isAxiosError: true;
  message: string;
  response: {
    status: number;
    data: { statusCode?: number; message?: string | string[] };
  };
};

export type ErrorDeRedDePrueba = {
  isAxiosError: true;
  code: 'ERR_NETWORK';
  message: string;
  request: Record<string, never>;
};

/** Un error con respuesta, como el que lanza Axios ante un 4xx/5xx. */
export function errorHttp(
  status: number,
  message?: string | string[]
): ErrorHttpDePrueba {
  return {
    isAxiosError: true,
    message: `Request failed with status code ${status}`,
    response: {
      status,
      data: message === undefined ? {} : { statusCode: status, message },
    },
  };
}

/** La petición salió y no volvió nada: red caída, servidor apagado. */
export function errorDeRed(): ErrorDeRedDePrueba {
  return {
    isAxiosError: true,
    code: 'ERR_NETWORK',
    message: 'Network Error',
    request: {},
  };
}

/** El cuerpo de `POST /auth/login`, `/auth/register` y `/auth/google`. */
export function respuestaSesion(
  cambios: Partial<AuthResponse> = {}
): AuthResponse {
  return {
    id: 'u-1',
    email: 'clienta@correo.com',
    fullName: 'Clienta de Ejemplo',
    roles: ['user'],
    isActive: true,
    emailVerified: false,
    hasPassword: true,
    token: 'token-de-acceso',
    expiresIn: 900,
    ...cambios,
  };
}
