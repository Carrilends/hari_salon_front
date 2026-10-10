/**
 * Las reglas de la reseña (R1), puras: quién puede dejarla, los límites del
 * DTO del backend, la validación con los textos de la pantalla, el cuerpo que
 * se envía y la frase de cada error. Se miden RECORTADAS: el backend mide la
 * cadena tal cual y «    hola » le pasaría por cinco caracteres.
 */
import { MENSAJE_SIN_CONEXION } from 'src/helpers/mensajes-acceso';
import {
  cuerpoDeResena,
  LIMITES_RESENA,
  MENSAJES_RESENA,
  mensajeErrorResena,
  politicaDeResena,
  primerError,
  quienPuedeResenar,
  textoPuntaje,
  validarResena,
  type SesionResena,
} from 'src/helpers/resena';
import { errorDeRed, errorHttp } from './fixtures/acceso';

const valido = {
  nombre: 'Laura Gómez',
  texto: 'El tinte me quedó parejo.',
  puntaje: 4,
};

describe('quién puede dejar una reseña', () => {
  it('sin sesión, a entrar', () => {
    expect(
      quienPuedeResenar({ isLoggedIn: false, isAdmin: false, roles: [] })
    ).toBe('entrar');
  });

  it('la dueña, nadie', () => {
    expect(
      quienPuedeResenar({ isLoggedIn: true, isAdmin: true, roles: ['admin'] })
    ).toBe('nadie');
  });

  it.each<[string[]]>([[[]], [['user']]])(
    'una clienta (roles %j), sí',
    (roles) => {
      expect(
        quienPuedeResenar({ isLoggedIn: true, isAdmin: false, roles })
      ).toBe('clienta');
    }
  );

  it('una cuenta con otro rol, no', () => {
    expect(
      quienPuedeResenar({
        isLoggedIn: true,
        isAdmin: false,
        roles: ['user', 'empleado'],
      })
    ).toBe('nadie');
  });
});

/**
 * La política que el armazón registra para `solicitar()` (contrato §4.4): la
 * piden «Deja la tuya →» del inicio, Testimonios y Mis reservas.
 */
describe('politicaDeResena', () => {
  const preparar = (sesion: SesionResena) => {
    const irAlLogin = jest.fn();
    const abrir = jest.fn();
    const politica = politicaDeResena({ sesion: () => sesion, irAlLogin, abrir });
    return { politica, irAlLogin, abrir };
  };

  it('sin sesión va al login y no abre', () => {
    const { politica, irAlLogin, abrir } = preparar({
      isLoggedIn: false,
      isAdmin: false,
      roles: [],
    });

    politica();

    expect(irAlLogin).toHaveBeenCalledTimes(1);
    expect(abrir).not.toHaveBeenCalled();
  });

  it('una clienta: abre', () => {
    const { politica, irAlLogin, abrir } = preparar({
      isLoggedIn: true,
      isAdmin: false,
      roles: ['user'],
    });

    politica();

    expect(abrir).toHaveBeenCalledTimes(1);
    expect(irAlLogin).not.toHaveBeenCalled();
  });

  it('la dueña: nada', () => {
    const { politica, irAlLogin, abrir } = preparar({
      isLoggedIn: true,
      isAdmin: true,
      roles: ['admin'],
    });

    politica();

    expect(abrir).not.toHaveBeenCalled();
    expect(irAlLogin).not.toHaveBeenCalled();
  });

  it('lee la sesión al pedir, no al registrar', () => {
    const sesion = { isLoggedIn: false, isAdmin: false, roles: ['user'] };
    const { politica, abrir } = preparar(sesion);

    sesion.isLoggedIn = true;
    politica();

    expect(abrir).toHaveBeenCalledTimes(1);
  });
});

describe('el texto del puntaje', () => {
  it.each<[number | null, string]>([
    [null, 'Elige de 1 a 5'],
    [1, '1 de 5 · Mala'],
    [2, '2 de 5 · Regular'],
    [3, '3 de 5 · Buena'],
    [4, '4 de 5 · Muy bien'],
    [5, '5 de 5 · Excelente'],
    [7, 'Elige de 1 a 5'],
  ])('%p → «%s»', (puntaje, texto) => {
    expect(textoPuntaje(puntaje)).toBe(texto);
  });
});

describe('validarResena', () => {
  it('los límites son los del DTO del backend', () => {
    expect(LIMITES_RESENA).toEqual({
      nombreMin: 2,
      nombreMax: 120,
      textoMin: 5,
      textoMax: 1000,
    });
  });

  it('un formulario completo no tiene errores', () => {
    expect(validarResena(valido)).toEqual({});
  });

  it('el puntaje es obligatorio: ya no viene en 5', () => {
    expect(validarResena({ ...valido, puntaje: null })).toEqual({
      puntaje: MENSAJES_RESENA.puntaje,
    });
  });

  it.each([0, 6, 2.5])('un puntaje fuera de 1–5 (%p) tampoco vale', (puntaje) => {
    expect(validarResena({ ...valido, puntaje }).puntaje).toBe(
      MENSAJES_RESENA.puntaje
    );
  });

  it('el nombre se mide recortado: « L » no llega a 2 letras', () => {
    expect(validarResena({ ...valido, nombre: ' L ' })).toEqual({
      nombre: MENSAJES_RESENA.nombreCorto,
    });
  });

  it('dos letras bastan', () => {
    expect(validarResena({ ...valido, nombre: 'Lu' })).toEqual({});
  });

  it('más de 120 caracteres de nombre no caben', () => {
    expect(validarResena({ ...valido, nombre: 'a'.repeat(121) })).toEqual({
      nombre: MENSAJES_RESENA.nombreLargo,
    });
  });

  it.each(['Bien', '     ', '  hol  '])(
    '«%s» no llega a 5 caracteres',
    (texto) => {
      expect(validarResena({ ...valido, texto })).toEqual({
        texto: MENSAJES_RESENA.textoCorto,
      });
    }
  );

  it('el error de texto corto es el del tablero', () => {
    expect(MENSAJES_RESENA.textoCorto).toBe('Escribe al menos 5 caracteres.');
  });

  it('cinco caracteres exactos bastan', () => {
    expect(validarResena({ ...valido, texto: 'Bueno' })).toEqual({});
  });

  it('mil caracteres caben; mil uno, no', () => {
    expect(validarResena({ ...valido, texto: 'a'.repeat(1000) })).toEqual({});
    expect(validarResena({ ...valido, texto: 'a'.repeat(1001) })).toEqual({
      texto: MENSAJES_RESENA.textoLargo,
    });
  });

  it('primerError sigue el orden de la pantalla: puntaje, nombre, texto', () => {
    expect(primerError({ texto: 'x', nombre: 'y', puntaje: 'z' })).toBe(
      'puntaje'
    );
    expect(primerError({ texto: 'x', nombre: 'y' })).toBe('nombre');
    expect(primerError({ texto: 'x' })).toBe('texto');
    expect(primerError({})).toBeNull();
  });
});

describe('cuerpoDeResena', () => {
  it('envía los textos recortados con los nombres del DTO', () => {
    expect(
      cuerpoDeResena({ nombre: '  Laura ', texto: ' Muy bien todo ', puntaje: 5 })
    ).toEqual({ name: 'Laura', description: 'Muy bien todo', score: 5 });
  });

  it('sin puntaje no arma cuerpo', () => {
    expect(() => cuerpoDeResena({ ...valido, puntaje: null })).toThrow();
  });
});

describe('mensajeErrorResena', () => {
  it('sin respuesta del servidor: sin conexión', () => {
    expect(mensajeErrorResena(errorDeRed())).toBe(MENSAJE_SIN_CONEXION);
  });

  it('401: la sesión caducó', () => {
    expect(mensajeErrorResena(errorHttp(401, 'Unauthorized'))).toBe(
      MENSAJES_RESENA.sesion
    );
  });

  it('403: la cuenta no puede dejar reseñas', () => {
    expect(
      mensajeErrorResena(errorHttp(403, 'Admin users cannot create reviews'))
    ).toBe(MENSAJES_RESENA.duena);
  });

  it.each([400, 500])('%i: el respaldo, sin texto crudo del servidor', (estado) => {
    expect(mensajeErrorResena(errorHttp(estado, ['description too short']))).toBe(
      MENSAJES_RESENA.respaldo
    );
  });

  it('un error que no es de red ni HTTP: el respaldo', () => {
    expect(mensajeErrorResena(new Error('x'))).toBe(MENSAJES_RESENA.respaldo);
  });
});
