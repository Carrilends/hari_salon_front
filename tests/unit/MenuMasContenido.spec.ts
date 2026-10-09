/**
 * La pintura del menú «Más» (M1): un solo contenido para el desplegable de
 * escritorio y la hoja de móvil. Lo que se vigila:
 *
 * - la semántica: un `<nav>` con enlaces de verdad y botones para las
 *   acciones, nunca `role="menu"` (M8);
 * - que cada estado de sesión pinte sus secciones (M3) y que «Tu cuenta» cambie
 *   de forma con la sesión (invitación o avatar, M10);
 * - que TODA entrada emita `elegir`, también los enlaces: es lo que deja al
 *   armazón cerrar el menú cuando la entrada lleva a la página actual;
 * - y, leyendo la fuente (el SCSS no existe en Jest), el contrato visual.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { mount, RouterLinkStub } from '@vue/test-utils';
import MenuMasContenido from 'src/components/shared/MenuMasContenido.vue';
import {
  seccionesDelMenu,
  type EntradaMenu,
} from 'src/composables/shared/menuMas';

type Estado = { isLoggedIn: boolean; isAdmin: boolean };
type Opciones = {
  estado?: Estado;
  variante?: 'desplegable' | 'hoja';
  nombre?: string;
  correo?: string;
  horarioHoy?: string;
};

const SIN_SESION: Estado = { isLoggedIn: false, isAdmin: false };
const CLIENTA: Estado = { isLoggedIn: true, isAdmin: false };
const DUENA: Estado = { isLoggedIn: true, isAdmin: true };

function montar({
  estado = SIN_SESION,
  variante = 'desplegable',
  nombre = '',
  correo = '',
  horarioHoy = '8:00 a 20:00',
}: Opciones = {}) {
  return mount(MenuMasContenido, {
    props: {
      secciones: seccionesDelMenu({ ...estado, redirect: '/testimonios' }),
      variante,
      nombre,
      correo,
      horarioHoy,
    },
    global: { stubs: { RouterLink: RouterLinkStub } },
  });
}

/** El `<router-link>` doblado de una entrada, para leer su `to`. */
function enlace(wrapper: ReturnType<typeof montar>, id: string) {
  const encontrado = wrapper
    .findAllComponents(RouterLinkStub)
    .find((c) => c.attributes('data-test') === `menu-entrada-${id}`);
  if (!encontrado) throw new Error(`no hay enlace ${id}`);
  return encontrado;
}

const seccionesPintadas = (wrapper: ReturnType<typeof montar>) =>
  wrapper
    .findAll('[data-test^="menu-seccion-"]')
    .map((s) => s.attributes('data-test'));

describe('MenuMasContenido · semántica (M8)', () => {
  it('es un <nav> etiquetado «Más opciones»', () => {
    const nav = montar().find('nav[data-test="menu-mas"]');

    expect(nav.exists()).toBe(true);
    expect(nav.attributes('aria-label')).toBe('Más opciones');
  });

  it('no usa role="menu" ni menuitem: son enlaces y botones', () => {
    const wrapper = montar({
      estado: DUENA,
      nombre: 'Marlene',
      correo: 'm@correo.com',
    });

    expect(wrapper.find('[role="menu"]').exists()).toBe(false);
    expect(wrapper.find('[role="menuitem"]').exists()).toBe(false);
  });

  it('las entradas con destino son enlaces; las de acción, botones de tipo button', () => {
    const wrapper = montar({
      estado: CLIENTA,
      nombre: 'Ana',
      correo: 'a@correo.com',
    });

    for (const id of [
      'testimonios',
      'preguntas-frecuentes',
      'mis-reservas',
      'mi-cuenta',
      'politica-datos',
    ]) {
      expect(
        wrapper.find(`[data-test="menu-entrada-${id}"]`).element.tagName
      ).toBe('A');
    }
    for (const id of ['quienes-somos', 'horarios', 'cerrar-sesion']) {
      const boton = wrapper.find(`[data-test="menu-entrada-${id}"]`);
      expect(boton.element.tagName).toBe('BUTTON');
      expect(boton.attributes('type')).toBe('button');
    }
  });

  it('cada sección con título es un grupo con nombre; el pie no', () => {
    const wrapper = montar({
      estado: DUENA,
      nombre: 'Marlene',
      correo: 'm@correo.com',
    });
    const titulos: Record<string, string> = {
      cuenta: 'Tu cuenta',
      salon: 'El salón',
      peluqueria: 'La peluquería',
    };

    for (const [id, titulo] of Object.entries(titulos)) {
      const seccion = wrapper.find(`[data-test="menu-seccion-${id}"]`);
      expect(seccion.attributes('role')).toBe('group');
      const etiqueta = seccion.attributes('aria-labelledby');
      expect(wrapper.find(`#${etiqueta}`).text()).toBe(titulo);
    }
    const pie = wrapper.find('[data-test="menu-seccion-pie"]');
    expect(pie.attributes('role')).toBeUndefined();
    expect(pie.attributes('aria-labelledby')).toBeUndefined();
  });

  it('los id de los títulos llevan la variante: escritorio y hoja no chocan', () => {
    const desplegable = montar().find('[data-test="menu-seccion-peluqueria"]');
    const hoja = montar({ variante: 'hoja' }).find(
      '[data-test="menu-seccion-peluqueria"]'
    );

    expect(desplegable.attributes('aria-labelledby')).toBe(
      'menu-mas-titulo-desplegable-peluqueria'
    );
    expect(hoja.attributes('aria-labelledby')).toBe(
      'menu-mas-titulo-hoja-peluqueria'
    );
  });
});

describe('MenuMasContenido · secciones por estado (M3)', () => {
  it('sin sesión pinta cuenta, peluquería y pie', () => {
    expect(seccionesPintadas(montar())).toEqual([
      'menu-seccion-cuenta',
      'menu-seccion-peluqueria',
      'menu-seccion-pie',
    ]);
  });

  it('la clienta, las mismas tres', () => {
    expect(
      seccionesPintadas(montar({ estado: CLIENTA, nombre: 'Ana' }))
    ).toEqual([
      'menu-seccion-cuenta',
      'menu-seccion-peluqueria',
      'menu-seccion-pie',
    ]);
  });

  it('la dueña, con «El salón» en segundo lugar', () => {
    expect(
      seccionesPintadas(montar({ estado: DUENA, nombre: 'Marlene' }))
    ).toEqual([
      'menu-seccion-cuenta',
      'menu-seccion-salon',
      'menu-seccion-peluqueria',
      'menu-seccion-pie',
    ]);
  });
});

describe('MenuMasContenido · Tu cuenta', () => {
  it('sin sesión invita a entrar y ofrece los dos botones, sin avatar', () => {
    const wrapper = montar();
    const cuenta = wrapper.find('[data-test="menu-seccion-cuenta"]');

    expect(cuenta.text()).toContain(
      'Entra para ver, mover o cancelar tus citas.'
    );
    expect(
      wrapper.find('[data-test="menu-entrada-iniciar-sesion"]').text()
    ).toBe('Iniciar sesión');
    expect(wrapper.find('[data-test="menu-entrada-crear-cuenta"]').text()).toBe(
      'Crear cuenta'
    );
    expect(wrapper.find('[data-test="menu-avatar"]').exists()).toBe(false);
  });

  it('los dos botones llevan al login y al registro con el mismo regreso', () => {
    const wrapper = montar();

    expect(enlace(wrapper, 'iniciar-sesion').props('to')).toEqual({
      name: 'login',
      query: { redirect: '/testimonios' },
    });
    expect(enlace(wrapper, 'crear-cuenta').props('to')).toEqual({
      name: 'register',
      query: { redirect: '/testimonios' },
    });
  });

  it('«Iniciar sesión» lleva el icono de entrar en el desplegable, y no en la hoja (tableros)', () => {
    expect(
      montar().find('[data-test="menu-entrada-iniciar-sesion"] svg').exists()
    ).toBe(true);
    expect(
      montar({ variante: 'hoja' })
        .find('[data-test="menu-entrada-iniciar-sesion"] svg')
        .exists()
    ).toBe(false);
  });

  it('con sesión pinta avatar de iniciales, nombre y correo, sin la invitación', () => {
    const wrapper = montar({
      estado: CLIENTA,
      nombre: 'Ana María López',
      correo: 'ana@correo.com',
    });
    const cuenta = wrapper.find('[data-test="menu-seccion-cuenta"]');

    expect(wrapper.find('[data-test="menu-avatar"]').text()).toBe('AM');
    expect(cuenta.text()).toContain('Ana María López');
    expect(cuenta.text()).toContain('ana@correo.com');
    expect(cuenta.text()).not.toContain('Entra para ver');
  });

  it('el avatar es decorativo: el nombre ya se lee al lado', () => {
    const wrapper = montar({
      estado: CLIENTA,
      nombre: 'Ana',
      correo: 'a@correo.com',
    });

    expect(
      wrapper.find('[data-test="menu-avatar"]').attributes('aria-hidden')
    ).toBe('true');
  });

  it('sin nombre, la inicial del correo', () => {
    const wrapper = montar({
      estado: CLIENTA,
      nombre: '',
      correo: 'clienta@correo.com',
    });

    expect(wrapper.find('[data-test="menu-avatar"]').text()).toBe('C');
  });

  it('sin nombre ni correo, el avatar pinta el icono de cuenta', () => {
    const avatar = montar({ estado: CLIENTA, nombre: '', correo: '' }).find(
      '[data-test="menu-avatar"]'
    );

    expect(avatar.text()).toBe('');
    expect(avatar.find('svg path').attributes('d')).toContain('M15.2 8.2');
  });
});

describe('MenuMasContenido · la línea del horario', () => {
  it('Horarios lleva «Hoy · …» a la derecha', () => {
    const linea = montar({ horarioHoy: '9:00 a 19:00' }).find(
      '[data-test="menu-entrada-horarios"] [data-test="menu-horario-hoy"]'
    );

    expect(linea.text()).toBe('Hoy · 9:00 a 19:00');
  });

  it('sin horario calculado no pinta la línea (nunca «Hoy · » a secas)', () => {
    expect(
      montar({ horarioHoy: '' }).find('[data-test="menu-horario-hoy"]').exists()
    ).toBe(false);
  });
});

describe('MenuMasContenido · elegir', () => {
  it('un botón de acción emite elegir con su entrada', async () => {
    const wrapper = montar();

    await wrapper
      .find('[data-test="menu-entrada-quienes-somos"]')
      .trigger('click');

    const [[elegida]] = wrapper.emitted('elegir') as Array<[EntradaMenu]>;
    expect(elegida.id).toBe('quienes-somos');
    expect(elegida.accion).toBe('quienes-somos');
  });

  /** Foco de revisión 3: un enlace a la página actual no navega; elegir cierra igual. */
  it('un enlace también emite elegir, para que el armazón cierre el menú', async () => {
    const wrapper = montar();

    await enlace(wrapper, 'testimonios').trigger('click');

    const [[elegida]] = wrapper.emitted('elegir') as Array<[EntradaMenu]>;
    expect(elegida.id).toBe('testimonios');
    expect(elegida.destino).toBe('/testimonios');
  });

  it('cerrar sesión también pasa por elegir: lo resuelve el armazón', async () => {
    const wrapper = montar({ estado: CLIENTA, nombre: 'Ana' });

    await wrapper
      .find('[data-test="menu-entrada-cerrar-sesion"]')
      .trigger('click');

    const [[elegida]] = wrapper.emitted('elegir') as Array<[EntradaMenu]>;
    expect(elegida.accion).toBe('cerrar-sesion');
  });
});

describe('MenuMasContenido · variantes', () => {
  it('la raíz dice su variante', () => {
    expect(montar().find('nav').classes()).toContain('menu-mas--desplegable');
    expect(montar({ variante: 'hoja' }).find('nav').classes()).toContain(
      'menu-mas--hoja'
    );
  });

  it('los iconos miden 19 en el desplegable, 20 en la hoja y 16 en el pie (tableros)', () => {
    const desplegable = montar({ estado: CLIENTA, nombre: 'Ana' });
    const hoja = montar({ estado: CLIENTA, nombre: 'Ana', variante: 'hoja' });

    expect(
      desplegable
        .find('[data-test="menu-entrada-testimonios"] svg')
        .attributes('width')
    ).toBe('19');
    expect(
      hoja
        .find('[data-test="menu-entrada-testimonios"] svg')
        .attributes('width')
    ).toBe('20');
    expect(
      desplegable
        .find('[data-test="menu-entrada-cerrar-sesion"] svg')
        .attributes('width')
    ).toBe('16');
    expect(
      hoja
        .find('[data-test="menu-entrada-politica-datos"] svg')
        .attributes('width')
    ).toBe('16');
  });
});

// --- Contrato visual, leyendo la fuente -------------------------------------

const FUENTE = readFileSync(
  join(__dirname, '../../src/components/shared/MenuMasContenido.vue'),
  'utf8'
);
const ESTILOS = FUENTE.slice(FUENTE.indexOf('<style'));
const sinComentarios = (css: string) =>
  css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const reglas = (css: string) =>
  Array.from(sinComentarios(css).matchAll(/([^{};]+)\{([^{}]*)\}/g)).map(
    (r) => ({
      selector: r[1].trim(),
      cuerpo: r[2],
    })
  );
const cuerpoDe = (selector: string) =>
  reglas(ESTILOS)
    .filter((r) => r.selector === selector)
    .map((r) => r.cuerpo)
    .join('\n');

describe('MenuMasContenido · contrato visual', () => {
  it('ni un hexadecimal: todo color sale de los tokens', () => {
    expect(FUENTE).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it('usa la paleta y las dos familias', () => {
    for (const token of [
      '--m-nieve',
      '--m-hueso',
      '--m-tinta',
      '--m-filete',
      '--m-oro-profundo',
      '--m-piedra',
      '--m-font-sans',
      '--m-font-display',
      '--m-tracking-etiqueta',
      '--m-tracking-nav',
      '--m-tactil-min',
      '--m-radio-pildora',
      '--m-radio-tarjeta',
    ]) {
      expect(ESTILOS).toContain(`var(${token})`);
    }
  });

  it('las filas y los botones miden al menos 44 px', () => {
    expect(cuerpoDe('.menu-mas__entrada')).toMatch(
      /min-height: var\(--m-tactil-min\);/
    );
    expect(cuerpoDe('.menu-mas__boton')).toMatch(
      /min-height: var\(--m-tactil-min\);/
    );
    expect(cuerpoDe('.menu-mas__avatar')).toMatch(
      /width: var\(--m-tactil-min\);/
    );
  });

  /** M5: seis filas en versalitas grandes era justo lo que pesaba. */
  it('los rótulos de fila van en caja normal: 14,5 px en el desplegable, 15 en la hoja', () => {
    expect(cuerpoDe('.menu-mas__entrada')).toMatch(/text-transform: none;/);
    expect(cuerpoDe('.menu-mas__entrada')).toMatch(/font-size: 14\.5px;/);
    expect(cuerpoDe('.menu-mas--hoja .menu-mas__entrada')).toMatch(
      /font-size: 15px;/
    );
  });

  it('solo los títulos de sección van en versalitas, en oro profundo', () => {
    const titulo = cuerpoDe('.menu-mas__titulo');

    expect(titulo).toMatch(/text-transform: uppercase;/);
    expect(titulo).toMatch(/letter-spacing: var\(--m-tracking-etiqueta\);/);
    expect(titulo).toMatch(/font-size: 10\.5px;/);
    expect(titulo).toMatch(/color: var\(--m-oro-profundo\);/);
  });

  it('los iconos de fila van en oro profundo (el claro da 2,8:1 sobre nieve)', () => {
    expect(cuerpoDe('.menu-mas__icono')).toMatch(
      /color: var\(--m-oro-profundo\);/
    );
  });

  it('el oro claro solo colorea texto sobre tinta: el rótulo de «Iniciar sesión» al pasar', () => {
    const conOro = reglas(ESTILOS).filter((r) =>
      /(^|[\s;])color: var\(--m-oro\);/.test(r.cuerpo)
    );

    expect(conOro.map((r) => r.selector)).toEqual([
      '.menu-mas__boton--macizo:hover',
    ]);
  });

  it('el texto secundario es piedra, no el gris del lienzo', () => {
    expect(cuerpoDe('.menu-mas__invitacion')).toMatch(
      /color: var\(--m-piedra\);/
    );
    expect(cuerpoDe('.menu-mas__detalle')).toMatch(/color: var\(--m-piedra\);/);
    expect(cuerpoDe('.menu-mas__correo')).toMatch(/color: var\(--m-piedra\);/);
  });

  it('el avatar es de tinta, con las iniciales en Marcellus', () => {
    const avatar = cuerpoDe('.menu-mas__avatar');

    expect(avatar).toMatch(/background: var\(--m-tinta\);/);
    expect(avatar).toMatch(/color: var\(--m-hueso\);/);
    expect(avatar).toMatch(/font-family: var\(--m-font-display\);/);
  });

  it('foco visible en filas y botones, con el anillo dorado', () => {
    expect(ESTILOS).toMatch(
      /\.menu-mas__entrada:focus-visible\s*\{[^}]*outline: 2px solid var\(--m-oro\);/
    );
    expect(ESTILOS).toMatch(
      /\.menu-mas__boton:focus-visible\s*\{[^}]*outline: 2px solid var\(--m-oro\);/
    );
  });

  /** Foco de revisión 4: un nombre o un correo sin espacios no estira la hoja. */
  it('el nombre y el correo largos parten en vez de desbordar', () => {
    expect(cuerpoDe('.menu-mas__quien')).toMatch(/min-width: 0;/);
    expect(cuerpoDe('.menu-mas__nombre')).toMatch(/overflow-wrap: break-word;/);
    expect(cuerpoDe('.menu-mas__correo')).toMatch(/overflow-wrap: break-word;/);
  });

  it('Safari 13.1: ni `inset`, ni `:has()`, ni `overflow-wrap: anywhere`', () => {
    expect(ESTILOS).not.toMatch(/(^|[\s;{])inset:/m);
    expect(ESTILOS).not.toContain(':has(');
    expect(ESTILOS).not.toContain('anywhere');
  });

  it('las filas responden igual sean enlace o botón, y al pulsar bajan en vez de encoger', () => {
    const plantilla = FUENTE.split('<script')[0];
    const filas = Array.from(
      plantilla.matchAll(/\sclass="([^"]*menu-mas__entrada[^"]*)"/g)
    );

    expect(filas.length).toBe(2);
    for (const fila of filas) {
      expect(fila[1].split(/\s+/)).toEqual(
        expect.arrayContaining([
          'menu-mas__entrada',
          'm-boton',
          'm-boton--ancho',
        ])
      );
    }
  });
});
