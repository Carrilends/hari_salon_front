/**
 * Entrar (A5, A7, A8, A9, A15, A17; §7.3, §7.4, §7.7).
 *
 * Se monta la página de verdad con sus piezas reales (campo, aviso,
 * separador). `useAuth` también es el real —es quien llama a `setSession`—,
 * con `useMutation` reducido a «llama a mutationFn y luego a onSuccess».
 * Google y su diálogo se doblan como módulo: tienen sus propias pruebas.
 */
import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils';
import { nextTick, ref, type Ref } from 'vue';
import LoginPage from 'src/auth/pages/LoginPage.vue';
import { authApi } from 'src/api/auth-api';
import {
  MENSAJE_CREDENCIALES,
  MENSAJE_DE_RESPALDO,
  MENSAJE_SIN_CONEXION,
} from 'src/helpers/mensajes-acceso';
import { errorDeRed, errorHttp, respuestaSesion } from './fixtures/acceso';

jest.mock('@tanstack/vue-query', () => {
  const { ref: refReal } = jest.requireActual<typeof import('vue')>('vue');
  return {
    useMutation: (opciones: {
      mutationFn: () => Promise<unknown>;
      onSuccess?: (datos: unknown) => void;
    }) => ({
      mutateAsync: async () => {
        const datos = await opciones.mutationFn();
        opciones.onSuccess?.(datos);
        return datos;
      },
      isPending: refReal(false),
      data: refReal(undefined),
      error: refReal(null),
    }),
  };
});
jest.mock('src/api/auth-api', () => ({ authApi: { login: jest.fn() } }));
const mockAuth = { setSession: jest.fn(), logout: jest.fn() };
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
jest.mock('src/components/auth/ConsentimientoGoogle.vue', () => ({
  __esModule: true,
  default: {
    name: 'ConsentimientoGoogle',
    props: ['abierto'],
    emits: ['aceptar', 'cancelar'],
    template: '<div v-if="abierto" data-test="consentimiento-google" />',
  },
}));

const entrar = authApi.login as jest.Mock;

const montar = (query: Record<string, string> = {}) => {
  mockRuta.query = query;
  return mount(LoginPage, {
    attachTo: document.body,
    global: { stubs: { RouterLink: RouterLinkStub } },
  });
};
type Pagina = ReturnType<typeof montar>;

const enlace = (wrapper: Pagina, gancho: string) =>
  wrapper
    .findAllComponents(RouterLinkStub)
    .find((l) => l.attributes('data-test') === gancho);

async function rellenar(wrapper: Pagina, correo: string, contrasena: string) {
  await wrapper.find('[data-test="campo-correo"]').setValue(correo);
  await wrapper.find('[data-test="campo-contrasena"]').setValue(contrasena);
}

async function enviar(wrapper: Pagina) {
  await wrapper.find('form').trigger('submit');
  await flushPromises();
}

let wrapper: Pagina | undefined;

beforeEach(() => {
  entrar.mockReset();
  mockPush.mockReset();
  mockAuth.setSession.mockReset();
  mockAuth.logout.mockReset();
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

describe('LoginPage · textos y estructura', () => {
  it('sigue sin indexarse (§7.3)', () => {
    wrapper = montar();
    expect(mockUseSeo).toHaveBeenCalledWith(
      expect.objectContaining({ noindex: true })
    );
  });

  it('lleva los textos de la especificación (A17)', () => {
    wrapper = montar();
    const texto = wrapper.text();

    expect(texto).toContain('Tu cuenta');
    expect(wrapper.find('h1').text()).toBe('Hola de nuevo');
    expect(texto).toContain('Entra para reservar más rápido y ver tus citas.');
    expect(wrapper.find('label[for="correo"]').text()).toBe('Correo');
    expect(wrapper.find('label[for="contrasena"]').text()).toBe('Contraseña');
    expect(
      wrapper.find('[data-test="campo-correo"]').attributes('placeholder')
    ).toBe('tu@correo.com');
    expect(wrapper.find('[data-test="olvidaste"]').text()).toBe(
      '¿La olvidaste?'
    );
    expect(wrapper.find('[data-test="enviar"]').text()).toBe('Entrar');
    expect(texto).toContain('¿Primera vez? Crea tu cuenta');
    expect(texto).not.toMatch(/Email|Password|Login/);
  });

  it('«¿La olvidaste?» lleva a recuperar; «Crea tu cuenta», al registro', () => {
    wrapper = montar();

    expect(enlace(wrapper, 'olvidaste')?.props('to')).toEqual({
      name: 'forgot-password',
    });
    expect(enlace(wrapper, 'crear-cuenta')?.props('to')).toEqual({
      name: 'register',
      query: {},
    });
  });

  it('«Crea tu cuenta» se lleva el redirect (A12)', () => {
    wrapper = montar({ redirect: '/testimonios' });

    expect(enlace(wrapper, 'crear-cuenta')?.props('to')).toEqual({
      name: 'register',
      query: { redirect: '/testimonios' },
    });
  });

  it('el botón de enviar es ancho (realce y hundido)', () => {
    wrapper = montar();
    expect(wrapper.find('[data-test="enviar"]').classes()).toEqual(
      expect.arrayContaining(['acceso-boton', 'm-boton--ancho'])
    );
  });
});

describe('LoginPage · Google primero (A9, A10)', () => {
  it('Google va antes que el formulario', () => {
    wrapper = montar();
    const html = wrapper.html();

    expect(html.indexOf('data-test="google-doble"')).toBeLessThan(
      html.indexOf('<form')
    );
  });

  it('sin Google disponible no hay separador huérfano', () => {
    wrapper = montar();
    expect(wrapper.find('[data-test="separador-google"]').exists()).toBe(false);
  });

  it('con Google disponible aparece «o con tu correo»', async () => {
    wrapper = montar();

    await wrapper
      .findComponent({ name: 'GoogleSignInButton' })
      .vm.$emit('disponible', true);

    expect(wrapper.find('[data-test="separador-google"]').text()).toBe(
      'o con tu correo'
    );
  });

  it('la credencial de Google va al composable', async () => {
    wrapper = montar();

    await wrapper
      .findComponent({ name: 'GoogleSignInButton' })
      .vm.$emit('credential', 'id-token');

    expect(mockGoogle.handleCredential).toHaveBeenCalledWith('id-token');
  });

  it('el error de Google se pinta en línea', async () => {
    wrapper = montar();

    mockGoogle.error.value = MENSAJE_DE_RESPALDO.google;
    await nextTick();

    expect(wrapper.find('[data-test="aviso-acceso"]').text()).toBe(
      MENSAJE_DE_RESPALDO.google
    );
  });

  it('si Google pide consentimiento, se abre el diálogo propio y sus respuestas llegan al composable', async () => {
    wrapper = montar();
    expect(wrapper.find('[data-test="consentimiento-google"]').exists()).toBe(
      false
    );

    mockGoogle.pidiendoConsentimiento.value = true;
    await nextTick();
    const dialogo = wrapper.findComponent({ name: 'ConsentimientoGoogle' });
    await dialogo.vm.$emit('aceptar');
    await dialogo.vm.$emit('cancelar');

    expect(wrapper.find('[data-test="consentimiento-google"]').exists()).toBe(
      true
    );
    expect(mockGoogle.aceptarConsentimiento).toHaveBeenCalledTimes(1);
    expect(mockGoogle.rechazarConsentimiento).toHaveBeenCalledTimes(1);
  });
});

describe('LoginPage · validación (A4, A5)', () => {
  it('enviar vacío enseña los dos errores y lleva el foco al correo', async () => {
    wrapper = montar();

    await enviar(wrapper);

    expect(wrapper.find('[data-test="campo-correo-error"]').text()).toBe(
      'Escribe tu correo.'
    );
    expect(wrapper.find('[data-test="campo-contrasena-error"]').text()).toBe(
      'Escribe tu contraseña.'
    );
    expect(document.activeElement?.id).toBe('correo');
    expect(entrar).not.toHaveBeenCalled();
  });

  it('mientras escribe no regaña; al salir del campo, sí', async () => {
    wrapper = montar();
    const correo = wrapper.find('[data-test="campo-correo"]');

    await correo.setValue('ana');
    expect(wrapper.find('[data-test="campo-correo-error"]').exists()).toBe(
      false
    );

    await correo.trigger('blur');
    expect(wrapper.find('[data-test="campo-correo-error"]').text()).toBe(
      'Escribe un correo válido, como tu@correo.com.'
    );
  });

  it('A5: una contraseña antigua que no cumple la política SÍ se puede enviar', async () => {
    entrar.mockResolvedValue(respuestaSesion());
    wrapper = montar();
    await rellenar(wrapper, 'clienta@correo.com', 'abc');

    await enviar(wrapper);

    expect(entrar).toHaveBeenCalledWith({
      email: 'clienta@correo.com',
      password: 'abc',
    });
  });

  /** Foco de revisión 1. */
  it('pulsar el ojo no envía el formulario', async () => {
    wrapper = montar();
    await rellenar(wrapper, 'clienta@correo.com', 'Marlene2026');

    await wrapper.find('[data-test="ver-contrasena"]').trigger('click');
    await flushPromises();

    expect(entrar).not.toHaveBeenCalled();
    expect(
      wrapper.find('[data-test="campo-contrasena"]').attributes('type')
    ).toBe('text');
  });
});

describe('LoginPage · envío (A7, A8, §7.4, §7.7)', () => {
  it('con éxito abre la sesión con los mismos campos y vuelve al redirect', async () => {
    entrar.mockResolvedValue(respuestaSesion());
    wrapper = montar({ redirect: '/testimonios' });
    await rellenar(wrapper, 'clienta@correo.com', 'Marlene2026');

    await enviar(wrapper);

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
    expect(mockPush).toHaveBeenCalledWith({ path: '/testimonios' });
  });

  it('sin redirect vuelve al catálogo', async () => {
    entrar.mockResolvedValue(respuestaSesion());
    wrapper = montar();
    await rellenar(wrapper, 'clienta@correo.com', 'Marlene2026');

    await enviar(wrapper);

    expect(mockPush).toHaveBeenCalledWith({ path: '/services' });
  });

  /** Foco de revisión 5: redirección abierta, también por Google. */
  it('un redirect externo acaba en el catálogo, también para Google', async () => {
    entrar.mockResolvedValue(respuestaSesion());
    wrapper = montar({ redirect: '//otro.sitio' });
    await rellenar(wrapper, 'clienta@correo.com', 'Marlene2026');

    await enviar(wrapper);

    expect(mockUsarGoogle).toHaveBeenCalledWith({ redirectTo: '/services' });
    expect(mockPush).toHaveBeenCalledWith({ path: '/services' });
  });

  it('401: aviso en línea con el texto exacto, y el botón vuelve a «Entrar»', async () => {
    entrar.mockRejectedValue(errorHttp(401, 'Credenciales inválidas'));
    wrapper = montar();
    await rellenar(wrapper, 'clienta@correo.com', 'mala');

    await enviar(wrapper);

    const aviso = wrapper.find('[data-test="aviso-acceso"]');
    expect(aviso.text()).toBe(MENSAJE_CREDENCIALES);
    expect(aviso.attributes('role')).toBe('alert');
    expect(wrapper.find('[data-test="enviar"]').text()).toBe('Entrar');
    expect(
      wrapper.find('[data-test="enviar"]').attributes('disabled')
    ).toBeUndefined();
    expect(
      wrapper
        .find('[data-test="campo-contrasena"]')
        .attributes('aria-describedby')
    ).toBe('aviso-entrar');
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('sin conexión lo dice', async () => {
    entrar.mockRejectedValue(errorDeRed());
    wrapper = montar();
    await rellenar(wrapper, 'clienta@correo.com', 'Marlene2026');

    await enviar(wrapper);

    expect(wrapper.find('[data-test="aviso-acceso"]').text()).toBe(
      MENSAJE_SIN_CONEXION
    );
  });

  it('un intento nuevo quita el aviso anterior', async () => {
    entrar
      .mockRejectedValueOnce(errorHttp(401, 'Credenciales inválidas'))
      .mockReturnValueOnce(new Promise(() => undefined));
    wrapper = montar();
    await rellenar(wrapper, 'clienta@correo.com', 'mala');
    await enviar(wrapper);
    expect(wrapper.find('[data-test="aviso-acceso"]').exists()).toBe(true);

    await enviar(wrapper);

    expect(wrapper.find('[data-test="aviso-acceso"]').exists()).toBe(false);
  });

  it('mientras envía: «Entrando…», desactivado y aria-busy (A8)', async () => {
    entrar.mockReturnValue(new Promise(() => undefined));
    wrapper = montar();
    await rellenar(wrapper, 'clienta@correo.com', 'Marlene2026');

    await enviar(wrapper);

    const boton = wrapper.find('[data-test="enviar"]');
    expect(boton.text()).toBe('Entrando…');
    expect(boton.attributes('disabled')).toBeDefined();
    expect(boton.attributes('aria-busy')).toBe('true');
  });

  /** Foco de revisión 2. */
  it('dos envíos seguidos hacen una sola petición', async () => {
    entrar.mockReturnValue(new Promise(() => undefined));
    wrapper = montar();
    await rellenar(wrapper, 'clienta@correo.com', 'Marlene2026');

    void wrapper.find('form').trigger('submit');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(entrar).toHaveBeenCalledTimes(1);
  });
});

describe('LoginPage · vuelta de restablecer (A15)', () => {
  it('con ?restablecida=1 muestra el aviso tranquilo', () => {
    wrapper = montar({ restablecida: '1' });
    const aviso = wrapper.find(
      '[data-test="aviso-acceso"][data-variante="tranquilo"]'
    );

    expect(aviso.text()).toBe(
      'Tu contraseña quedó cambiada. Entra con la nueva.'
    );
    expect(aviso.attributes('role')).toBe('status');
  });

  it('sin el parámetro, no', () => {
    wrapper = montar();
    expect(
      wrapper
        .find('[data-test="aviso-acceso"][data-variante="tranquilo"]')
        .exists()
    ).toBe(false);
  });
});
