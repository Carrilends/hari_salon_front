/**
 * El texto de los errores de acceso sale de UNA función pura (A7).
 *
 * Antes cada pantalla lanzaba un aviso de Quasar con el `message` crudo del
 * backend («Credenciales inválidas») o con un respaldo inventado en el sitio, y
 * el aviso se iba solo con colores de Quasar. Ahora el error se pinta en línea,
 * encima del botón que envía, y su frase se decide aquí.
 */
import {
  MENSAJE_CREDENCIALES,
  MENSAJE_DE_RESPALDO,
  MENSAJE_SIN_CONEXION,
  estadoDeError,
  mensajeDeAcceso,
  type ContextoAcceso,
} from 'src/helpers/mensajes-acceso';
import { errorDeRed, errorHttp } from './fixtures/acceso';

const CONTEXTOS: ContextoAcceso[] = [
  'entrar',
  'registro',
  'recuperar',
  'restablecer',
  'google',
];

describe('mensajeDeAcceso', () => {
  it('login con 401 dice que el correo o la contraseña no coinciden, con el texto exacto', () => {
    expect(
      mensajeDeAcceso(errorHttp(401, 'Credenciales inválidas'), 'entrar')
    ).toBe(
      'El correo o la contraseña no coinciden. Revísalos e inténtalo otra vez.'
    );
    expect(MENSAJE_CREDENCIALES).toBe(
      'El correo o la contraseña no coinciden. Revísalos e inténtalo otra vez.'
    );
  });

  it('una cuenta inactiva (también 401) no revela nada distinto', () => {
    expect(
      mensajeDeAcceso(errorHttp(401, 'La cuenta está inactiva'), 'entrar')
    ).toBe(MENSAJE_CREDENCIALES);
  });

  it.each(CONTEXTOS)(
    'sin respuesta del servidor (%s) pide revisar la conexión',
    (contexto) => {
      expect(mensajeDeAcceso(errorDeRed(), contexto)).toBe(
        MENSAJE_SIN_CONEXION
      );
    }
  );

  it('el texto de sin conexión es el de la especificación', () => {
    expect(MENSAJE_SIN_CONEXION).toBe(
      'No pudimos conectar. Revisa tu conexión e inténtalo de nuevo.'
    );
  });

  it('un 400 con mensaje de texto devuelve ese texto (correo repetido)', () => {
    expect(
      mensajeDeAcceso(
        errorHttp(400, 'El correo ya está registrado'),
        'registro'
      )
    ).toBe('El correo ya está registrado');
  });

  it('un 400 de validación (arreglo) une los mensajes con «, »', () => {
    expect(
      mensajeDeAcceso(
        errorHttp(400, [
          'email must be an email',
          'password is not strong enough',
        ]),
        'registro'
      )
    ).toBe('email must be an email, password is not strong enough');
  });

  it('un 409 con mensaje también se muestra tal cual', () => {
    expect(mensajeDeAcceso(errorHttp(409, 'Conflicto'), 'registro')).toBe(
      'Conflicto'
    );
  });

  it('un 400 sin mensaje útil cae en el respaldo del contexto', () => {
    expect(mensajeDeAcceso(errorHttp(400), 'restablecer')).toBe(
      MENSAJE_DE_RESPALDO.restablecer
    );
    expect(mensajeDeAcceso(errorHttp(400, ['', '  ']), 'registro')).toBe(
      MENSAJE_DE_RESPALDO.registro
    );
  });

  it('un 401 fuera del login no habla de contraseñas: respaldo del contexto', () => {
    expect(
      mensajeDeAcceso(errorHttp(401, 'Token de Google inválido'), 'google')
    ).toBe(MENSAJE_DE_RESPALDO.google);
  });

  it.each([500, 502, 404])('un %i cae en el respaldo', (estado) => {
    expect(
      mensajeDeAcceso(errorHttp(estado, 'detalle interno'), 'entrar')
    ).toBe(MENSAJE_DE_RESPALDO.entrar);
  });

  it('un error que no viene de Axios cae en el respaldo', () => {
    // `useAuth` lanza este cuando el backend responde sin token.
    expect(
      mensajeDeAcceso(new Error('Respuesta inválida del servidor'), 'entrar')
    ).toBe(MENSAJE_DE_RESPALDO.entrar);
    expect(mensajeDeAcceso(undefined, 'registro')).toBe(
      MENSAJE_DE_RESPALDO.registro
    );
    expect(mensajeDeAcceso('texto suelto', 'google')).toBe(
      MENSAJE_DE_RESPALDO.google
    );
  });

  it('cada contexto tiene su respaldo propio, en español y terminado en punto', () => {
    CONTEXTOS.forEach((contexto) => {
      expect(MENSAJE_DE_RESPALDO[contexto]).toMatch(/^[A-ZÁÉÍÓÚÑ¿].*\.$/);
    });
    expect(
      new Set(CONTEXTOS.map((contexto) => MENSAJE_DE_RESPALDO[contexto])).size
    ).toBe(CONTEXTOS.length);
  });
});

describe('estadoDeError', () => {
  it('devuelve el estado HTTP, o undefined si no hubo respuesta', () => {
    expect(estadoDeError(errorHttp(400))).toBe(400);
    expect(estadoDeError(errorDeRed())).toBeUndefined();
    expect(estadoDeError(null)).toBeUndefined();
    expect(estadoDeError('400')).toBeUndefined();
  });
});
