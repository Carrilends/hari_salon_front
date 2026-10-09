/**
 * Crear cuenta (A6, A8, A9, A12, A17; S9 y §7.1, §7.3, §7.4, §7.7).
 */
import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils';
import { ref, type Ref } from 'vue';
import RegisterPage from 'src/auth/pages/RegisterPage.vue';
import { authApi } from 'src/api/auth-api';
import { errorHttp, respuestaSesion } from './fixtures/acceso';

jest.mock('src/api/auth-api', () => ({ authApi: { register: jest.fn() } }));
const mockAuth = { setSession: jest.fn() };
jest.mock('src/stores/auth-store', () => ({ useAuthStore: () => mockAuth }));
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

type GoogleDoble = {
  handleCredential: jest.Mock;
  isLoading: Ref<boolean>;
  error: Ref<string>;
  pidiendoConsentimiento: Ref<boolean>;
  aceptarConsentimiento: jest.Mock;
  rechazarConsentimiento: jest.Mock;
};
let mockGoogle: GoogleDoble;
const mockUsarGoogle = jest.fn<GoogleDoble, [unknown]>(() => mockGoogle);
jest.mock('src/composables/auth/useLoginWithGoogle', () => ({
  useLoginWithGoogle: (opciones: unknown) => mockUsarGoogle(opciones),
}));
jest.mock('src/components/auth/GoogleSignInButton.vue', () => ({
  __esModule: true,
  default: {
    name: 'GoogleSignInButton',
    props: ['disabled'],
    emits: ['credential', 'disponible'],
    template:
      '<div data-test="google-doble" :data-desactivado="disabled ? \'si\' : \'no\'" />',
  },
}));

const registrar = authApi.register as jest.Mock;

const montar = (query: Record<string, string> = {}) => {
  mockRuta.query = query;
  return mount(RegisterPage, {
    attachTo: document.body,
    global: { stubs: { RouterLink: RouterLinkStub } },
  });
};
type Pagina = ReturnType<typeof montar>;

const enlace = (wrapper: Pagina, gancho: string) =>
  wrapper
    .findAllComponents(RouterLinkStub)
    .find((l) => l.attributes('data-test') === gancho);

async function rellenarTodo(wrapper: Pagina) {
  await wrapper.find('[data-test="campo-nombre"]').setValue('  Clienta de Ejemplo ');
  await wrapper.find('[data-test="campo-correo"]').setValue('clienta@correo.com');
  await wrapper.find('[data-test="campo-contrasena"]').setValue('Marlene2026');
  await wrapper.find('[data-test="campo-repetida"]').setValue('Marlene2026');
}

async function marcarCasilla(wrapper: Pagina) {
  await wrapper.find('[data-test="consentimiento"]').setValue(true);
}

async function enviar(wrapper: Pagina) {
  await wrapper.find('form').trigger('submit');
  await flushPromises();
}

async function googleDisponible(wrapper: Pagina) {
  await wrapper
    .findComponent({ name: 'GoogleSignInButton' })
    .vm.$emit('disponible', true);
}

let wrapper: Pagina | undefined;

beforeEach(() => {
  registrar.mockReset();
  mockPush.mockReset();
  mockAuth.setSession.mockReset();
  mockUseSeo.mockReset();
  mockUsarGoogle.mockClear();
  mockGoogle = {
    handleCredential: jest.fn(),
    isLoading: ref(false),
    error: ref(''),
    pidiendoConsentimiento: ref(false),
    aceptarConsentimiento: jest.fn(),
    rechazarConsentimiento: jest.fn(),
  };
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
});

describe('RegisterPage · textos y estructura', () => {
  it('sigue sin indexarse (§7.3)', () => {
    wrapper = montar();
    expect(mockUseSeo).toHaveBeenCalledWith(
      expect.objectContaining({ noindex: true })
    );
  });

  it('lleva los textos de la especificación (A17)', () => {
    wrapper = montar();

    expect(wrapper.find('h1').text()).toBe('Crea tu cuenta');
    expect(wrapper.find('label[for="nombre"]').text()).toBe('Nombre completo');
    expect(wrapper.find('label[for="correo"]').text()).toBe('Correo');
    expect(wrapper.find('label[for="contrasena"]').text()).toBe('Contraseña');
    expect(wrapper.find('label[for="repetida"]').text()).toBe(
      'Repite la contraseña'
    );
    expect(wrapper.find('[data-test="texto-consentimiento"]').text()).toBe(
      'He leído y acepto la política de tratamiento de datos (Ley 1581 de 2012).'
    );
    expect(wrapper.find('[data-test="enviar"]').text()).toBe('Crear cuenta');
    expect(wrapper.text()).toContain('¿Ya tienes cuenta? Entra');
    expect(wrapper.text()).not.toMatch(/Email|Password|Registrarme/);
  });

  it('la política se abre en otra pestaña (no se pierde lo escrito)', () => {
    wrapper = montar();
    const politica = wrapper
      .findAllComponents(RouterLinkStub)
      .find((l) => (l.props('to') as { name?: string }).name === 'privacy-policy');

    expect(politica?.attributes('target')).toBe('_blank');
  });

  it('«Entra» lleva al login y se lleva el redirect', () => {
    wrapper = montar({ redirect: '/mis-reservas' });

    expect(enlace(wrapper, 'ir-a-entrar')?.props('to')).toEqual({
      name: 'login',
      query: { redirect: '/mis-reservas' },
    });
  });

  it('el formulario va antes que Google (A9: el consentimiento primero)', () => {
    wrapper = montar();
    const html = wrapper.html();

    expect(html.indexOf('</form>')).toBeLessThan(
      html.indexOf('data-test="google-doble"')
    );
  });
});

describe('RegisterPage · consentimiento (S9, §7.1)', () => {
  it('la casilla no viene marcada y «Crear cuenta» está desactivado', () => {
    wrapper = montar();

    expect(
      (wrapper.find('[data-test="consentimiento"]').element as HTMLInputElement)
        .checked
    ).toBe(false);
    expect(wrapper.find('[data-test="enviar"]').attributes('disabled')).toBeDefined();
  });

  it('al marcarla, «Crear cuenta» se activa', async () => {
    wrapper = montar();

    await marcarCasilla(wrapper);

    expect(
      wrapper.find('[data-test="enviar"]').attributes('disabled')
    ).toBeUndefined();
  });

  it('sin la casilla, un envío forzado no llega al backend', async () => {
    wrapper = montar();
    await rellenarTodo(wrapper);

    await enviar(wrapper);

    expect(registrar).not.toHaveBeenCalled();
  });

  it('Google desactivado y con la nota hasta marcar la casilla', async () => {
    wrapper = montar();
    await googleDisponible(wrapper);

    expect(
      wrapper.find('[data-test="google-doble"]').attributes('data-desactivado')
    ).toBe('si');
    expect(wrapper.find('[data-test="nota-google"]').text()).toBe(
      'Marca la casilla para seguir.'
    );

    await marcarCasilla(wrapper);

    expect(
      wrapper.find('[data-test="google-doble"]').attributes('data-desactivado')
    ).toBe('no');
    expect(wrapper.find('[data-test="nota-google"]').exists()).toBe(false);
  });

  /** Foco de revisión 3: el iframe de Google se alcanza con el teclado. */
  it('una credencial de Google con la casilla sin marcar se descarta', async () => {
    wrapper = montar();
    await googleDisponible(wrapper);

    await wrapper
      .findComponent({ name: 'GoogleSignInButton' })
      .vm.$emit('credential', 'id-token');

    expect(mockGoogle.handleCredential).not.toHaveBeenCalled();
  });

  it('con la casilla, Google registra con dataPolicyAccepted = true', async () => {
    wrapper = montar();
    await googleDisponible(wrapper);
    await marcarCasilla(wrapper);

    await wrapper
      .findComponent({ name: 'GoogleSignInButton' })
      .vm.$emit('credential', 'id-token');

    expect(mockGoogle.handleCredential).toHaveBeenCalledWith('id-token', true);
  });

  it('sin Google disponible, ni separador ni nota', () => {
    wrapper = montar();

    expect(wrapper.find('[data-test="separador-google"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="nota-google"]').exists()).toBe(false);
  });

  it('con Google disponible, el separador dice «o»', async () => {
    wrapper = montar();
    await googleDisponible(wrapper);

    expect(wrapper.find('[data-test="separador-google"]').text()).toBe('o');
  });

  it('Google vuelve al mismo destino que el formulario', () => {
    wrapper = montar({ redirect: '/mis-reservas' });
    expect(mockUsarGoogle).toHaveBeenCalledWith({ redirectTo: '/mis-reservas' });
  });
});

describe('RegisterPage · reglas y validación (A4, A6)', () => {
  it('las reglas se marcan al escribir', async () => {
    wrapper = montar();

    await wrapper.find('[data-test="campo-contrasena"]').setValue('Marlen');

    const estado = (clave: string) =>
      wrapper?.find(`[data-test="regla-${clave}"]`).attributes('data-cumple');
    expect(estado('mayuscula')).toBe('si');
    expect(estado('minuscula')).toBe('si');
    expect(estado('largo')).toBe('no');
    expect(estado('numero')).toBe('no');
    expect(
      wrapper.find('[data-test="campo-contrasena"]').attributes('aria-describedby')
    ).toBe('reglas-contrasena');
  });

  it('enviar con la casilla y campos vacíos lleva el foco al nombre', async () => {
    wrapper = montar();
    await marcarCasilla(wrapper);

    await enviar(wrapper);

    expect(wrapper.find('[data-test="campo-nombre-error"]').text()).toBe(
      'Escribe tu nombre.'
    );
    expect(document.activeElement?.id).toBe('nombre');
    expect(registrar).not.toHaveBeenCalled();
  });

  it('si las contraseñas no coinciden, lo dice al salir del campo', async () => {
    wrapper = montar();
    await wrapper.find('[data-test="campo-contrasena"]').setValue('Marlene2026');
    const repetida = wrapper.find('[data-test="campo-repetida"]');

    await repetida.setValue('Marlene2025');
    await repetida.trigger('blur');

    expect(wrapper.find('[data-test="campo-repetida-error"]').text()).toBe(
      'Las contraseñas no coinciden.'
    );
  });
});

describe('RegisterPage · envío (A8, A12, §7.4)', () => {
  it('con éxito: consentimiento al backend, sesión con roles por defecto y vuelta al redirect', async () => {
    registrar.mockResolvedValue(
      respuestaSesion({ roles: undefined as unknown as string[] })
    );
    wrapper = montar({ redirect: '/mis-reservas' });
    await rellenarTodo(wrapper);
    await marcarCasilla(wrapper);

    await enviar(wrapper);

    expect(registrar).toHaveBeenCalledWith({
      fullName: 'Clienta de Ejemplo',
      email: 'clienta@correo.com',
      password: 'Marlene2026',
      dataPolicyAccepted: true,
    });
    expect(mockAuth.setSession).toHaveBeenCalledWith(
      'token-de-acceso',
      {
        fullName: 'Clienta de Ejemplo',
        email: 'clienta@correo.com',
        roles: ['user'],
        emailVerified: false,
      },
      expect.any(Number)
    );
    expect(mockPush).toHaveBeenCalledWith({ path: '/mis-reservas' });
  });

  it('sin redirect, o con uno externo, va al catálogo', async () => {
    registrar.mockResolvedValue(respuestaSesion());
    wrapper = montar({ redirect: 'https://otro.sitio' });
    await rellenarTodo(wrapper);
    await marcarCasilla(wrapper);

    await enviar(wrapper);

    expect(mockPush).toHaveBeenCalledWith({ path: '/services' });
  });

  it('correo repetido (400): el texto del backend, en línea', async () => {
    registrar.mockRejectedValue(errorHttp(400, 'El correo ya está registrado'));
    wrapper = montar();
    await rellenarTodo(wrapper);
    await marcarCasilla(wrapper);

    await enviar(wrapper);

    expect(wrapper.find('[data-test="aviso-acceso"]').text()).toBe(
      'El correo ya está registrado'
    );
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('mientras envía: «Creando tu cuenta…», desactivado y aria-busy', async () => {
    registrar.mockReturnValue(new Promise(() => undefined));
    wrapper = montar();
    await rellenarTodo(wrapper);
    await marcarCasilla(wrapper);

    await enviar(wrapper);

    const boton = wrapper.find('[data-test="enviar"]');
    expect(boton.text()).toBe('Creando tu cuenta…');
    expect(boton.attributes('disabled')).toBeDefined();
    expect(boton.attributes('aria-busy')).toBe('true');
  });

  /** Foco de revisión 2. */
  it('dos envíos seguidos hacen un solo registro', async () => {
    registrar.mockReturnValue(new Promise(() => undefined));
    wrapper = montar();
    await rellenarTodo(wrapper);
    await marcarCasilla(wrapper);

    void wrapper.find('form').trigger('submit');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(registrar).toHaveBeenCalledTimes(1);
  });

  it('el botón de enviar es ancho', () => {
    wrapper = montar();
    expect(wrapper.find('[data-test="enviar"]').classes()).toContain(
      'm-boton--ancho'
    );
  });
});
