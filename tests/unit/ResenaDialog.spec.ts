/**
 * El diálogo de reseña (R1, R2): quién lo abre, su marco (diálogo de 600 px en
 * escritorio, hoja inferior en móvil), el formulario con errores en línea y el
 * envío con su éxito. Se monta con sus piezas reales y el composable real; se
 * doblan la API, Vue Query y la sesión; `router-link` va con su doble.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { nextTick } from 'vue';
import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils';
import ResenaDialog from 'src/components/resena/ResenaDialog.vue';
import { useReviewDialog } from 'src/composables/reviews/useReviewDialog';
import { MENSAJES_RESENA, politicaDeResena } from 'src/helpers/resena';
import { MENSAJE_SIN_CONEXION } from 'src/helpers/mensajes-acceso';
import { errorDeRed } from './fixtures/acceso';
import { fijarViewport } from '../viewportMock';

const mockCrear = jest.fn();
jest.mock('src/api/reviews-api', () => ({
  crearResena: (cuerpo: unknown) => mockCrear(cuerpo),
}));
const mockInvalidar = jest.fn();
jest.mock('@tanstack/vue-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mockInvalidar }),
}));
const mockSesion = {
  isLoggedIn: true,
  isAdmin: false,
  roles: ['user'] as string[],
  fullname: 'Laura Gómez',
  email: 'laura@correo.com',
};
jest.mock('src/stores/auth-store', () => ({ useAuthStore: () => mockSesion }));
const mockIrAlLogin = jest.fn();

const FUENTE = readFileSync(
  join(__dirname, '../../src/components/resena/ResenaDialog.vue'),
  'utf8'
);

const QDialog = {
  name: 'QDialog',
  props: ['modelValue', 'position', 'persistent'],
  emits: ['update:modelValue'],
  template:
    '<div v-if="modelValue" class="q-dialog" :data-posicion="position" :data-persistente="persistent"><slot /></div>',
};

const crear = () =>
  mount(ResenaDialog, {
    attachTo: document.body,
    global: {
      components: { QDialog },
      stubs: { RouterLink: RouterLinkStub },
    },
  });
type Dialogo = ReturnType<typeof crear>;

let wrapper: Dialogo | undefined;

async function montar(): Promise<Dialogo> {
  wrapper = crear();
  await nextTick();
  return wrapper;
}

async function abrir(): Promise<void> {
  useReviewDialog().abrir();
  await nextTick();
}

const radios = (w: Dialogo) => w.findAll('[data-test="estrella"] input');

async function rellenar(
  w: Dialogo,
  {
    puntaje = 4,
    texto = 'El tinte me quedó parejo.',
  }: { puntaje?: number | null; texto?: string } = {}
): Promise<void> {
  if (puntaje) await radios(w)[puntaje - 1].setValue(true);
  await w.find('[data-test="campo-texto"]').setValue(texto);
}

async function enviar(w: Dialogo): Promise<void> {
  await w.find('[data-test="resena-formulario"]').trigger('submit');
  await flushPromises();
}

beforeEach(() => {
  mockCrear.mockReset();
  mockInvalidar.mockReset();
  mockIrAlLogin.mockReset();
  Object.assign(mockSesion, {
    isLoggedIn: true,
    isAdmin: false,
    roles: ['user'],
    fullname: 'Laura Gómez',
    email: 'laura@correo.com',
  });
  useReviewDialog().cerrar();
  useReviewDialog().registrarSolicitud(null);
  fijarViewport({ ancho: 1280 });
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
});

describe('ResenaDialog · quién lo abre', () => {
  it('cerrado no pinta nada', async () => {
    const w = await montar();

    expect(w.find('[data-test="resena"]').exists()).toBe(false);
  });

  it('una clienta con sesión lo abre con su nombre y sin puntaje', async () => {
    const w = await montar();
    await abrir();

    expect(w.find('[data-test="resena"]').exists()).toBe(true);
    expect(
      (w.find('[data-test="campo-nombre"]').element as HTMLInputElement).value
    ).toBe('Laura Gómez');
    expect(
      radios(w).some((r) => (r.element as HTMLInputElement).checked)
    ).toBe(false);
    expect(w.find('[data-test="puntaje-texto"]').text()).toBe('Elige de 1 a 5');
  });

  /** Foco de revisión 1: la red de seguridad contra un `abrir()` a pelo. */
  it('sin sesión, un abrir() a pelo no enseña el formulario', async () => {
    mockSesion.isLoggedIn = false;
    const w = await montar();
    await abrir();

    expect(useReviewDialog().abierto.value).toBe(false);
    expect(w.find('[data-test="resena"]').exists()).toBe(false);
  });

  it('la dueña: abrir() no lo abre', async () => {
    mockSesion.isAdmin = true;
    mockSesion.roles = ['admin'];
    const w = await montar();
    await abrir();

    expect(useReviewDialog().abierto.value).toBe(false);
    expect(w.find('[data-test="resena"]').exists()).toBe(false);
  });

  it('una cuenta con otro rol tampoco', async () => {
    mockSesion.roles = ['user', 'empleado'];
    await montar();
    await abrir();

    expect(useReviewDialog().abierto.value).toBe(false);
  });
});

/**
 * Foco de revisión 1 y contrato §4.4: sin la burbuja verde, a la reseña se
 * llega solo por `solicitar()` («Deja la tuya →», Testimonios, Mis reservas).
 * Se registra la política igual que la registra `MainLayout`.
 */
describe('ResenaDialog · solicitar(), con la política del armazón', () => {
  beforeEach(() => {
    useReviewDialog().registrarSolicitud(
      politicaDeResena({
        sesion: () => mockSesion,
        irAlLogin: mockIrAlLogin,
        abrir: useReviewDialog().abrir,
      })
    );
  });

  it('una clienta: solicitar() abre el formulario con su nombre', async () => {
    const w = await montar();

    useReviewDialog().solicitar();
    await nextTick();

    expect(w.find('[data-test="resena"]').exists()).toBe(true);
    expect(
      (w.find('[data-test="campo-nombre"]').element as HTMLInputElement).value
    ).toBe('Laura Gómez');
    expect(mockIrAlLogin).not.toHaveBeenCalled();
  });

  it('sin sesión: solicitar() manda al login y no abre', async () => {
    mockSesion.isLoggedIn = false;
    const w = await montar();

    useReviewDialog().solicitar();
    await nextTick();

    expect(mockIrAlLogin).toHaveBeenCalledTimes(1);
    expect(w.find('[data-test="resena"]').exists()).toBe(false);
  });

  it('la dueña: solicitar() no hace nada', async () => {
    mockSesion.isAdmin = true;
    mockSesion.roles = ['admin'];
    const w = await montar();

    useReviewDialog().solicitar();
    await nextTick();

    expect(mockIrAlLogin).not.toHaveBeenCalled();
    expect(w.find('[data-test="resena"]').exists()).toBe(false);
  });
});

describe('ResenaDialog · el marco', () => {
  it('el diálogo se nombra por su título', async () => {
    const w = await montar();
    await abrir();

    expect(w.find('.q-dialog').attributes('aria-labelledby')).toBe(
      'resena-titulo'
    );
    expect(w.find('#resena-titulo').text()).toBe('¿Cómo te fue en Marlene?');
    expect(w.text()).toContain('Tu reseña sale en Testimonios con tu nombre.');
  });

  it('la X y «Cancelar» cierran', async () => {
    const w = await montar();
    await abrir();
    expect(w.find('[data-test="resena-cerrar"]').attributes('aria-label')).toBe(
      'Cerrar'
    );

    await w.find('[data-test="resena-cerrar"]').trigger('click');
    expect(useReviewDialog().abierto.value).toBe(false);

    await abrir();
    await w.find('[data-test="resena-cancelar"]').trigger('click');
    expect(useReviewDialog().abierto.value).toBe(false);
  });

  it('Escape o el velo (el diálogo emite false) cierran', async () => {
    const w = await montar();
    await abrir();

    w.findComponent({ name: 'QDialog' }).vm.$emit('update:modelValue', false);
    await nextTick();

    expect(useReviewDialog().abierto.value).toBe(false);
  });

  it('en escritorio es un diálogo centrado, con «Cancelar»', async () => {
    const w = await montar();
    await abrir();

    expect(w.find('.q-dialog').attributes('data-posicion')).toBe('standard');
    expect(w.find('[data-test="resena-cancelar"]').exists()).toBe(true);
    expect(w.find('.resena--hoja').exists()).toBe(false);
  });

  it('en móvil es una hoja inferior, sin «Cancelar»', async () => {
    fijarViewport({ ancho: 390 });
    const w = await montar();
    await abrir();

    expect(w.find('.q-dialog').attributes('data-posicion')).toBe('bottom');
    expect(w.find('.resena--hoja').exists()).toBe(true);
    expect(w.find('[data-test="resena-cancelar"]').exists()).toBe(false);
  });
});

describe('ResenaDialog · el formulario', () => {
  it('cuenta los caracteres sobre 1000 y no deja pasar de los límites', async () => {
    const w = await montar();
    await abrir();

    await w.find('[data-test="campo-texto"]').setValue('Hola');

    expect(w.find('[data-test="contador"]').text()).toBe('4 / 1000');
    expect(w.find('[data-test="campo-texto"]').attributes('maxlength')).toBe(
      '1000'
    );
    expect(w.find('[data-test="campo-nombre"]').attributes('maxlength')).toBe(
      '120'
    );
    expect(w.text()).toContain('Así aparecerás en Testimonios.');
    expect(w.text()).toContain('Mínimo 5 caracteres.');
  });

  it('sin puntaje no envía: error en línea y foco en la primera estrella', async () => {
    const w = await montar();
    await abrir();
    await rellenar(w, { puntaje: null });

    await enviar(w);

    expect(mockCrear).not.toHaveBeenCalled();
    expect(w.find('[data-test="error-puntaje"]').text()).toContain(
      MENSAJES_RESENA.puntaje
    );
    expect(document.activeElement).toBe(radios(w)[0].element);
  });

  it('texto corto: el error del tablero, marcado, enlazado y con el foco', async () => {
    const w = await montar();
    await abrir();
    await rellenar(w, { texto: 'Bien' });

    await enviar(w);

    const area = w.find('[data-test="campo-texto"]');
    expect(w.find('[data-test="error-texto"]').text()).toBe(
      'Escribe al menos 5 caracteres.'
    );
    expect(area.attributes('aria-invalid')).toBe('true');
    for (const id of (area.attributes('aria-describedby') ?? '').split(' ')) {
      expect(document.getElementById(id)).not.toBeNull();
    }
    expect(document.activeElement).toBe(area.element);
  });

  it('el error se va en cuanto se corrige', async () => {
    const w = await montar();
    await abrir();
    await rellenar(w, { texto: 'Bien' });
    await enviar(w);

    await w.find('[data-test="campo-texto"]').setValue('Bien atendida');

    expect(w.find('[data-test="error-texto"]').exists()).toBe(false);
    expect(
      w.find('[data-test="campo-texto"]').attributes('aria-invalid')
    ).toBeUndefined();
  });

  it('el nombre vacío se señala, y su ayuda no queda colgando', async () => {
    const w = await montar();
    await abrir();
    await rellenar(w);
    await w.find('[data-test="campo-nombre"]').setValue('');

    await enviar(w);

    const nombre = w.find('[data-test="campo-nombre"]');
    expect(w.find('[data-test="error-nombre"]').text()).toBe(
      MENSAJES_RESENA.nombreCorto
    );
    expect(nombre.attributes('aria-describedby')).toBe('resena-error-nombre');
    expect(document.getElementById('resena-error-nombre')).not.toBeNull();
    expect(document.getElementById('resena-ayuda-nombre')).toBeNull();
    expect(document.activeElement).toBe(nombre.element);
  });
});

describe('ResenaDialog · el envío', () => {
  it('envía, enseña el éxito con «Ver Testimonios →» y lleva el foco al título', async () => {
    mockCrear.mockResolvedValue({});
    const w = await montar();
    await abrir();
    await rellenar(w);

    await enviar(w);

    expect(mockCrear).toHaveBeenCalledWith({
      name: 'Laura Gómez',
      description: 'El tinte me quedó parejo.',
      score: 4,
    });
    expect(mockInvalidar).toHaveBeenCalledWith({ queryKey: ['reviews'] });
    expect(w.find('[data-test="resena-enviada"]').exists()).toBe(true);
    expect(w.find('[data-test="resena-formulario"]').exists()).toBe(false);
    const enlace = w
      .findAllComponents(RouterLinkStub)
      .find((l) => l.attributes('data-test') === 'ver-testimonios');
    expect(enlace?.props('to')).toBe('/testimonios');
    expect(enlace?.text()).toBe('Ver Testimonios →');
    expect(document.activeElement).toBe(w.find('#resena-titulo').element);
  });

  it('«Ver Testimonios →» cierra el diálogo', async () => {
    mockCrear.mockResolvedValue({});
    const w = await montar();
    await abrir();
    await rellenar(w);
    await enviar(w);

    await w.find('[data-test="ver-testimonios"]').trigger('click');

    expect(useReviewDialog().abierto.value).toBe(false);
  });

  /** Foco de revisión 2. */
  it('doble envío: una sola petición y el botón ocupado', async () => {
    mockCrear.mockReturnValue(new Promise(() => undefined));
    const w = await montar();
    await abrir();
    await rellenar(w);

    const formulario = w.find('[data-test="resena-formulario"]');
    await formulario.trigger('submit');
    await formulario.trigger('submit');

    expect(mockCrear).toHaveBeenCalledTimes(1);
    const boton = w.find('[data-test="enviar-resena"]');
    expect(boton.attributes('disabled')).toBeDefined();
    expect(boton.text()).toBe('Enviando…');
  });

  /** Foco de revisión 4. */
  it('sin conexión: aviso en línea y lo escrito sigue ahí', async () => {
    mockCrear.mockRejectedValue(errorDeRed());
    const w = await montar();
    await abrir();
    await rellenar(w);

    await enviar(w);

    expect(w.find('[data-test="aviso-acceso"]').text()).toBe(
      MENSAJE_SIN_CONEXION
    );
    expect(
      (w.find('[data-test="campo-texto"]').element as HTMLTextAreaElement).value
    ).toBe('El tinte me quedó parejo.');
    expect((radios(w)[3].element as HTMLInputElement).checked).toBe(true);
    expect(document.activeElement).toBe(
      w.find('[data-test="enviar-resena"]').element
    );
  });

  it('mientras envía no se puede cerrar: diálogo persistente y X deshabilitada', async () => {
    mockCrear.mockReturnValue(new Promise(() => undefined));
    const w = await montar();
    await abrir();
    await rellenar(w);
    expect(w.find('.q-dialog').attributes('data-persistente')).toBe('false');

    await w.find('[data-test="resena-formulario"]').trigger('submit');

    expect(w.find('.q-dialog').attributes('data-persistente')).toBe('true');
    expect(
      w.find('[data-test="resena-cerrar"]').attributes('disabled')
    ).toBeDefined();
    expect(
      w.find('[data-test="resena-cancelar"]').attributes('disabled')
    ).toBeDefined();
  });

  /** Foco de revisión 4. */
  it('cerrar sin enviar guarda el borrador; tras enviar, vuelve vacío', async () => {
    const w = await montar();
    await abrir();
    await rellenar(w, { texto: 'Me encantó el corte' });

    await w.find('[data-test="resena-cerrar"]').trigger('click');
    await abrir();
    expect(
      (w.find('[data-test="campo-texto"]').element as HTMLTextAreaElement).value
    ).toBe('Me encantó el corte');

    mockCrear.mockResolvedValue({});
    await enviar(w);
    await w.find('[data-test="cerrar-exito"]').trigger('click');
    await abrir();

    expect(
      (w.find('[data-test="campo-texto"]').element as HTMLTextAreaElement).value
    ).toBe('');
    expect(
      radios(w).some((r) => (r.element as HTMLInputElement).checked)
    ).toBe(false);
  });
});

describe('ResenaDialog · la fuente', () => {
  it('la raíz devuelve los clics y el velo es el de la paleta', () => {
    expect(FUENTE).toMatch(/\.resena\s*\{[^}]*pointer-events: all;/);
    expect(FUENTE).toMatch(
      /\.resena-dialogo \.q-dialog__backdrop\s*\{[^}]*background: var\(--m-velo\);/
    );
  });

  it('el diálogo mide 600 px y la hoja va de borde a borde', () => {
    expect(FUENTE).toMatch(/\.resena\s*\{[^}]*max-width: 600px;/);
    expect(FUENTE).toMatch(
      /\.resena-dialogo \.q-dialog__inner--bottom\s*\{[^}]*padding-left: 0;[^}]*padding-right: 0;/
    );
  });

  it('vigila `abierto` como red de seguridad; la política la registra el armazón', () => {
    expect(FUENTE).toMatch(/watch\(\s*abierto,/);
    expect(FUENTE).toContain('quienPuedeResenar(');
    expect(FUENTE).not.toContain('registrarSolicitud');
    expect(FUENTE).not.toContain('router.push');
  });
});
