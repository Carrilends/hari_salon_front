/**
 * Recuperar contraseña (A13, A8, A17; §7.2, §7.3): la respuesta es neutra a
 * propósito —nunca dice si la cuenta existe— y el estado enviado permite
 * reenviar al mismo correo.
 */
import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils';
import { ref } from 'vue';
import ForgotPasswordPage from 'src/auth/pages/ForgotPasswordPage.vue';
import { errorDeRed, errorHttp } from './fixtures/acceso';

const mockEnviar = jest.fn();
const mockRecuperar = {
  email: ref(''),
  sent: ref(false),
  submit: (...args: unknown[]) => mockEnviar(...args),
  isLoading: ref(false),
  error: ref(null),
};
jest.mock('src/composables/auth/useForgotPassword', () => ({
  useForgotPassword: () => mockRecuperar,
}));
const mockUseSeo = jest.fn();
jest.mock('src/composables/seo/useSeo', () => ({
  useSeo: (opciones: unknown) => mockUseSeo(opciones),
}));

const montar = () =>
  mount(ForgotPasswordPage, {
    attachTo: document.body,
    global: { stubs: { RouterLink: RouterLinkStub } },
  });
type Pagina = ReturnType<typeof montar>;

async function pedirEnlace(wrapper: Pagina, correo: string) {
  await wrapper.find('[data-test="campo-correo"]').setValue(correo);
  await wrapper.find('form').trigger('submit');
  await flushPromises();
}

let wrapper: Pagina | undefined;

beforeEach(() => {
  mockEnviar.mockReset();
  mockUseSeo.mockReset();
  mockRecuperar.email.value = '';
  mockRecuperar.sent.value = false;
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
});

describe('ForgotPasswordPage · el formulario', () => {
  it('sigue sin indexarse (§7.3)', () => {
    wrapper = montar();
    expect(mockUseSeo).toHaveBeenCalledWith(
      expect.objectContaining({ noindex: true })
    );
  });

  it('lleva los textos de la especificación (A17)', () => {
    wrapper = montar();

    expect(wrapper.find('h1').text()).toBe('Recupera tu contraseña');
    expect(wrapper.text()).toContain('Te enviamos un enlace para elegir una nueva.');
    expect(wrapper.find('label[for="correo"]').text()).toBe('Correo');
    expect(
      wrapper.find('[data-test="campo-correo"]').attributes('placeholder')
    ).toBe('tu@correo.com');
    expect(wrapper.find('[data-test="enviar"]').text()).toBe('Enviar enlace');
    expect(wrapper.find('[data-test="enviar"]').classes()).toContain(
      'm-boton--ancho'
    );
  });

  it('un correo mal escrito no se envía y el foco vuelve al campo', async () => {
    wrapper = montar();

    await pedirEnlace(wrapper, 'ana');

    expect(wrapper.find('[data-test="campo-correo-error"]').text()).toBe(
      'Escribe un correo válido, como tu@correo.com.'
    );
    expect(document.activeElement?.id).toBe('correo');
    expect(mockEnviar).not.toHaveBeenCalled();
  });

  it('mientras envía: «Enviando…», desactivado y aria-busy', async () => {
    mockEnviar.mockReturnValue(new Promise(() => undefined));
    wrapper = montar();

    await pedirEnlace(wrapper, 'clienta@correo.com');

    const boton = wrapper.find('[data-test="enviar"]');
    expect(boton.text()).toBe('Enviando…');
    expect(boton.attributes('disabled')).toBeDefined();
    expect(boton.attributes('aria-busy')).toBe('true');
  });
});

describe('ForgotPasswordPage · «Revisa tu correo» (A13, §7.2)', () => {
  it('con éxito: estado enviado con el correo, y el enlace pedido una vez', async () => {
    mockEnviar.mockResolvedValue({ message: 'ok' });
    wrapper = montar();

    await pedirEnlace(wrapper, 'clienta@correo.com');

    const estado = wrapper.find('[data-test="estado-acceso"]');
    expect(estado.find('h1').text()).toBe('Revisa tu correo');
    expect(estado.find('[data-test="estado-antetitulo"]').text()).toBe(
      'Recuperar contraseña'
    );
    expect(estado.text()).toContain(
      'Si clienta@correo.com tiene cuenta, te llegó un enlace para elegir una contraseña nueva. Sirve una sola vez.'
    );
    expect(wrapper.find('[data-test="correo-enviado"]').text()).toBe(
      'clienta@correo.com'
    );
    expect(mockRecuperar.email.value).toBe('clienta@correo.com');
    expect(mockEnviar).toHaveBeenCalledTimes(1);
    expect(wrapper.find('form').exists()).toBe(false);
  });

  it.each([
    ['un error del servidor', errorHttp(500)],
    ['un error de red', errorDeRed()],
  ])('con %s se ve exactamente lo mismo (respuesta neutra)', async (_caso, error) => {
    mockEnviar.mockRejectedValue(error);
    wrapper = montar();

    await pedirEnlace(wrapper, 'clienta@correo.com');

    expect(wrapper.find('[data-test="estado-acceso"] h1').text()).toBe(
      'Revisa tu correo'
    );
    expect(wrapper.find('[data-test="aviso-acceso"]').exists()).toBe(false);
  });

  it('«Volver a entrar» lleva al login, como botón ancho', async () => {
    mockEnviar.mockResolvedValue({ message: 'ok' });
    wrapper = montar();
    await pedirEnlace(wrapper, 'clienta@correo.com');

    const volver = wrapper
      .findAllComponents(RouterLinkStub)
      .find((l) => l.attributes('data-test') === 'volver-a-entrar');

    expect(volver?.text()).toBe('Volver a entrar');
    expect(volver?.props('to')).toEqual({ name: 'login' });
    expect(volver?.classes()).toEqual(
      expect.arrayContaining(['acceso-boton', 'm-boton', 'm-boton--ancho'])
    );
  });

  it('«envíalo otra vez» reenvía al mismo correo y lo dice en una línea viva', async () => {
    mockEnviar.mockResolvedValue({ message: 'ok' });
    wrapper = montar();
    await pedirEnlace(wrapper, 'clienta@correo.com');
    const linea = () => wrapper?.find('[data-test="reenvio-estado"]');

    expect(wrapper.text()).toContain(
      '¿No llegó? Mira en correo no deseado o envíalo otra vez.'
    );
    expect(linea()?.attributes('aria-live')).toBe('polite');
    expect(linea()?.text()).toBe('');

    await wrapper.find('[data-test="reenviar"]').trigger('click');
    await flushPromises();

    expect(mockEnviar).toHaveBeenCalledTimes(2);
    expect(mockRecuperar.email.value).toBe('clienta@correo.com');
    expect(linea()?.text()).toBe('Te lo enviamos otra vez.');
  });

  it('el reenvío también es neutro si falla', async () => {
    mockEnviar
      .mockResolvedValueOnce({ message: 'ok' })
      .mockRejectedValueOnce(errorDeRed());
    wrapper = montar();
    await pedirEnlace(wrapper, 'clienta@correo.com');

    await wrapper.find('[data-test="reenviar"]').trigger('click');
    await flushPromises();

    expect(wrapper.find('[data-test="reenvio-estado"]').text()).toBe(
      'Te lo enviamos otra vez.'
    );
  });

  it('«envíalo otra vez» es un botón que no envía nada por su cuenta', async () => {
    mockEnviar.mockResolvedValue({ message: 'ok' });
    wrapper = montar();
    await pedirEnlace(wrapper, 'clienta@correo.com');

    expect(wrapper.find('[data-test="reenviar"]').attributes('type')).toBe(
      'button'
    );
  });
});
