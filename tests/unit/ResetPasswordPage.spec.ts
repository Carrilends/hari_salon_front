/**
 * Restablecer contraseña (A6, A8, A14, A15, A17; §7.3).
 */
import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils';
import ResetPasswordPage from 'src/auth/pages/ResetPasswordPage.vue';
import {
  MENSAJE_DE_RESPALDO,
  MENSAJE_SIN_CONEXION,
} from 'src/helpers/mensajes-acceso';
import { errorDeRed, errorHttp } from './fixtures/acceso';

const mockGuardar = jest.fn();
jest.mock('src/composables/auth/useResetPassword', () => {
  const { ref: refReal } = jest.requireActual<typeof import('vue')>('vue');
  return {
    useResetPassword: () => ({
      done: refReal(false),
      submit: (vars: unknown) => mockGuardar(vars),
      isLoading: refReal(false),
      error: refReal(null),
    }),
  };
});
const mockPush = jest.fn();
const mockRuta: { query: Record<string, string> } = { query: {} };
jest.mock('vue-router', () => ({
  useRoute: () => mockRuta,
  useRouter: () => ({ push: mockPush }),
}));
const mockUseSeo = jest.fn();
jest.mock('src/composables/seo/useSeo', () => ({
  useSeo: (opciones: unknown) => mockUseSeo(opciones),
}));

const TOKEN = 'a'.repeat(43);

const montar = (query: Record<string, string> = { token: TOKEN }) => {
  mockRuta.query = query;
  return mount(ResetPasswordPage, {
    attachTo: document.body,
    global: { stubs: { RouterLink: RouterLinkStub } },
  });
};
type Pagina = ReturnType<typeof montar>;

async function guardar(wrapper: Pagina, nueva: string, repetida = nueva) {
  await wrapper.find('[data-test="campo-contrasena"]').setValue(nueva);
  await wrapper.find('[data-test="campo-repetida"]').setValue(repetida);
  await wrapper.find('form').trigger('submit');
  await flushPromises();
}

const enlaceRoto = (wrapper: Pagina) => {
  const estado = wrapper.find('[data-test="estado-acceso"]');
  expect(estado.exists()).toBe(true);
  expect(estado.attributes('data-tono')).toBe('peligro');
  expect(estado.find('h1').text()).toBe('Este enlace ya no sirve');
  expect(estado.text()).toContain(
    'Puede que haya vencido o que ya lo hayas usado: cada enlace funciona una sola vez.'
  );
  const pedir = wrapper
    .findAllComponents(RouterLinkStub)
    .find((l) => l.attributes('data-test') === 'pedir-otro-enlace');
  expect(pedir?.props('to')).toEqual({ name: 'forgot-password' });
  expect(wrapper.find('form').exists()).toBe(false);
};

let wrapper: Pagina | undefined;

beforeEach(() => {
  mockGuardar.mockReset();
  mockPush.mockReset();
  mockUseSeo.mockReset();
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
});

describe('ResetPasswordPage', () => {
  it('sigue sin indexarse (§7.3)', () => {
    wrapper = montar();
    expect(mockUseSeo).toHaveBeenCalledWith(
      expect.objectContaining({ noindex: true })
    );
  });

  it('sin token: «Este enlace ya no sirve» y pedir otro (A14)', () => {
    wrapper = montar({});
    enlaceRoto(wrapper);
  });

  it('con token: los textos de la especificación y el aviso sobre las sesiones (A15, A17)', () => {
    wrapper = montar();

    expect(wrapper.text()).toContain('Restablecer');
    expect(wrapper.find('h1').text()).toBe('Elige una contraseña nueva');
    expect(wrapper.text()).toContain(
      'Al guardarla se cierran tus sesiones abiertas y vuelves a entrar con la nueva.'
    );
    expect(wrapper.find('label[for="contrasena"]').text()).toBe(
      'Contraseña nueva'
    );
    expect(wrapper.find('label[for="repetida"]').text()).toBe('Repítela');
    expect(wrapper.find('[data-test="enviar"]').text()).toBe('Guardar contraseña');
    expect(wrapper.find('[data-test="enviar"]').classes()).toContain(
      'm-boton--ancho'
    );
  });

  it('las reglas se marcan al escribir (A6)', async () => {
    wrapper = montar();

    await wrapper.find('[data-test="campo-contrasena"]').setValue('Marlene2026');

    expect(
      wrapper
        .findAll('[data-test^="regla-"]')
        .map((r) => r.attributes('data-cumple'))
    ).toEqual(['si', 'si', 'si', 'si']);
  });

  it('una contraseña débil no se envía', async () => {
    wrapper = montar();

    await guardar(wrapper, 'marlene');

    expect(wrapper.find('[data-test="campo-contrasena-error"]').text()).toBe(
      'Usa 8 caracteres o más.'
    );
    expect(document.activeElement?.id).toBe('contrasena');
    expect(mockGuardar).not.toHaveBeenCalled();
  });

  it('si no coinciden, lo dice y no envía', async () => {
    wrapper = montar();

    await guardar(wrapper, 'Marlene2026', 'Marlene2025');

    expect(wrapper.find('[data-test="campo-repetida-error"]').text()).toBe(
      'Las contraseñas no coinciden.'
    );
    expect(mockGuardar).not.toHaveBeenCalled();
  });

  it('con éxito vuelve al login con ?restablecida=1 (A15)', async () => {
    mockGuardar.mockResolvedValue({ message: 'ok' });
    wrapper = montar();

    await guardar(wrapper, 'Marlene2026');

    expect(mockGuardar).toHaveBeenCalledWith({
      token: TOKEN,
      newPassword: 'Marlene2026',
    });
    expect(mockPush).toHaveBeenCalledWith({
      name: 'login',
      query: { restablecida: '1' },
    });
  });

  it.each([
    ['caducado', 'El enlace expiró; solicita uno nuevo'],
    ['usado', 'El enlace ya fue utilizado'],
    ['inexistente', 'El enlace no es válido'],
  ])('un enlace %s (400) lleva a «Este enlace ya no sirve»', async (_caso, mensaje) => {
    mockGuardar.mockRejectedValue(errorHttp(400, mensaje));
    wrapper = montar();

    await guardar(wrapper, 'Marlene2026');

    enlaceRoto(wrapper);
    expect(mockPush).not.toHaveBeenCalled();
  });

  /** Foco de revisión 4: la red caída no quema el enlace bueno. */
  it('sin conexión: aviso en línea y el formulario sigue', async () => {
    mockGuardar.mockRejectedValue(errorDeRed());
    wrapper = montar();

    await guardar(wrapper, 'Marlene2026');

    expect(wrapper.find('[data-test="estado-acceso"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="aviso-acceso"]').text()).toBe(
      MENSAJE_SIN_CONEXION
    );
    expect(wrapper.find('form').exists()).toBe(true);
  });

  it('un 500 da el respaldo de restablecer, en línea', async () => {
    mockGuardar.mockRejectedValue(errorHttp(500));
    wrapper = montar();

    await guardar(wrapper, 'Marlene2026');

    expect(wrapper.find('[data-test="aviso-acceso"]').text()).toBe(
      MENSAJE_DE_RESPALDO.restablecer
    );
  });

  it('mientras guarda: «Guardando…», desactivado y aria-busy', async () => {
    mockGuardar.mockReturnValue(new Promise(() => undefined));
    wrapper = montar();

    await guardar(wrapper, 'Marlene2026');

    const boton = wrapper.find('[data-test="enviar"]');
    expect(boton.text()).toBe('Guardando…');
    expect(boton.attributes('disabled')).toBeDefined();
    expect(boton.attributes('aria-busy')).toBe('true');
  });
});
