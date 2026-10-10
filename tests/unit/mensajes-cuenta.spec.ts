/**
 * El texto de los errores de Mi cuenta (plan 6, C2). En línea y en español:
 * - 401 al cambiar correo o contraseña = la contraseña actual no coincide, y
 *   va en SU campo;
 * - 401 en cualquier otra cosa = la sesión caducó (la renovación falló);
 * - 400 con un texto del backend (ya en español) = ese texto; el arreglo de
 *   class-validator viene en inglés y se cambia por el respaldo.
 */
import {
  errorDeCuenta,
  MENSAJE_CONTRASENA_ACTUAL,
  MENSAJE_SESION_CADUCADA,
  RESPALDO_CUENTA,
} from 'src/helpers/mensajes-cuenta';
import { MENSAJE_SIN_CONEXION } from 'src/helpers/mensajes-acceso';
import { errorDeRed, errorHttp } from './fixtures/acceso';

describe('errorDeCuenta', () => {
  it.each(['correo', 'contrasena'] as const)(
    '401 en %s: la contraseña actual, en su campo',
    (contexto) => {
      expect(
        errorDeCuenta(errorHttp(401, 'Credenciales inválidas'), contexto)
      ).toEqual({
        texto: MENSAJE_CONTRASENA_ACTUAL,
        campo: 'contrasena-actual',
      });
    }
  );

  it.each(['perfil', 'enlace', 'reenvio', 'cerrar-todas'] as const)(
    '401 en %s: la sesión caducó',
    (contexto) => {
      expect(errorDeCuenta(errorHttp(401), contexto)).toEqual({
        texto: MENSAJE_SESION_CADUCADA,
        campo: null,
      });
    }
  );

  it('400 con un texto del servidor: ese texto', () => {
    expect(
      errorDeCuenta(errorHttp(400, 'El correo ya está registrado'), 'correo')
    ).toEqual({ texto: 'El correo ya está registrado', campo: null });
  });

  it('409 con un texto del servidor: se trata como un 400', () => {
    expect(
      errorDeCuenta(errorHttp(409, 'El correo ya está registrado'), 'correo')
    ).toEqual({ texto: 'El correo ya está registrado', campo: null });
  });

  it('400 con el arreglo de class-validator (en inglés): el respaldo', () => {
    expect(
      errorDeCuenta(errorHttp(400, ['newEmail must be an email']), 'correo')
    ).toEqual({ texto: RESPALDO_CUENTA.correo, campo: null });
  });

  it('sin respuesta: sin conexión', () => {
    expect(errorDeCuenta(errorDeRed(), 'perfil')).toEqual({
      texto: MENSAJE_SIN_CONEXION,
      campo: null,
    });
  });

  it('un Error cualquiera, un 500 o nada: el respaldo de su contexto', () => {
    expect(errorDeCuenta(new Error('x'), 'perfil').texto).toBe(
      RESPALDO_CUENTA.perfil
    );
    expect(errorDeCuenta(errorHttp(500), 'contrasena').texto).toBe(
      RESPALDO_CUENTA.contrasena
    );
    expect(errorDeCuenta(null, 'cerrar-todas').texto).toBe(
      RESPALDO_CUENTA['cerrar-todas']
    );
  });

  it('los textos hablan de tú y acaban en punto', () => {
    Object.values(RESPALDO_CUENTA).forEach((texto) => {
      expect(texto).toMatch(/^No pudimos .+\.$/);
    });
    expect(MENSAJE_CONTRASENA_ACTUAL).toBe(
      'La contraseña actual no es correcta.'
    );
    expect(MENSAJE_SESION_CADUCADA).toMatch(/\.$/);
  });
});
