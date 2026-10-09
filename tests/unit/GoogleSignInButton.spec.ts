/**
 * El botón de Google (A10): avisa al padre si está disponible —sin
 * `VITE_GOOGLE_CLIENT_ID` el separador «o» se quedaba huérfano— y se pide a
 * Google como píldora de contorno, grande, «Continuar con Google», con el
 * ancho de su contenedor (200–400). El botón lo pinta Google: no se imita.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { flushPromises, mount } from '@vue/test-utils';
import GoogleSignInButton from 'src/components/auth/GoogleSignInButton.vue';
import {
  ANCHO_GOOGLE_MAX,
  ANCHO_GOOGLE_MIN,
  anchoBotonGoogle,
} from 'src/helpers/ancho-boton-google';

const mockClientId = { valor: '' };
jest.mock('src/constants/google-client-id', () => ({
  leerGoogleClientId: () => mockClientId.valor,
}));

const GSI = 'https://accounts.google.com/gsi/client';
const FUENTE = readFileSync(
  join(__dirname, '../../src/components/auth/GoogleSignInButton.vue'),
  'utf8'
);

type GsiDoble = { initialize: jest.Mock; renderButton: jest.Mock };
let gsi: GsiDoble;

beforeEach(() => {
  mockClientId.valor = 'cliente.apps.googleusercontent.com';
  // El script «ya está»: `loadScript` resuelve sin esperar. jsdom no lo carga.
  document.head.innerHTML = `<script src="${GSI}"></script>`;
  gsi = { initialize: jest.fn(), renderButton: jest.fn() };
  window.google = { accounts: { id: gsi } };
});

afterEach(() => {
  delete window.google;
  document.head.innerHTML = '';
  jest.restoreAllMocks();
});

const montar = async (props: { disabled?: boolean } = {}) => {
  const wrapper = mount(GoogleSignInButton, { props });
  await flushPromises();
  return wrapper;
};

describe('GoogleSignInButton', () => {
  it('sin VITE_GOOGLE_CLIENT_ID se oculta y avisa al padre: disponible = false', async () => {
    mockClientId.valor = '';

    const wrapper = await montar();

    expect(wrapper.emitted('disponible')).toEqual([[false]]);
    expect(
      wrapper.find('[data-test="google-signin"]').attributes('style')
    ).toContain('display: none');
    expect(gsi.initialize).not.toHaveBeenCalled();
  });

  it('con GSI listo, inicializa con el client id y avisa: disponible = true', async () => {
    const wrapper = await montar();

    expect(gsi.initialize).toHaveBeenCalledWith(
      expect.objectContaining({ client_id: 'cliente.apps.googleusercontent.com' })
    );
    expect(wrapper.emitted('disponible')).toEqual([[true]]);
  });

  it('pide la píldora de contorno, grande, «Continuar con Google», en español', async () => {
    const wrapper = await montar();
    const [contenedor, opciones] = gsi.renderButton.mock.calls[0];

    expect(contenedor).toBe(wrapper.find('[data-test="google-signin"]').element);
    expect(opciones).toEqual(
      expect.objectContaining({
        shape: 'pill',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        locale: 'es',
      })
    );
  });

  it('el ancho es el del contenedor', async () => {
    jest.spyOn(Element.prototype, 'clientWidth', 'get').mockReturnValue(340);

    await montar();

    expect(gsi.renderButton.mock.calls[0][1].width).toBe(340);
  });

  it('el ancho no pasa de 400, el máximo de Google', async () => {
    jest.spyOn(Element.prototype, 'clientWidth', 'get').mockReturnValue(520);

    await montar();

    expect(gsi.renderButton.mock.calls[0][1].width).toBe(400);
  });

  it('sin medida (contenedor sin pintar) usa el mínimo de 200', async () => {
    await montar();

    expect(gsi.renderButton.mock.calls[0][1].width).toBe(200);
  });

  it('la credencial de Google sube al padre', async () => {
    const wrapper = await montar();
    const { callback } = gsi.initialize.mock.calls[0][0];

    callback({ credential: 'id-token' });

    expect(wrapper.emitted('credential')).toEqual([['id-token']]);
  });

  it('si GSI no llega (bloqueado), se oculta y avisa disponible = false', async () => {
    delete window.google;

    const wrapper = await montar();

    expect(wrapper.emitted('disponible')).toEqual([[false]]);
    expect(
      wrapper.find('[data-test="google-signin"]').attributes('style')
    ).toContain('display: none');
  });

  it('desactivado: atenuado, sin puntero y anunciado', async () => {
    const raiz = (await montar({ disabled: true })).find(
      '[data-test="google-signin"]'
    );

    expect(raiz.classes()).toContain('google-signin--disabled');
    expect(raiz.attributes('aria-disabled')).toBe('true');
  });
});

describe('anchoBotonGoogle', () => {
  it('los topes son los de Google', () => {
    expect(ANCHO_GOOGLE_MIN).toBe(200);
    expect(ANCHO_GOOGLE_MAX).toBe(400);
  });

  it.each([
    [0, 200],
    [-5, 200],
    [Number.NaN, 200],
    [120, 200],
    [340.7, 340],
    [400, 400],
    [1000, 400],
  ])('%p px de contenedor → %p px de botón', (contenedor, boton) => {
    expect(anchoBotonGoogle(contenedor)).toBe(boton);
  });
});

describe('GoogleSignInButton · la fuente', () => {
  it('no lee import.meta (Jest no lo compila): lo hace google-client-id.ts', () => {
    expect(FUENTE).not.toMatch(/import\.meta/);
    expect(FUENTE).toMatch(/leerGoogleClientId\(\)/);
  });

  it('todo lo del navegador vive en onMounted, tras la guarda de SSG', () => {
    const montaje = FUENTE.slice(FUENTE.indexOf('onMounted('));
    expect(montaje).toMatch(/typeof window === 'undefined'/);
  });

  it('sin hexadecimales; desactivado = atenuado y sin puntero', () => {
    expect(FUENTE).not.toMatch(/#[0-9a-fA-F]{3,8}(?![\w-])/);
    expect(FUENTE).toMatch(
      /\.google-signin--disabled\s*\{[^}]*opacity: 0\.5;[^}]*pointer-events: none;/
    );
  });
});
