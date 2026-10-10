/**
 * Contraseña (plan 6, C1–C3; tablero, móviles 2 y 3).
 * Con contraseña: actual + nueva (con las reglas vivas) + repítela; errores en
 * línea y la actual equivocada en SU campo. «¿No la recuerdas?» pide el
 * enlace sin salir. Cuenta de Google: «Entras con Google» y «Crear una
 * contraseña», que pide el enlace de restablecer al correo de la cuenta.
 */
import { flushPromises, mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { useAuthStore } from 'src/stores/auth-store';
import type { Pinia } from 'pinia';
import SeccionContrasena from 'src/components/cuenta/SeccionContrasena.vue';
import { authApi } from 'src/api/auth-api';
import { MENSAJE_SIN_CONEXION } from 'src/helpers/mensajes-acceso';
import { errorDeRed, errorHttp, respuestaSesion } from './fixtures/acceso';
import { abrirSesionDePrueba, type SesionDePrueba } from './fixtures/cuenta';

jest.mock('src/api/auth-api', () => ({
  authApi: { updatePassword: jest.fn(), forgotPassword: jest.fn() },
}));

const guardarApi = authApi.updatePassword as jest.Mock;
const enlaceApi = authApi.forgotPassword as jest.Mock;
let pinia: Pinia;

const montar = (sesion: SesionDePrueba = {}, movil = false) => {
  pinia = abrirSesionDePrueba(sesion);
  return mount(SeccionContrasena, {
    props: { movil },
    attachTo: document.body,
    global: { plugins: [pinia] },
  });
};
type Seccion = ReturnType<typeof montar>;

async function rellenar(
  w: Seccion,
  actual: string,
  nueva: string,
  repetida: string
) {
  await w.find('[data-test="campo-actual"]').setValue(actual);
  await w.find('[data-test="campo-nueva"]').setValue(nueva);
  await w.find('[data-test="campo-repetida"]').setValue(repetida);
}

async function enviar(w: Seccion) {
  await w.find('form').trigger('submit');
  await flushPromises();
}

const valor = (w: Seccion, gancho: string) =>
  (w.find(`[data-test="${gancho}"]`).element as HTMLInputElement).value;

const avisos = (w: Seccion, variante: 'error' | 'tranquilo') =>
  w.findAll(`[data-test="aviso-acceso"][data-variante="${variante}"]`);

let wrapper: Seccion | undefined;

beforeEach(() => {
  guardarApi.mockReset();
  enlaceApi.mockReset();
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
});

describe('SeccionContrasena · con contraseña', () => {
  it('los tres campos del tablero y las reglas ligadas a la nueva', () => {
    wrapper = montar();

    expect(wrapper.find('[data-test="titulo-seccion"]').text()).toBe(
      'Cambiar tu contraseña'
    );
    expect(wrapper.find('label[for="actual"]').text()).toBe(
      'Contraseña actual'
    );
    expect(wrapper.find('label[for="nueva"]').text()).toBe('Contraseña nueva');
    expect(wrapper.find('label[for="repetida"]').text()).toBe('Repítela');
    expect(
      wrapper.find('[data-test="campo-nueva"]').attributes('aria-describedby')
    ).toContain('reglas-nueva');
    expect(
      wrapper.find('[data-test="reglas-contrasena"]').attributes('id')
    ).toBe('reglas-nueva');
    expect(wrapper.find('[data-test="guardar"]').text()).toBe(
      'Guardar contraseña'
    );
  });

  it('si aún no se sabe si tiene contraseña (null), enseña el formulario de cambiar', async () => {
    wrapper = montar();
    useAuthStore().hasPassword = null;
    await nextTick();

    expect(wrapper.find('[data-test="form-contrasena"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="crear-contrasena"]').exists()).toBe(false);
  });

  it('dos clics seguidos en «Te enviamos un enlace», una sola petición', async () => {
    enlaceApi.mockReturnValue(new Promise(() => undefined));
    wrapper = montar();
    const boton = wrapper.find('[data-test="pedir-enlace"]');

    await boton.trigger('click');
    await boton.trigger('click');

    expect(enlaceApi).toHaveBeenCalledTimes(1);
  });

  it('las reglas se marcan mientras escribe', async () => {
    wrapper = montar();

    await wrapper.find('[data-test="campo-nueva"]').setValue('Marlene2026');

    ['largo', 'mayuscula', 'minuscula', 'numero'].forEach((clave) => {
      expect(
        wrapper?.find(`[data-test="regla-${clave}"]`).attributes('data-cumple')
      ).toBe('si');
    });
  });

  it('la nueva igual a la actual no se envía', async () => {
    wrapper = montar();

    await rellenar(wrapper, 'Marlene2026', 'Marlene2026', 'Marlene2026');
    await enviar(wrapper);

    expect(wrapper.find('[data-test="campo-nueva-error"]').text()).toBe(
      'Elige una distinta de la actual.'
    );
    expect(guardarApi).not.toHaveBeenCalled();
  });

  it('si no coinciden, lo dice en «Repítela»', async () => {
    wrapper = montar();

    await rellenar(wrapper, 'Vieja2025', 'Marlene2026', 'Marlene2027');
    await enviar(wrapper);

    expect(wrapper.find('[data-test="campo-repetida-error"]').text()).toBe(
      'Las contraseñas no coinciden.'
    );
    expect(guardarApi).not.toHaveBeenCalled();
  });

  it('guarda: vacía los campos sin regañar y lo dice en línea', async () => {
    guardarApi.mockResolvedValue(respuestaSesion({ hasPassword: true }));
    wrapper = montar();

    await rellenar(wrapper, 'Vieja2025', 'Marlene2026', 'Marlene2026');
    await enviar(wrapper);

    expect(guardarApi).toHaveBeenCalledWith({
      currentPassword: 'Vieja2025',
      newPassword: 'Marlene2026',
    });
    expect(valor(wrapper, 'campo-actual')).toBe('');
    expect(valor(wrapper, 'campo-nueva')).toBe('');
    expect(valor(wrapper, 'campo-repetida')).toBe('');
    expect(wrapper.find('[data-test="campo-actual-error"]').exists()).toBe(
      false
    );
    expect(avisos(wrapper, 'tranquilo')[0].text()).toBe(
      'Guardamos tu contraseña nueva.'
    );
  });

  it('contraseña actual equivocada (401): el error va en su campo (tablero, móvil 2)', async () => {
    guardarApi.mockRejectedValue(errorHttp(401, 'Credenciales inválidas'));
    wrapper = montar();

    await rellenar(wrapper, 'Mala2025', 'Marlene2026', 'Marlene2026');
    await enviar(wrapper);

    expect(wrapper.find('[data-test="campo-actual-error"]').text()).toBe(
      'La contraseña actual no es correcta.'
    );
    expect(
      wrapper.find('[data-test="campo-actual"]').attributes('aria-invalid')
    ).toBe('true');
    expect(document.activeElement?.id).toBe('actual');
    expect(valor(wrapper, 'campo-nueva')).toBe('Marlene2026');
  });

  it('dos envíos seguidos, una sola petición', async () => {
    guardarApi.mockReturnValue(new Promise(() => undefined));
    wrapper = montar();

    await rellenar(wrapper, 'Vieja2025', 'Marlene2026', 'Marlene2026');
    await wrapper.find('form').trigger('submit');
    await wrapper.find('form').trigger('submit');

    expect(guardarApi).toHaveBeenCalledTimes(1);
  });

  it('«¿No la recuerdas?» manda el enlace al correo de la cuenta, sin salir', async () => {
    enlaceApi.mockResolvedValue({ message: 'ok' });
    wrapper = montar();

    const boton = wrapper.find('[data-test="pedir-enlace"]');
    expect(boton.attributes('type')).toBe('button');
    expect(boton.text()).toBe('Te enviamos un enlace');
    await boton.trigger('click');
    await flushPromises();

    expect(enlaceApi).toHaveBeenCalledWith('laura@correo.com');
    expect(wrapper.find('[data-test="enlace-estado"]').text()).toBe(
      'Te enviamos un enlace a laura@correo.com. Sirve una sola vez.'
    );
    expect(guardarApi).not.toHaveBeenCalled();
  });
});

describe('SeccionContrasena · cuenta de Google (tablero, móvil 3)', () => {
  it('dice «Entras con Google» con el correo de la cuenta, sin formulario', () => {
    wrapper = montar({ hasPassword: false });

    expect(wrapper.find('[data-test="titulo-seccion"]').text()).toBe(
      'Entras con Google'
    );
    expect(wrapper.find('[data-test="correo-google"]').text()).toBe(
      'laura@correo.com'
    );
    expect(wrapper.find('[data-test="contrasena-google"]').text()).toContain(
      'Tu cuenta no tiene contraseña: entras con el botón de Google'
    );
    expect(wrapper.find('form').exists()).toBe(false);
    expect(wrapper.find('[data-test="crear-contrasena"]').text()).toBe(
      'Crear una contraseña'
    );
  });

  it('«Crear una contraseña» pide el enlace al correo de la cuenta y lo confirma', async () => {
    enlaceApi.mockResolvedValue({ message: 'ok' });
    wrapper = montar({ hasPassword: false });

    await wrapper.find('[data-test="crear-contrasena"]').trigger('click');
    await flushPromises();

    expect(enlaceApi).toHaveBeenCalledWith('laura@correo.com');
    expect(avisos(wrapper, 'tranquilo')[0].text()).toBe(
      'Te enviamos el enlace a laura@correo.com. Revisa también el correo no deseado.'
    );
    expect(wrapper.find('[data-test="crear-contrasena"]').text()).toBe(
      'Enviar otra vez'
    );
  });

  it('mientras envía: «Enviando…», aria-busy y una sola petición', async () => {
    enlaceApi.mockReturnValue(new Promise(() => undefined));
    wrapper = montar({ hasPassword: false });
    const boton = wrapper.find('[data-test="crear-contrasena"]');

    await boton.trigger('click');
    await boton.trigger('click');

    expect(enlaceApi).toHaveBeenCalledTimes(1);
    expect(boton.text()).toBe('Enviando…');
    expect(boton.attributes('aria-busy')).toBe('true');
  });

  it('sin conexión: aviso en línea y se puede reintentar', async () => {
    enlaceApi.mockRejectedValue(errorDeRed());
    wrapper = montar({ hasPassword: false });

    await wrapper.find('[data-test="crear-contrasena"]').trigger('click');
    await flushPromises();

    expect(avisos(wrapper, 'error')[0].text()).toBe(MENSAJE_SIN_CONEXION);
    expect(
      wrapper.find('[data-test="crear-contrasena"]').attributes('disabled')
    ).toBeUndefined();
  });

  it('en móvil el botón va a lo ancho y el título es el h1', () => {
    wrapper = montar({ hasPassword: false }, true);

    expect(wrapper.find('[data-test="crear-contrasena"]').classes()).toContain(
      'm-boton--ancho'
    );
    expect(wrapper.find('[data-test="titulo-seccion"]').element.tagName).toBe(
      'H1'
    );
  });
});
