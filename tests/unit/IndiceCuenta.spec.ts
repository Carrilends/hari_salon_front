/**
 * El índice de Mi cuenta (plan 6, C1; tablero, escritorio y móvil 1):
 * Perfil · Correo · Contraseña · Mis reservas (enlace) · Cerrar sesión.
 * En escritorio es la columna con la sección actual marcada; en móvil, la
 * lista de filas con su detalle debajo.
 */
import { mount, RouterLinkStub } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import IndiceCuenta from 'src/components/cuenta/IndiceCuenta.vue';

type PropsIndice = {
  variante: 'lateral' | 'lista';
  seccion: 'perfil' | 'correo' | 'contrasena' | 'sesion' | null;
  nombre: string;
  correoVerificado: boolean;
  tieneContrasena: boolean;
};

const BASE: PropsIndice = {
  variante: 'lateral',
  seccion: 'perfil',
  nombre: 'Laura Gómez',
  correoVerificado: true,
  tieneContrasena: true,
};

const montar = (cambios: Partial<PropsIndice> = {}) =>
  mount(IndiceCuenta, {
    props: { ...BASE, ...cambios },
    global: { stubs: { RouterLink: RouterLinkStub } },
  });
type Indice = ReturnType<typeof montar>;

const enlaces = (w: Indice) => w.findAllComponents(RouterLinkStub);
const enlace = (w: Indice, gancho: string) => {
  const encontrado = enlaces(w).find(
    (l) => l.attributes('data-test') === gancho
  );
  if (!encontrado) throw new Error(`No está ${gancho}`);
  return encontrado;
};

describe('IndiceCuenta · lateral (escritorio)', () => {
  it('lleva las entradas en el orden del tablero, dentro de una navegación con nombre', () => {
    const w = montar();

    expect(enlaces(w).map((l) => l.attributes('data-test'))).toEqual([
      'entrada-perfil',
      'entrada-correo',
      'entrada-contrasena',
      'entrada-mis-reservas',
      'entrada-sesion',
    ]);
    expect(w.find('nav').attributes('aria-label')).toBe(
      'Secciones de la cuenta'
    );
  });

  it('cada sección es un enlace a su ?seccion=, y «Mis reservas» a su página', () => {
    const w = montar();

    expect(enlace(w, 'entrada-perfil').props('to')).toEqual({
      query: { seccion: 'perfil' },
    });
    expect(enlace(w, 'entrada-correo').props('to')).toEqual({
      query: { seccion: 'correo' },
    });
    expect(enlace(w, 'entrada-contrasena').props('to')).toEqual({
      query: { seccion: 'contrasena' },
    });
    expect(enlace(w, 'entrada-sesion').props('to')).toEqual({
      query: { seccion: 'sesion' },
    });
    expect(enlace(w, 'entrada-mis-reservas').props('to')).toBe('/mis-reservas');
    expect(enlace(w, 'entrada-sesion').text()).toBe('Cerrar sesión');
  });

  it('solo la sección actual lleva aria-current y su marca', () => {
    const w = montar({ seccion: 'correo' });

    expect(enlace(w, 'entrada-correo').attributes('aria-current')).toBe('page');
    expect(enlace(w, 'entrada-correo').classes()).toContain(
      'indice__entrada--actual'
    );
    ['entrada-perfil', 'entrada-contrasena', 'entrada-sesion'].forEach((g) => {
      expect(enlace(w, g).attributes('aria-current')).toBeUndefined();
    });
  });

  it('correo sin confirmar: la marca va en texto, no solo en color', () => {
    const w = montar({ correoVerificado: false });

    const marca = enlace(w, 'entrada-correo').find(
      '[data-test="marca-sin-confirmar"]'
    );
    expect(marca.exists()).toBe(true);
    expect(marca.text()).toBe('Sin confirmar');
  });

  it('correo confirmado: sin marca', () => {
    const w = montar();

    expect(w.find('[data-test="marca-sin-confirmar"]').exists()).toBe(false);
  });
});

describe('IndiceCuenta · lista (móvil)', () => {
  it('cada fila dice su detalle', () => {
    const w = montar({
      variante: 'lista',
      seccion: null,
      correoVerificado: false,
      tieneContrasena: false,
    });

    expect(w.find('[data-test="detalle-perfil"]').text()).toBe('Laura Gómez');
    expect(w.find('[data-test="detalle-correo"]').text()).toBe('Sin confirmar');
    expect(w.find('[data-test="detalle-contrasena"]').text()).toBe(
      'Entras con Google'
    );
    expect(w.find('nav').attributes('data-variante')).toBe('lista');
  });

  it('con contraseña y correo confirmado, solo el perfil trae detalle', () => {
    const w = montar({ variante: 'lista', seccion: null });

    expect(w.find('[data-test="detalle-perfil"]').exists()).toBe(true);
    expect(w.find('[data-test="detalle-correo"]').exists()).toBe(false);
    expect(w.find('[data-test="detalle-contrasena"]').exists()).toBe(false);
  });

  it('nada lleva aria-current: es un índice, no una pestaña', () => {
    const w = montar({ variante: 'lista', seccion: null });

    expect(w.findAll('[aria-current]')).toHaveLength(0);
  });
});

describe('IndiceCuenta · con el router de verdad', () => {
  /**
   * vue-router ignora la consulta al calcular `isExactActive`: con su
   * `aria-current` automático, las cinco entradas de `/mi-cuenta?…` dirían
   * «página actual». El índice lo fija él mismo.
   */
  it('solo la sección actual lleva aria-current', async () => {
    const Vacia = defineComponent({ render: () => h('div') });
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/mi-cuenta', component: Vacia },
        { path: '/mis-reservas', component: Vacia },
      ],
    });
    await router.push('/mi-cuenta?seccion=correo');
    await router.isReady();

    const w = mount(IndiceCuenta, {
      props: { ...BASE, seccion: 'correo' },
      global: { plugins: [router] },
    });

    const actuales = w.findAll('[aria-current="page"]');
    expect(actuales).toHaveLength(1);
    expect(actuales[0].attributes('data-test')).toBe('entrada-correo');
  });
});
