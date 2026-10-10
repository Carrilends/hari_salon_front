/**
 * Correo sin confirmar (plan 6, C2; tablero, escritorio y móvil 1): aviso con
 * «Reenviar el enlace», y el resultado en línea —no en un aviso flotante—.
 */
import { flushPromises, mount } from '@vue/test-utils';
import AvisoVerificacion from 'src/components/cuenta/AvisoVerificacion.vue';
import { authApi } from 'src/api/auth-api';
import { MENSAJE_SIN_CONEXION } from 'src/helpers/mensajes-acceso';
import { errorDeRed } from './fixtures/acceso';

jest.mock('src/api/auth-api', () => ({
  authApi: { resendVerification: jest.fn() },
}));

const reenviarApi = authApi.resendVerification as jest.Mock;

const montar = (movil = false) =>
  mount(AvisoVerificacion, { props: { correo: 'laura@correo.com', movil } });

beforeEach(() => {
  reenviarApi.mockReset();
});

describe('AvisoVerificacion', () => {
  it('dice que el correo no está confirmado y ofrece reenviar', () => {
    const w = montar();

    expect(w.text()).toContain('Tu correo aún no está confirmado.');
    expect(w.text()).toContain(
      'Abre el enlace que te enviamos, o pide uno nuevo.'
    );
    const boton = w.find('[data-test="reenviar-enlace"]');
    expect(boton.text()).toBe('Reenviar el enlace');
    expect(boton.attributes('type')).toBe('button');
  });

  it('reenvía al correo de la cuenta y lo dice en línea', async () => {
    reenviarApi.mockResolvedValue({ message: 'ok' });
    const w = montar();

    await w.find('[data-test="reenviar-enlace"]').trigger('click');
    await flushPromises();

    expect(reenviarApi).toHaveBeenCalledWith('laura@correo.com');
    const estado = w.find('[data-test="reenvio-estado"]');
    expect(estado.text()).toBe(
      'Te enviamos un enlace nuevo a laura@correo.com.'
    );
    expect(estado.attributes('aria-live')).toBe('polite');
    expect(w.find('[data-test="reenvio-error"]').exists()).toBe(false);
  });

  it('dos pulsaciones seguidas, una sola petición', async () => {
    reenviarApi.mockReturnValue(new Promise(() => undefined));
    const w = montar();
    const boton = w.find('[data-test="reenviar-enlace"]');

    await boton.trigger('click');
    await boton.trigger('click');

    expect(reenviarApi).toHaveBeenCalledTimes(1);
    expect(boton.text()).toBe('Enviando…');
    expect(boton.attributes('disabled')).toBeDefined();
    expect(boton.attributes('aria-busy')).toBe('true');
  });

  it('sin conexión: error en línea, y se puede reintentar', async () => {
    reenviarApi.mockRejectedValue(errorDeRed());
    const w = montar();

    await w.find('[data-test="reenviar-enlace"]').trigger('click');
    await flushPromises();

    const error = w.find('[data-test="reenvio-error"]');
    expect(error.text()).toBe(MENSAJE_SIN_CONEXION);
    expect(error.attributes('role')).toBe('alert');
    expect(w.find('[data-test="reenvio-estado"]').text()).toBe('');
    expect(
      w.find('[data-test="reenviar-enlace"]').attributes('disabled')
    ).toBeUndefined();
  });

  it('en móvil el botón va a lo ancho', () => {
    const w = montar(true);

    expect(w.find('[data-test="reenviar-enlace"]').classes()).toContain(
      'm-boton--ancho'
    );
    expect(w.find('[data-test="aviso-verificacion"]').classes()).toContain(
      'aviso-verificacion--movil'
    );
  });
});
