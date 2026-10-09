/**
 * Verificar correo (A14, A16; §7.2, §7.3): verificando, confirmado y enlace
 * que ya no sirve, todo sobre el mismo marco de `EstadoAcceso`.
 */
import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils';
import VerifyEmailPage from 'src/auth/pages/VerifyEmailPage.vue';
import { authApi } from 'src/api/auth-api';
import { errorDeRed, errorHttp } from './fixtures/acceso';

const mockVerificar = jest.fn();
jest.mock('src/composables/auth/useVerifyEmail', () => {
  const { ref: refReal } = jest.requireActual<typeof import('vue')>('vue');
  return {
    useVerifyEmail: () => ({
      verify: (token: string) => mockVerificar(token),
      isLoading: refReal(false),
      isSuccess: refReal(false),
      error: refReal(null),
    }),
  };
});
jest.mock('src/api/auth-api', () => ({
  authApi: { resendVerification: jest.fn() },
}));
const mockAuth = { isLoggedIn: false, email: '', emailVerified: false };
jest.mock('src/stores/auth-store', () => ({ useAuthStore: () => mockAuth }));
const mockRuta: { query: Record<string, string> } = { query: {} };
jest.mock('vue-router', () => ({ useRoute: () => mockRuta }));
const mockUseSeo = jest.fn();
jest.mock('src/composables/seo/useSeo', () => ({
  useSeo: (opciones: unknown) => mockUseSeo(opciones),
}));

const reenviar = authApi.resendVerification as jest.Mock;

const montar = async (query: Record<string, string> = { token: 'token-bueno' }) => {
  mockRuta.query = query;
  const wrapper = mount(VerifyEmailPage, {
    attachTo: document.body,
    global: { stubs: { RouterLink: RouterLinkStub } },
  });
  await flushPromises();
  return wrapper;
};
type Pagina = Awaited<ReturnType<typeof montar>>;

const enlace = (wrapper: Pagina, gancho: string) =>
  wrapper
    .findAllComponents(RouterLinkStub)
    .find((l) => l.attributes('data-test') === gancho);

let wrapper: Pagina | undefined;

beforeEach(() => {
  mockVerificar.mockReset();
  reenviar.mockReset();
  mockUseSeo.mockReset();
  Object.assign(mockAuth, { isLoggedIn: false, email: '', emailVerified: false });
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
});

describe('VerifyEmailPage', () => {
  it('sigue sin indexarse (§7.3)', async () => {
    mockVerificar.mockResolvedValue({ message: 'ok' });
    wrapper = await montar();
    expect(mockUseSeo).toHaveBeenCalledWith(
      expect.objectContaining({ noindex: true })
    );
  });

  it('verificando: el mismo marco con su indicador propio, ocupado (A16)', async () => {
    mockVerificar.mockReturnValue(new Promise(() => undefined));
    wrapper = await montar();
    const estado = wrapper.find('[data-test="estado-acceso"]');

    expect(estado.find('h1').text()).toBe('Verificando tu correo…');
    expect(estado.attributes('aria-busy')).toBe('true');
    expect(wrapper.html()).not.toContain('q-spinner');
    expect(mockVerificar).toHaveBeenCalledWith('token-bueno');
  });

  it('con éxito: «Correo confirmado», ver servicios e ir a mi cuenta (A16)', async () => {
    mockVerificar.mockResolvedValue({ message: 'ok' });
    wrapper = await montar();
    const estado = wrapper.find('[data-test="estado-acceso"]');

    expect(estado.attributes('data-tono')).toBe('tinta');
    expect(estado.find('h1').text()).toBe('Correo confirmado');
    expect(estado.text()).toContain(
      'Ya puedes reservar y seguir tus citas desde tu cuenta.'
    );
    expect(enlace(wrapper, 'ver-servicios')?.text()).toBe('Ver servicios');
    expect(enlace(wrapper, 'ver-servicios')?.props('to')).toBe('/services');
    expect(enlace(wrapper, 'ver-servicios')?.classes()).toEqual(
      expect.arrayContaining(['acceso-boton', 'm-boton', 'm-boton--ancho'])
    );
    expect(enlace(wrapper, 'ir-a-mi-cuenta')?.text()).toBe('Ir a mi cuenta');
    expect(enlace(wrapper, 'ir-a-mi-cuenta')?.props('to')).toBe('/mi-cuenta');
  });

  it('con sesión abierta, la sesión queda verificada', async () => {
    mockAuth.isLoggedIn = true;
    mockVerificar.mockResolvedValue({ message: 'ok' });

    wrapper = await montar();

    expect(mockAuth.emailVerified).toBe(true);
  });

  it('sin token: «Este enlace ya no sirve» sin llamar al backend (A14)', async () => {
    wrapper = await montar({});

    expect(wrapper.find('[data-test="estado-acceso"] h1').text()).toBe(
      'Este enlace ya no sirve'
    );
    expect(mockVerificar).not.toHaveBeenCalled();
  });

  it('enlace malo y sin sesión: «Entrar» lleva al login', async () => {
    mockVerificar.mockRejectedValue(errorHttp(400, 'El enlace no es válido'));
    wrapper = await montar();
    const estado = wrapper.find('[data-test="estado-acceso"]');

    expect(estado.attributes('data-tono')).toBe('peligro');
    expect(estado.find('h1').text()).toBe('Este enlace ya no sirve');
    expect(estado.text()).toContain(
      'Puede que haya vencido o que ya lo hayas usado: cada enlace funciona una sola vez.'
    );
    expect(enlace(wrapper, 'entrar')?.props('to')).toEqual({ name: 'login' });
    expect(wrapper.find('[data-test="reenviar"]').exists()).toBe(false);
  });

  it('enlace malo con sesión: reenvía al correo de la sesión y lo dice en una línea viva', async () => {
    Object.assign(mockAuth, { isLoggedIn: true, email: 'clienta@correo.com' });
    mockVerificar.mockRejectedValue(errorHttp(400, 'El enlace expiró; solicita uno nuevo'));
    reenviar.mockResolvedValue({ message: 'ok' });
    wrapper = await montar();
    const linea = () => wrapper?.find('[data-test="reenvio-estado"]');
    expect(linea()?.attributes('aria-live')).toBe('polite');
    expect(linea()?.text()).toBe('');

    await wrapper.find('[data-test="reenviar"]').trigger('click');
    await flushPromises();

    expect(reenviar).toHaveBeenCalledWith('clienta@correo.com');
    expect(linea()?.text()).toBe(
      'Si tu correo sigue sin confirmar, te enviamos un enlace nuevo.'
    );
    expect(wrapper.find('[data-test="entrar"]').exists()).toBe(false);
  });

  it('el reenvío es neutro también si falla (§7.2)', async () => {
    Object.assign(mockAuth, { isLoggedIn: true, email: 'clienta@correo.com' });
    mockVerificar.mockRejectedValue(errorHttp(400, 'El enlace no es válido'));
    reenviar.mockRejectedValue(errorDeRed());
    wrapper = await montar();

    await wrapper.find('[data-test="reenviar"]').trigger('click');
    await flushPromises();

    expect(wrapper.find('[data-test="reenvio-estado"]').text()).toBe(
      'Si tu correo sigue sin confirmar, te enviamos un enlace nuevo.'
    );
  });
});
