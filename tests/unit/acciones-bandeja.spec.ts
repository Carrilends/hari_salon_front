/**
 * Lo que la bandeja dice cuando confirmar o cancelar falla. Cada respuesta del
 * backend tiene su remedio: un 400 al confirmar es que otra vía (WhatsApp, la
 * otra pestaña) ya lo hizo, y la lista vieja es la que miente (Foco 3).
 */
import { falloDeAccion } from 'src/helpers/acciones-bandeja';
import { errorDeRed, errorHttp } from './fixtures/acceso';

describe('falloDeAccion', () => {
  it('sin respuesta del servidor, habla de la conexión y no refresca', () => {
    expect(falloDeAccion(errorDeRed(), 'confirmar')).toEqual({
      mensaje: 'No se pudo confirmar: revisa la conexión e inténtalo de nuevo.',
      refrescar: false,
    });
  });

  it('un 400 al confirmar es que ya no estaba pendiente: lo dice y refresca', () => {
    expect(
      falloDeAccion(
        errorHttp(400, 'Transición de estado inválida'),
        'confirmar'
      )
    ).toEqual({
      mensaje: 'Esta reserva ya no estaba pendiente. La lista se actualizó.',
      refrescar: true,
    });
  });

  it('un 400 al cancelar es que ya no se puede cancelar', () => {
    expect(falloDeAccion(errorHttp(400), 'cancelar')).toEqual({
      mensaje: 'Esta reserva ya no se puede cancelar. La lista se actualizó.',
      refrescar: true,
    });
  });

  it('un 404 es que ya no existe', () => {
    expect(falloDeAccion(errorHttp(404), 'cancelar')).toEqual({
      mensaje: 'Esta reserva ya no existe. La lista se actualizó.',
      refrescar: true,
    });
  });

  it('un 401 o 403 es la sesión, no la reserva', () => {
    for (const estado of [401, 403]) {
      expect(falloDeAccion(errorHttp(estado), 'confirmar')).toEqual({
        mensaje: 'Tu sesión de administración caducó. Vuelve a entrar.',
        refrescar: false,
      });
    }
  });

  it('cualquier otro fallo pide intentarlo otra vez', () => {
    expect(falloDeAccion(errorHttp(500), 'cancelar')).toEqual({
      mensaje: 'No se pudo cancelar la reserva. Inténtalo de nuevo.',
      refrescar: false,
    });
  });
});
