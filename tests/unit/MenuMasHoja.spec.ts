/**
 * La hoja inferior del menú «Más» (M7), por debajo de 700 px. Se vigila que
 * salga por abajo con su cabecera, que la X y el velo la cierren, que reemita
 * lo que se elige, y —leyendo la fuente— que reciba los clics y que su cuerpo
 * desplace cuando el menú no cabe (foco de revisión 5).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { mount, RouterLinkStub } from '@vue/test-utils';
import MenuMasHoja from 'src/components/shared/MenuMasHoja.vue';
import {
  seccionesDelMenu,
  type EntradaMenu,
} from 'src/composables/shared/menuMas';

const FUENTE = readFileSync(
  join(__dirname, '../../src/components/shared/MenuMasHoja.vue'),
  'utf8'
);
const ESTILOS = FUENTE.slice(FUENTE.indexOf('<style'));

/**
 * `QDialog` se dobla con un envoltorio transparente: sin Quasar instalado el
 * componente no resolvería y la hoja no llegaría al DOM. El doble declara
 * `modelValue` porque de él depende que el contenido se pinte.
 */
const stubs = {
  QDialog: {
    name: 'QDialog',
    props: ['modelValue', 'position', 'transitionShow', 'transitionHide'],
    emits: ['update:modelValue'],
    template: '<div v-if="modelValue" class="dialogo-doble"><slot /></div>',
  },
  RouterLink: RouterLinkStub,
};

function montar(abierta = true) {
  return mount(MenuMasHoja, {
    props: {
      abierta,
      secciones: seccionesDelMenu({
        isLoggedIn: false,
        isAdmin: false,
        redirect: '/',
      }),
      nombre: '',
      correo: '',
      horarioHoy: '9:00 a 19:00',
    },
    global: { stubs },
  });
}

describe('MenuMasHoja', () => {
  it('cerrada no pinta nada', () => {
    expect(montar(false).find('[data-test="menu-hoja"]').exists()).toBe(false);
  });

  it('abierta sale por abajo, con tirador, título «Menú» y la X', () => {
    const wrapper = montar();

    expect(wrapper.getComponent({ name: 'QDialog' }).props('position')).toBe(
      'bottom'
    );
    expect(wrapper.find('[data-test="menu-hoja"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="menu-hoja"] h2').text()).toBe('Menú');
    expect(wrapper.find('[data-test="menu-hoja-cerrar"]').exists()).toBe(true);
  });

  it('el diálogo tiene nombre para el lector de pantalla', () => {
    expect(
      montar().getComponent({ name: 'QDialog' }).attributes('aria-label')
    ).toBe('Menú');
  });

  it('pinta el contenido en su variante de hoja, con el horario que le pasan', () => {
    const contenido = montar().getComponent({ name: 'MenuMasContenido' });

    expect(contenido.props('variante')).toBe('hoja');
    expect(contenido.props('horarioHoy')).toBe('9:00 a 19:00');
    expect(contenido.find('[data-test="menu-horario-hoy"]').text()).toBe(
      'Hoy · 9:00 a 19:00'
    );
  });

  it('la X es un botón con nombre, de tipo button, y cierra la hoja', async () => {
    const wrapper = montar();
    const cerrar = wrapper.find('[data-test="menu-hoja-cerrar"]');

    expect(cerrar.attributes('type')).toBe('button');
    expect(cerrar.attributes('aria-label')).toBe('Cerrar el menú');

    await cerrar.trigger('click');

    expect(wrapper.emitted('update:abierta')?.[0]).toEqual([false]);
  });

  it('el velo y Escape (los cierra q-dialog) también llegan a quien la abrió', async () => {
    const wrapper = montar();

    wrapper
      .getComponent({ name: 'QDialog' })
      .vm.$emit('update:modelValue', false);
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted('update:abierta')?.[0]).toEqual([false]);
  });

  it('reemite lo que se elige: la hoja no decide qué hacer', async () => {
    const wrapper = montar();

    await wrapper.find('[data-test="menu-entrada-horarios"]').trigger('click');

    const [[elegida]] = wrapper.emitted('elegir') as Array<[EntradaMenu]>;
    expect(elegida.id).toBe('horarios');
  });
});

describe('MenuMasHoja · contrato visual', () => {
  it('ni un hexadecimal', () => {
    expect(FUENTE).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it('la raíz del diálogo es la sección de la hoja, sin `>` en la apertura del q-dialog', () => {
    // Si la etiqueta de apertura llevara una flecha `=>`, la guarda de
    // `dialogos-reciben-clics.spec.ts` leería mal cuál es la raíz.
    expect(FUENTE).toMatch(/<q-dialog\b[^>]*>\s*<section\s+class="menu-hoja"/);
  });

  it('la raíz recibe los clics (Quasar se los quita a todo lo que no sea <div>)', () => {
    expect(ESTILOS).toMatch(/\.menu-hoja\s*\{[^}]*pointer-events: all;/);
  });

  it('es nieve, con la esquina del panel y un techo de 85 % del alto', () => {
    const raiz = /\.menu-hoja\s*\{([^}]*)\}/.exec(ESTILOS)?.[1] ?? '';

    expect(raiz).toMatch(/background: var\(--m-nieve\);/);
    expect(raiz).toMatch(/border-top-left-radius: var\(--m-radio-panel\);/);
    expect(raiz).toMatch(/max-height: 85vh;/);
  });

  /** Foco de revisión 5: con cuatro secciones en un teléfono pequeño, desplaza el cuerpo. */
  it('el cuerpo desplaza y la cabecera con la X se queda', () => {
    const cuerpo = /\.menu-hoja__cuerpo\s*\{([^}]*)\}/.exec(ESTILOS)?.[1] ?? '';
    const cabecera =
      /\.menu-hoja__cabecera\s*\{([^}]*)\}/.exec(ESTILOS)?.[1] ?? '';

    expect(cuerpo).toMatch(/overflow-y: auto;/);
    expect(cuerpo).toMatch(/min-height: 0;/);
    expect(cabecera).toMatch(/flex: 0 0 auto;/);
  });

  it('título en Marcellus de 20 px; X de 44 px con foco dorado', () => {
    const titulo = /\.menu-hoja__titulo\s*\{([^}]*)\}/.exec(ESTILOS)?.[1] ?? '';
    const cerrar = /\.menu-hoja__cerrar\s*\{([^}]*)\}/.exec(ESTILOS)?.[1] ?? '';

    expect(titulo).toMatch(/font-family: var\(--m-font-display\);/);
    expect(titulo).toMatch(/font-size: 20px;/);
    expect(cerrar).toMatch(/width: var\(--m-tactil-min\);/);
    expect(cerrar).toMatch(/height: var\(--m-tactil-min\);/);
    expect(ESTILOS).toMatch(
      /\.menu-hoja__cerrar:focus-visible\s*\{[^}]*outline: 2px solid var\(--m-oro\);/
    );
  });

  it('el velo es el de la paleta, en un bloque sin scoped y prefijado', () => {
    const libre = FUENTE.slice(FUENTE.indexOf('<style lang="scss">'));

    expect(FUENTE.indexOf('<style lang="scss">')).toBeGreaterThan(
      FUENTE.indexOf('<style scoped lang="scss">')
    );
    expect(libre).toMatch(
      /\.menu-hoja-dialogo \.q-dialog__backdrop\s*\{[^}]*background: var\(--m-velo\);/
    );
  });

  /** Quasar deja 24 px a cada lado entre 600 y 699 px; la hoja va de borde a borde hasta el corte. */
  it('de borde a borde en todo el tramo de móvil (< 700 px)', () => {
    const libre = FUENTE.slice(FUENTE.indexOf('<style lang="scss">'));

    expect(libre).toMatch(
      /\.menu-hoja-dialogo \.q-dialog__inner--bottom\s*\{[^}]*padding-left: 0;[^}]*padding-right: 0;/
    );
  });

  it('Safari 13.1: ni `inset`, ni `:has()`, ni `dvh` sin su `vh` delante', () => {
    expect(ESTILOS).not.toMatch(/(^|[\s;{])inset:/m);
    expect(ESTILOS).not.toContain(':has(');
    expect(ESTILOS).not.toContain('dvh');
  });
});
