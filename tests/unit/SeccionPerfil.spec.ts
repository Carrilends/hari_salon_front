/**
 * Perfil (plan 6, C1–C2): cambiar el nombre con error y éxito en línea.
 */
import { flushPromises, mount } from '@vue/test-utils';
import type { Pinia } from 'pinia';
import SeccionPerfil from 'src/components/cuenta/SeccionPerfil.vue';
import { authApi } from 'src/api/auth-api';
import { MENSAJE_SIN_CONEXION } from 'src/helpers/mensajes-acceso';
import { useAuthStore } from 'src/stores/auth-store';
import { errorDeRed, respuestaSesion } from './fixtures/acceso';
import { abrirSesionDePrueba } from './fixtures/cuenta';

jest.mock('src/api/auth-api', () => ({
  authApi: { updateProfile: jest.fn() },
}));

const guardarApi = authApi.updateProfile as jest.Mock;
let pinia: Pinia;

const montar = (movil = false) =>
  mount(SeccionPerfil, {
    props: { movil },
    attachTo: document.body,
    global: { plugins: [pinia] },
  });
type Seccion = ReturnType<typeof montar>;

async function enviar(w: Seccion) {
  await w.find('form').trigger('submit');
  await flushPromises();
}

const avisos = (w: Seccion, variante: 'error' | 'tranquilo') =>
  w.findAll(`[data-test="aviso-acceso"][data-variante="${variante}"]`);

let wrapper: Seccion | undefined;

beforeEach(() => {
  guardarApi.mockReset();
  pinia = abrirSesionDePrueba();
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
});

describe('SeccionPerfil', () => {
  it('los textos del marco y el campo con el nombre de la cuenta', () => {
    wrapper = montar();

    expect(wrapper.find('[data-test="antetitulo-seccion"]').text()).toBe(
      'Perfil'
    );
    expect(wrapper.find('[data-test="titulo-seccion"]').text()).toBe(
      'Tu nombre'
    );
    expect(wrapper.find('[data-test="entradilla-seccion"]').text()).toBe(
      'Así te saludamos en el portal y así firmas tus reseñas.'
    );
    expect(wrapper.find('label[for="nombre"]').text()).toBe('Nombre');
    expect(
      (wrapper.find('[data-test="campo-nombre"]').element as HTMLInputElement)
        .value
    ).toBe('Laura Gómez');
  });

  it('sin cambios, «Guardar nombre» está desactivado', () => {
    wrapper = montar();

    const guardar = wrapper.find('[data-test="guardar"]');
    expect(guardar.text()).toBe('Guardar nombre');
    expect(guardar.attributes('disabled')).toBeDefined();
  });

  it('un nombre corto no se envía y el foco vuelve al campo', async () => {
    wrapper = montar();

    await wrapper.find('[data-test="campo-nombre"]').setValue('Al');
    await enviar(wrapper);

    expect(wrapper.find('[data-test="campo-nombre-error"]').text()).toBe(
      'Escribe tu nombre completo (3 letras o más).'
    );
    expect(document.activeElement?.id).toBe('nombre');
    expect(guardarApi).not.toHaveBeenCalled();
  });

  it('guarda el nombre recortado, lo lleva a la sesión y lo dice en línea', async () => {
    guardarApi.mockResolvedValue(
      respuestaSesion({
        fullName: 'Laura Gómez Ruiz',
        email: 'laura@correo.com',
      })
    );
    wrapper = montar();

    await wrapper
      .find('[data-test="campo-nombre"]')
      .setValue('  Laura Gómez Ruiz  ');
    await enviar(wrapper);

    expect(guardarApi).toHaveBeenCalledWith({ fullName: 'Laura Gómez Ruiz' });
    expect(useAuthStore().fullname).toBe('Laura Gómez Ruiz');
    const logro = avisos(wrapper, 'tranquilo');
    expect(logro).toHaveLength(1);
    expect(logro[0].text()).toBe(
      'Guardamos tu nombre. También cambia en tus reseñas.'
    );
    expect(
      wrapper.find('[data-test="guardar"]').attributes('disabled')
    ).toBeDefined();
  });

  it('dos envíos seguidos, una sola petición', async () => {
    guardarApi.mockReturnValue(new Promise(() => undefined));
    wrapper = montar();

    await wrapper.find('[data-test="campo-nombre"]').setValue('Laura G. Ruiz');
    await wrapper.find('form').trigger('submit');
    await wrapper.find('form').trigger('submit');

    expect(guardarApi).toHaveBeenCalledTimes(1);
    expect(wrapper.find('[data-test="guardar"]').text()).toBe('Guardando…');
  });

  it('sin conexión: error en línea y conserva lo escrito', async () => {
    guardarApi.mockRejectedValue(errorDeRed());
    wrapper = montar();

    await wrapper.find('[data-test="campo-nombre"]').setValue('Laura G. Ruiz');
    await enviar(wrapper);

    const error = avisos(wrapper, 'error');
    expect(error).toHaveLength(1);
    expect(error[0].text()).toBe(MENSAJE_SIN_CONEXION);
    expect(
      (wrapper.find('[data-test="campo-nombre"]').element as HTMLInputElement)
        .value
    ).toBe('Laura G. Ruiz');
    expect(useAuthStore().fullname).toBe('Laura Gómez');
  });

  it('«Descartar» vuelve al nombre de la cuenta, sin errores', async () => {
    wrapper = montar();

    await wrapper.find('[data-test="campo-nombre"]').setValue('Al');
    await wrapper.find('[data-test="campo-nombre"]').trigger('blur');
    expect(wrapper.find('[data-test="campo-nombre-error"]').exists()).toBe(
      true
    );

    await wrapper.find('[data-test="descartar"]').trigger('click');

    expect(
      (wrapper.find('[data-test="campo-nombre"]').element as HTMLInputElement)
        .value
    ).toBe('Laura Gómez');
    expect(wrapper.find('[data-test="campo-nombre-error"]').exists()).toBe(
      false
    );
  });

  it('en móvil: título h1, sin «Descartar» y «Guardar» a lo ancho', () => {
    wrapper = montar(true);

    expect(wrapper.find('[data-test="titulo-seccion"]').element.tagName).toBe(
      'H1'
    );
    expect(wrapper.find('[data-test="descartar"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="guardar"]').classes()).toContain(
      'm-boton--ancho'
    );
  });
});
