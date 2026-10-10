/**
 * Mi cuenta, la página (plan 6, C1–C5; tablero MiCuentaA).
 *
 * Las secciones se doblan (tienen sus pruebas); la identidad, el índice y el
 * aviso de verificación son los reales. Aquí se prueba lo que es de la página:
 * qué sección se ve (escritorio, índice móvil, sección móvil), el foco al
 * cambiar, la sesión fresca al montar, salir (aquí y en todos) y volver a
 * entrar si la sesión se pierde.
 */
import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils';
import { nextTick, reactive, ref } from 'vue';
import type { Pinia } from 'pinia';
import MyAccountPage from 'src/pages/MyAccountPage.vue';
import { authApi } from 'src/api/auth-api';
import { MENSAJE_SIN_CONEXION } from 'src/helpers/mensajes-acceso';
import { useAuthStore } from 'src/stores/auth-store';
import { errorDeRed, respuestaSesion } from './fixtures/acceso';
import {
  abrirSesionDePrueba,
  sinSesionDePrueba,
  type SesionDePrueba,
} from './fixtures/cuenta';

jest.mock('src/api/auth-api', () => ({
  authApi: {
    checkStatus: jest.fn(),
    logout: jest.fn(),
    logoutAll: jest.fn(),
    resendVerification: jest.fn(),
  },
}));
const mockPush = jest.fn();
const mockRuta = reactive({ query: {} as Record<string, string> });
jest.mock('vue-router', () => ({
  useRoute: () => mockRuta,
  useRouter: () => ({ push: mockPush }),
}));
const mockUseSeo = jest.fn();
jest.mock('src/composables/seo/useSeo', () => ({
  useSeo: (opciones: unknown) => mockUseSeo(opciones),
}));
const mockEsMovil = ref(false);
jest.mock('src/composables/shared/useConsultaMedios', () => ({
  useConsultaMedios: () => mockEsMovil,
}));
const mockLogro = jest.fn();
jest.mock('src/composables/shared/useAviso', () => ({
  useAviso: () => ({ logro: mockLogro, fallo: jest.fn(), atencion: jest.fn() }),
}));

// Declaración de función, no `const`: `jest.mock` se eleva por encima de todo
// y su fábrica corre al importar la página, antes de que un `const` exista
// (zona muerta temporal). Las funciones declaradas sí existen desde el inicio.
function mockDoble(nombre: string, gancho: string) {
  return {
    __esModule: true,
    default: {
      name: nombre,
      props: ['movil'],
      template: `<div data-test="${gancho}" :data-movil="movil ? 'si' : 'no'"><h2 id="cuenta-titulo-seccion" tabindex="-1">${nombre}</h2></div>`,
    },
  };
}
jest.mock('src/components/cuenta/SeccionPerfil.vue', () =>
  mockDoble('SeccionPerfil', 'doble-perfil')
);
jest.mock('src/components/cuenta/SeccionCorreo.vue', () =>
  mockDoble('SeccionCorreo', 'doble-correo')
);
jest.mock('src/components/cuenta/SeccionContrasena.vue', () =>
  mockDoble('SeccionContrasena', 'doble-contrasena')
);
jest.mock('src/components/cuenta/SeccionSesion.vue', () => ({
  __esModule: true,
  default: {
    name: 'SeccionSesion',
    props: ['movil', 'ocupado', 'error'],
    emits: ['cerrar', 'cerrar-todas'],
    template:
      '<div data-test="doble-sesion" :data-ocupado="ocupado || \'\'" :data-error="error || \'\'"><h2 id="cuenta-titulo-seccion" tabindex="-1">Sesión</h2><button data-test="doble-cerrar" @click="$emit(\'cerrar\')" /><button data-test="doble-cerrar-todas" @click="$emit(\'cerrar-todas\')" /></div>',
  },
}));

const pedirSesion = authApi.checkStatus as jest.Mock;
const salirApi = authApi.logout as jest.Mock;
const salirTodasApi = authApi.logoutAll as jest.Mock;

let pinia: Pinia;

const montar = (query: Record<string, string> = {}) => {
  mockRuta.query = query;
  return mount(MyAccountPage, {
    attachTo: document.body,
    global: {
      plugins: [pinia],
      stubs: {
        RouterLink: RouterLinkStub,
        'q-page': { template: '<main><slot /></main>' },
      },
    },
  });
};
type Pagina = ReturnType<typeof montar>;

const conSesion = (cambios: SesionDePrueba = {}) => {
  pinia = abrirSesionDePrueba(cambios);
};

const enlace = (w: Pagina, gancho: string) =>
  w
    .findAllComponents(RouterLinkStub)
    .find((l) => l.attributes('data-test') === gancho);

const A_ENTRAR = { name: 'login', query: { redirect: '/mi-cuenta' } };

let wrapper: Pagina | undefined;

beforeEach(() => {
  pedirSesion.mockReset();
  salirApi.mockReset();
  salirTodasApi.mockReset();
  mockPush.mockReset();
  mockUseSeo.mockReset();
  mockLogro.mockReset();
  mockEsMovil.value = false;
  // Por defecto la sesión fresca no llega: cada prueba que la necesite la da.
  pedirSesion.mockReturnValue(new Promise(() => undefined));
  conSesion();
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
});

describe('MyAccountPage · escritorio', () => {
  it('no se indexa', () => {
    wrapper = montar();

    expect(mockUseSeo).toHaveBeenCalledWith(
      expect.objectContaining({ noindex: true, path: '/mi-cuenta' })
    );
  });

  it('sin sección: cabecera, identidad, índice con «Perfil» actual y su formulario', () => {
    wrapper = montar();

    expect(wrapper.find('h1#cuenta-titulo').text()).toBe('Mi cuenta');
    expect(wrapper.text()).toContain(
      'Actualiza tu nombre, correo y contraseña.'
    );
    const lateral = wrapper.find('[data-test="lateral-cuenta"]');
    expect(lateral.find('[data-test="identidad-nombre"]').text()).toBe(
      'Laura Gómez'
    );
    expect(
      lateral.find('[data-test="indice-cuenta"]').attributes('data-variante')
    ).toBe('lateral');
    expect(enlace(wrapper, 'entrada-perfil')?.attributes('aria-current')).toBe(
      'page'
    );
    expect(
      wrapper.find('[data-test="doble-perfil"]').attributes('data-movil')
    ).toBe('no');
  });

  it.each([
    ['correo', 'doble-correo', 'entrada-correo'],
    ['contrasena', 'doble-contrasena', 'entrada-contrasena'],
    ['sesion', 'doble-sesion', 'entrada-sesion'],
  ])(
    '?seccion=%s pinta su sección y la marca en el índice',
    (seccion, doble, entrada) => {
      wrapper = montar({ seccion });

      expect(wrapper.find(`[data-test="${doble}"]`).exists()).toBe(true);
      expect(wrapper.find('[data-test="doble-perfil"]').exists()).toBe(false);
      expect(enlace(wrapper, entrada)?.attributes('aria-current')).toBe('page');
    }
  );

  it('una sección desconocida cae en «Perfil»', () => {
    wrapper = montar({ seccion: 'borrar-cuenta' });

    expect(wrapper.find('[data-test="doble-perfil"]').exists()).toBe(true);
  });

  it('el aviso de verificación sale solo con el correo sin confirmar', () => {
    wrapper = montar();
    expect(wrapper.find('[data-test="aviso-verificacion"]').exists()).toBe(
      false
    );
    wrapper.unmount();

    conSesion({ emailVerified: false });
    wrapper = montar();
    expect(wrapper.find('[data-test="aviso-verificacion"]').exists()).toBe(
      true
    );
  });

  it('no hay «borrar cuenta» ni un segundo «Reservar» (C5, §10)', () => {
    wrapper = montar();

    expect(wrapper.text()).not.toMatch(/borrar (tu |la )?cuenta/i);
    expect(wrapper.text()).not.toMatch(/Reservar/);
  });
});

describe('MyAccountPage · móvil', () => {
  beforeEach(() => {
    mockEsMovil.value = true;
  });

  it('sin sección: el índice en lista, sin panel', () => {
    conSesion({ emailVerified: false, hasPassword: false });
    wrapper = montar();

    expect(wrapper.find('h1#cuenta-titulo').text()).toBe('Mi cuenta');
    expect(wrapper.find('[data-test="identidad-cuenta"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="aviso-verificacion"]').exists()).toBe(
      true
    );
    expect(
      wrapper.find('[data-test="indice-cuenta"]').attributes('data-variante')
    ).toBe('lista');
    expect(wrapper.find('[data-test="detalle-contrasena"]').text()).toBe(
      'Entras con Google'
    );
    expect(wrapper.find('[data-test="panel-cuenta"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="lateral-cuenta"]').exists()).toBe(false);
  });

  it('con sección: «← Mi cuenta» y la sección sola, a pantalla completa', () => {
    wrapper = montar({ seccion: 'correo' });

    const volver = enlace(wrapper, 'volver-a-cuenta');
    expect(volver?.props('to')).toEqual({ query: {} });
    expect(volver?.attributes('aria-label')).toBe('Volver a Mi cuenta');
    expect(
      wrapper.find('[data-test="doble-correo"]').attributes('data-movil')
    ).toBe('si');
    expect(wrapper.find('h1#cuenta-titulo').exists()).toBe(false);
    expect(wrapper.find('[data-test="indice-cuenta"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="aviso-verificacion"]').exists()).toBe(
      false
    );
  });

  it('al entrar en una sección el foco va a su título, y al volver, a «Mi cuenta»', async () => {
    wrapper = montar();

    mockRuta.query = { seccion: 'correo' };
    await nextTick();
    await flushPromises();
    expect(document.activeElement?.id).toBe('cuenta-titulo-seccion');

    mockRuta.query = {};
    await nextTick();
    await flushPromises();
    expect(document.activeElement?.id).toBe('cuenta-titulo');
  });
});

describe('MyAccountPage · la sesión', () => {
  it('al montar pide la sesión fresca y aplica hasPassword', async () => {
    pedirSesion.mockResolvedValue(
      respuestaSesion({
        fullName: 'Laura Gómez',
        email: 'laura@correo.com',
        emailVerified: true,
        hasPassword: false,
      })
    );
    wrapper = montar();
    await flushPromises();

    expect(pedirSesion).toHaveBeenCalledTimes(1);
    expect(useAuthStore().hasPassword).toBe(false);
  });

  it('si la sesión fresca falla, la página sigue con lo que tenía', async () => {
    pedirSesion.mockRejectedValue(errorDeRed());
    wrapper = montar();
    await flushPromises();

    expect(useAuthStore().isLoggedIn).toBe(true);
    expect(wrapper.find('[data-test="doble-perfil"]').exists()).toBe(true);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('sin sesión: va a entrar con redirect y no pide nada', async () => {
    pinia = sinSesionDePrueba();
    wrapper = montar();
    await flushPromises();

    expect(mockPush).toHaveBeenCalledWith(A_ENTRAR);
    expect(pedirSesion).not.toHaveBeenCalled();
  });

  it('si la sesión se pierde estando aquí, va a entrar', async () => {
    wrapper = montar();

    useAuthStore().logout();
    await nextTick();

    expect(mockPush).toHaveBeenCalledWith(A_ENTRAR);
  });
});

describe('MyAccountPage · salir', () => {
  it('«Cerrar sesión»: revoca en el servidor, cierra aquí y va al inicio (no a entrar)', async () => {
    salirApi.mockResolvedValue(undefined);
    wrapper = montar({ seccion: 'sesion' });

    await wrapper.find('[data-test="doble-cerrar"]').trigger('click');
    await flushPromises();

    expect(salirApi).toHaveBeenCalledTimes(1);
    expect(useAuthStore().isLoggedIn).toBe(false);
    expect(mockPush).toHaveBeenCalledWith({ path: '/' });
    expect(mockPush).not.toHaveBeenCalledWith(A_ENTRAR);
  });

  it('«Cerrar sesión» cierra aquí aunque el servidor falle (como el menú)', async () => {
    salirApi.mockRejectedValue(errorDeRed());
    wrapper = montar({ seccion: 'sesion' });

    await wrapper.find('[data-test="doble-cerrar"]').trigger('click');
    await flushPromises();

    expect(useAuthStore().isLoggedIn).toBe(false);
    expect(mockPush).toHaveBeenCalledWith({ path: '/' });
  });

  it('«en todos los dispositivos»: logout-all, cierra aquí, lo dice y va al inicio', async () => {
    salirTodasApi.mockResolvedValue(undefined);
    wrapper = montar({ seccion: 'sesion' });

    await wrapper.find('[data-test="doble-cerrar-todas"]').trigger('click');
    await flushPromises();

    expect(salirTodasApi).toHaveBeenCalledTimes(1);
    expect(useAuthStore().isLoggedIn).toBe(false);
    expect(mockLogro).toHaveBeenCalledWith(
      'Cerraste la sesión en todos tus dispositivos.'
    );
    expect(mockPush).toHaveBeenCalledWith({ path: '/' });
    expect(mockPush).not.toHaveBeenCalledWith(A_ENTRAR);
  });

  it('si «en todos» falla: error en línea, la sesión sigue y se puede reintentar', async () => {
    salirTodasApi.mockRejectedValue(errorDeRed());
    wrapper = montar({ seccion: 'sesion' });

    await wrapper.find('[data-test="doble-cerrar-todas"]').trigger('click');
    await flushPromises();

    const seccion = wrapper.find('[data-test="doble-sesion"]');
    expect(seccion.attributes('data-error')).toBe(MENSAJE_SIN_CONEXION);
    expect(seccion.attributes('data-ocupado')).toBe('');
    expect(useAuthStore().isLoggedIn).toBe(true);
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockLogro).not.toHaveBeenCalled();
  });

  it('dos pulsaciones en «en todos», una sola petición', async () => {
    salirTodasApi.mockReturnValue(new Promise(() => undefined));
    wrapper = montar({ seccion: 'sesion' });

    await wrapper.find('[data-test="doble-cerrar-todas"]').trigger('click');
    await wrapper.find('[data-test="doble-cerrar-todas"]').trigger('click');

    expect(salirTodasApi).toHaveBeenCalledTimes(1);
    expect(
      wrapper.find('[data-test="doble-sesion"]').attributes('data-ocupado')
    ).toBe('todas');
  });

  it('la sesión fresca que llega después de salir no vuelve a abrirla', async () => {
    let entregar: (valor: unknown) => void = () => undefined;
    pedirSesion.mockReturnValue(
      new Promise((resolver) => {
        entregar = resolver;
      })
    );
    salirApi.mockResolvedValue(undefined);
    wrapper = montar({ seccion: 'sesion' });

    await wrapper.find('[data-test="doble-cerrar"]').trigger('click');
    await flushPromises();
    entregar(respuestaSesion({ hasPassword: true }));
    await flushPromises();

    expect(useAuthStore().isLoggedIn).toBe(false);
    expect(useAuthStore().token).toBe('');
  });
});
