/**
 * Correo (plan 6, C1–C3; tablero, escritorio). Con contraseña: correo nuevo +
 * contraseña actual, errores en línea (la contraseña equivocada, en SU campo).
 * Cuenta de Google sin contraseña: no hay formulario; se manda a crearla.
 */
import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils';
import type { Pinia } from 'pinia';
import SeccionCorreo from 'src/components/cuenta/SeccionCorreo.vue';
import { authApi } from 'src/api/auth-api';
import { useAuthStore } from 'src/stores/auth-store';
import { errorHttp, respuestaSesion } from './fixtures/acceso';
import { abrirSesionDePrueba, type SesionDePrueba } from './fixtures/cuenta';

jest.mock('src/api/auth-api', () => ({
  authApi: { updateEmail: jest.fn() },
}));

const guardarApi = authApi.updateEmail as jest.Mock;
let pinia: Pinia;

const montar = (sesion: SesionDePrueba = {}, movil = false) => {
  pinia = abrirSesionDePrueba(sesion);
  return mount(SeccionCorreo, {
    props: { movil },
    attachTo: document.body,
    global: { plugins: [pinia], stubs: { RouterLink: RouterLinkStub } },
  });
};
type Seccion = ReturnType<typeof montar>;

async function rellenar(w: Seccion, correo: string, clave: string) {
  await w.find('[data-test="campo-correo"]').setValue(correo);
  await w.find('[data-test="campo-clave"]').setValue(clave);
}

async function enviar(w: Seccion) {
  await w.find('form').trigger('submit');
  await flushPromises();
}

const avisos = (w: Seccion, variante: 'error' | 'tranquilo') =>
  w.findAll(`[data-test="aviso-acceso"][data-variante="${variante}"]`);

let wrapper: Seccion | undefined;

beforeEach(() => {
  guardarApi.mockReset();
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
});

describe('SeccionCorreo · con contraseña', () => {
  it('muestra el correo actual y la entradilla que dice la verdad', () => {
    wrapper = montar();

    expect(wrapper.find('[data-test="titulo-seccion"]').text()).toBe(
      'Cambiar tu correo'
    );
    expect(wrapper.find('[data-test="entradilla-seccion"]').text()).toBe(
      'Te enviaremos un enlace a la dirección nueva para confirmarla. En cuanto guardes, entrarás con ella.'
    );
    expect(wrapper.find('[data-test="correo-actual"]').text()).toBe(
      'laura@correo.com'
    );
  });

  it('pide el correo nuevo y la contraseña actual, con la nota ligada', () => {
    wrapper = montar();

    expect(wrapper.find('label[for="correo"]').text()).toBe('Nuevo correo');
    expect(wrapper.find('label[for="clave"]').text()).toBe(
      'Tu contraseña actual'
    );
    expect(wrapper.find('[data-test="campo-clave"]').attributes('type')).toBe(
      'password'
    );
    expect(
      wrapper.find('[data-test="campo-clave"]').attributes('aria-describedby')
    ).toContain('clave-nota');
    expect(wrapper.find('#clave-nota').text()).toBe(
      'La pedimos para confirmar que eres tú.'
    );
    expect(wrapper.find('[data-test="guardar"]').text()).toBe('Guardar correo');
  });

  it('el mismo correo (aunque cambien las mayúsculas) no se envía', async () => {
    wrapper = montar();

    await rellenar(wrapper, 'LAURA@correo.com', 'Secreta1');
    await enviar(wrapper);

    expect(wrapper.find('[data-test="campo-correo-error"]').text()).toBe(
      'Ese ya es tu correo.'
    );
    expect(guardarApi).not.toHaveBeenCalled();
  });

  it('sin contraseña no se envía y el foco va a ella', async () => {
    wrapper = montar();

    await rellenar(wrapper, 'nuevo@correo.com', '');
    await enviar(wrapper);

    expect(wrapper.find('[data-test="campo-clave-error"]').text()).toBe(
      'Escribe tu contraseña actual.'
    );
    expect(document.activeElement?.id).toBe('clave');
    expect(guardarApi).not.toHaveBeenCalled();
  });

  it('cambia el correo: la sesión queda sin confirmar y lo dice en línea', async () => {
    guardarApi.mockResolvedValue(
      respuestaSesion({
        fullName: 'Laura Gómez',
        email: 'nuevo@correo.com',
        emailVerified: false,
      })
    );
    wrapper = montar();

    await rellenar(wrapper, ' nuevo@correo.com ', 'Secreta1');
    await enviar(wrapper);

    expect(guardarApi).toHaveBeenCalledWith({
      newEmail: 'nuevo@correo.com',
      currentPassword: 'Secreta1',
    });
    expect(useAuthStore().email).toBe('nuevo@correo.com');
    expect(useAuthStore().emailVerified).toBe(false);
    expect(wrapper.find('[data-test="correo-actual"]').text()).toBe(
      'nuevo@correo.com'
    );
    expect(avisos(wrapper, 'tranquilo')[0].text()).toBe(
      'Listo: ahora entras con nuevo@correo.com. Te enviamos un enlace para confirmarlo.'
    );
    expect(
      (wrapper.find('[data-test="campo-clave"]').element as HTMLInputElement)
        .value
    ).toBe('');
    expect(wrapper.find('[data-test="campo-correo-error"]').exists()).toBe(
      false
    );
  });

  it('contraseña equivocada (401): el error va en su campo y el foco a él', async () => {
    guardarApi.mockRejectedValue(errorHttp(401, 'Credenciales inválidas'));
    wrapper = montar();

    await rellenar(wrapper, 'nuevo@correo.com', 'Mala1234');
    await enviar(wrapper);

    expect(wrapper.find('[data-test="campo-clave-error"]').text()).toBe(
      'La contraseña actual no es correcta.'
    );
    expect(document.activeElement?.id).toBe('clave');
    expect(avisos(wrapper, 'error')).toHaveLength(0);

    await wrapper.find('[data-test="campo-clave"]').setValue('Otra1234');

    expect(wrapper.find('[data-test="campo-clave-error"]').exists()).toBe(
      false
    );
  });

  it('correo ya registrado (400): aviso en línea con el texto del servidor', async () => {
    guardarApi.mockRejectedValue(
      errorHttp(400, 'El correo ya está registrado')
    );
    wrapper = montar();

    await rellenar(wrapper, 'otra@correo.com', 'Secreta1');
    await enviar(wrapper);

    expect(avisos(wrapper, 'error')[0].text()).toBe(
      'El correo ya está registrado'
    );
    expect(useAuthStore().email).toBe('laura@correo.com');
  });

  it('dos envíos seguidos, una sola petición', async () => {
    guardarApi.mockReturnValue(new Promise(() => undefined));
    wrapper = montar();

    await rellenar(wrapper, 'nuevo@correo.com', 'Secreta1');
    await wrapper.find('form').trigger('submit');
    await wrapper.find('form').trigger('submit');

    expect(guardarApi).toHaveBeenCalledTimes(1);
  });

  it('«Descartar» vacía los campos y quita los avisos', async () => {
    guardarApi.mockRejectedValue(
      errorHttp(400, 'El correo ya está registrado')
    );
    wrapper = montar();
    await rellenar(wrapper, 'otra@correo.com', 'Secreta1');
    await enviar(wrapper);

    await wrapper.find('[data-test="descartar"]').trigger('click');

    expect(
      (wrapper.find('[data-test="campo-correo"]').element as HTMLInputElement)
        .value
    ).toBe('');
    expect(avisos(wrapper, 'error')).toHaveLength(0);
  });

  it('sin saber aún si tiene contraseña (null), enseña el formulario', () => {
    wrapper = montar({ hasPassword: undefined });

    expect(useAuthStore().hasPassword).toBeNull();
    expect(wrapper.find('[data-test="form-correo"]').exists()).toBe(true);
  });
});

describe('SeccionCorreo · cuenta de Google sin contraseña', () => {
  it('no hay formulario: explica por qué y lleva a crear la contraseña', () => {
    wrapper = montar({ hasPassword: false });

    expect(wrapper.find('[data-test="form-correo"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="correo-actual"]').text()).toBe(
      'laura@correo.com'
    );
    expect(wrapper.find('[data-test="correo-google"]').text()).toContain(
      'Para cambiar el correo de una cuenta de Google, primero crea una contraseña: la pedimos para confirmar que eres tú.'
    );
    const enlace = wrapper
      .findAllComponents(RouterLinkStub)
      .find((l) => l.attributes('data-test') === 'ir-a-crear-contrasena');
    expect(enlace?.props('to')).toEqual({ query: { seccion: 'contrasena' } });
    expect(enlace?.text()).toContain('Crear una contraseña');
  });
});
