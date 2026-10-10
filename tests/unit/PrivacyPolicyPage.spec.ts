/**
 * La política como documento con índice (S4, tablero PoliticaIndice). Primero,
 * lo que no se puede tocar: el texto legal, pieza a pieza. Después, el índice:
 * la sección visible con un punto, el clic que lleva y deja el foco en su
 * título, y el desplegable de móvil.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { nextTick } from 'vue';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import PrivacyPolicyPage from 'src/pages/PrivacyPolicyPage.vue';
import { useSeo } from 'src/composables/seo/useSeo';
import { TEXTO_LEGAL, TITULOS_SECCIONES } from './fixtures/politica-texto';
import {
  ObservadorFalso,
  instalarObservadorFalso,
} from './fixtures/observador-falso';

jest.mock('src/composables/seo/useSeo', () => ({ useSeo: jest.fn() }));

const FUENTE = readFileSync(
  join(__dirname, '../../src/pages/PrivacyPolicyPage.vue'),
  'utf8'
);
const ESTILOS = FUENTE.slice(FUENTE.indexOf('<style'));

const stubs = { QPage: { template: '<main><slot /></main>' } };
const normal = (texto: string) => texto.replace(/\s+/g, ' ').trim();

let envoltorio: VueWrapper | null = null;
let quitar: () => void = () => undefined;
const scrollToReal = window.scrollTo;

function montar(): VueWrapper {
  envoltorio = mount(PrivacyPolicyPage, {
    global: { stubs },
    attachTo: document.body,
  });
  return envoltorio;
}

beforeEach(() => {
  window.scrollTo = jest.fn();
  jest.mocked(useSeo).mockClear();
});

afterEach(() => {
  envoltorio?.unmount();
  envoltorio = null;
  quitar();
  quitar = () => undefined;
  window.scrollTo = scrollToReal;
});

describe('Política · el texto legal', () => {
  it('no cambia: cada párrafo y cada viñeta, en orden', () => {
    const piezas = montar()
      .findAll('[data-test="seccion"] p, [data-test="seccion"] li')
      .map((n) => ({
        etiqueta: n.element.tagName.toLowerCase(),
        texto: normal(n.text()),
      }));

    expect(piezas).toHaveLength(TEXTO_LEGAL.length);
    piezas.forEach((pieza, i) => {
      const esperado = TEXTO_LEGAL[i];
      expect(pieza.etiqueta).toBe(esperado.etiqueta);
      if (esperado.texto instanceof RegExp) {
        expect(pieza.texto).toMatch(esperado.texto);
      } else {
        expect(pieza.texto).toBe(esperado.texto);
      }
    });
  });

  it('diez secciones numeradas del 1 al 10 con sus títulos de siempre', () => {
    const secciones = montar().findAll('[data-test="seccion"]');

    expect(
      secciones.map((s) => s.get('[data-test="numero-seccion"]').text())
    ).toEqual(TITULOS_SECCIONES.map((_t, i) => String(i + 1)));
    expect(
      secciones.map((s) => s.get('[data-test="titulo-seccion"]').text())
    ).toEqual(TITULOS_SECCIONES);
  });

  /**
   * Número y título van en dos `<span>`: sin un espacio de texto entre ellos el
   * HTML prerenderizado, el nombre accesible y Safari 13.1 (sin `gap` en flex)
   * leen «1Responsable del tratamiento».
   */
  it('el número y el título de cada encabezado se leen separados', () => {
    const encabezados = montar().findAll('[data-test="seccion"] h2');

    expect(normal(encabezados[0].element.textContent ?? '')).toBe(
      '1 Responsable del tratamiento'
    );
    expect(encabezados.map((h) => normal(h.element.textContent ?? ''))).toEqual(
      TITULOS_SECCIONES.map((t, i) => `${i + 1} ${t}`)
    );
  });

  it('el teléfono que se lee es el mismo que marca el enlace', () => {
    const tel = montar().get('[data-test="seccion"] a[href^="tel:"]');

    expect((tel.attributes('href') ?? '').replace(/\D/g, '')).toBe(
      tel.text().replace(/\D/g, '')
    );
  });

  it('el correo del responsable abre el correo', () => {
    const correo = montar().get('a[href="mailto:lcarrionalvarez@gmail.com"]');

    expect(correo.text()).toBe('lcarrionalvarez@gmail.com');
  });

  it('la versión y la fecha están a la vista, en escritorio y en móvil', () => {
    const wrapper = montar();

    const ficha = wrapper.get('[data-test="version-ficha"]');
    expect(ficha.get('[data-test="version-etiqueta"]').text()).toBe(
      'Versión 1.1'
    );
    expect(ficha.get('[data-test="version-fecha"]').text()).toBe(
      'Actualizada el 30 de septiembre de 2026'
    );
    expect(normal(wrapper.get('[data-test="version-linea"]').text())).toBe(
      'Versión 1.1 · actualizada el 30 de septiembre de 2026'
    );
  });
});

describe('Política · el índice', () => {
  it('lista las diez secciones con su enlace y el mismo título', () => {
    const wrapper = montar();
    const entradas = wrapper.findAll('[data-test="indice-entrada"]');
    const ids = wrapper
      .findAll('[data-test="seccion"]')
      .map((s) => s.attributes('id'));

    expect(entradas.map((e) => e.attributes('href'))).toEqual(
      ids.map((id) => `#${id}`)
    );
    expect(
      entradas.map((e) => normal(e.get('[data-test="titulo-entrada"]').text()))
    ).toEqual(TITULOS_SECCIONES);
  });

  it('el número y el título de cada entrada se leen separados', () => {
    const entradas = montar().findAll('[data-test="indice-entrada"]');

    expect(normal(entradas[0].element.textContent ?? '')).toBe(
      '1 Responsable del tratamiento'
    );
    expect(entradas.map((e) => normal(e.element.textContent ?? ''))).toEqual(
      TITULOS_SECCIONES.map((t, i) => `${i + 1} ${t}`)
    );
  });

  /** Foco de revisión 5: sin observador (jsdom, SSG) no revienta. */
  it('sin IntersectionObserver marca la primera y solo una', () => {
    const entradas = montar().findAll('[data-test="indice-entrada"]');

    expect(entradas[0].attributes('aria-current')).toBe('location');
    expect(entradas[0].find('.politica__punto--activo').exists()).toBe(true);
    expect(
      entradas.filter((e) => e.attributes('aria-current') !== undefined)
    ).toHaveLength(1);
  });

  it('al leer otra sección, el punto se mueve a ella', async () => {
    quitar = instalarObservadorFalso();
    const wrapper = montar();

    ObservadorFalso.ultimo?.emitir([['politica-datos', true]]);
    await nextTick();

    const entradas = wrapper.findAll('[data-test="indice-entrada"]');
    expect(entradas[2].attributes('aria-current')).toBe('location');
    expect(entradas[0].attributes('aria-current')).toBeUndefined();
  });

  /** Foco de revisión 5: el teclado no puede volver a empezar desde arriba. */
  it('pulsar una entrada desplaza, deja el foco en el título y la marca', async () => {
    const wrapper = montar();
    const entrada = wrapper.findAll('[data-test="indice-entrada"]')[4];

    await entrada.trigger('click');
    await flushPromises();

    expect(window.scrollTo).toHaveBeenCalledTimes(1);
    const titulo = document.querySelector('#politica-encargados h2');
    expect(document.activeElement).toBe(titulo);
    expect(entrada.attributes('aria-current')).toBe('location');
  });

  it('en móvil el índice va plegado y se despliega con su botón', async () => {
    const wrapper = montar();
    const alternar = wrapper.get('[data-test="alternar-indice"]');
    const lista = wrapper.get('#politica-indice-lista');

    expect(normal(alternar.text())).toBe('Contenido · 10 secciones');
    expect(alternar.attributes('aria-controls')).toBe('politica-indice-lista');
    expect(alternar.attributes('aria-expanded')).toBe('false');
    expect(lista.classes()).not.toContain('politica__lista--abierta');

    await alternar.trigger('click');

    expect(alternar.attributes('aria-expanded')).toBe('true');
    expect(lista.classes()).toContain('politica__lista--abierta');
  });

  it('elegir una sección en el desplegable lo pliega', async () => {
    const wrapper = montar();
    const alternar = wrapper.get('[data-test="alternar-indice"]');
    await alternar.trigger('click');

    await wrapper.findAll('[data-test="indice-entrada"]')[1].trigger('click');
    await flushPromises();

    expect(alternar.attributes('aria-expanded')).toBe('false');
  });
});

describe('Política · SEO y fuente', () => {
  it('conserva el título y la ruta de su SEO', () => {
    montar();
    const opciones = jest.mocked(useSeo).mock.calls[0][0];

    expect(opciones.title).toBe(
      'Política de Tratamiento de Datos Personales | Peluquería Marlene'
    );
    expect(opciones.path).toBe('/politica-tratamiento-datos');
  });

  it('el índice de escritorio se queda a la vista al desplazar', () => {
    expect(ESTILOS).toMatch(/\.politica__indice\s*\{[^}]*position: sticky;/);
  });

  it('en móvil la lista solo se ve desplegada', () => {
    expect(ESTILOS).toMatch(
      /@media \(max-width: 899px\)[\s\S]*\.politica__lista\s*\{[^}]*display: none;[\s\S]*\.politica__lista--abierta\s*\{[^}]*display: block;/
    );
  });

  it('el punto, no un borde, marca la sección', () => {
    expect(ESTILOS).toMatch(
      /\.politica__punto--activo\s*\{[^}]*background: var\(--m-oro-profundo\);/
    );
    expect(ESTILOS).not.toMatch(/border-left/);
  });

  /** Safari 13.1 (NF06) no conoce `overflow-wrap: anywhere`. */
  it('el correo y el teléfono parten sin desbordar, también en Safari 13.1', () => {
    expect(ESTILOS).toMatch(
      /\.politica__enlace-texto\s*\{[^}]*overflow-wrap: break-word;/
    );
    expect(ESTILOS).not.toMatch(/overflow-wrap: anywhere/);
  });

  /** Safari 13.1 (NF06) no conoce `gap` en flex: el aire va en márgenes. */
  it('el número y el título se separan con margen, no con el gap de flex', () => {
    expect(ESTILOS).not.toMatch(/\.politica__h2\s*\{[^}]*gap:/);
    expect(ESTILOS).not.toMatch(/\.politica__enlace\s*\{[^}]*gap:/);
    expect(ESTILOS).toMatch(/\.politica__numero\s*\{[^}]*margin-right: 14px;/);
    expect(ESTILOS).toMatch(
      /\.politica__indice-numero\s*\{[^}]*margin-right: 12px;/
    );
    expect(ESTILOS).toMatch(/\.politica__punto\s*\{[^}]*margin-right: 12px;/);
  });

  /** Quien llega con `#politica-…` en la URL ve el título, no la cabecera fija. */
  it('cada sección deja sitio a la cabecera fija al saltar a ella', () => {
    expect(ESTILOS).toMatch(
      /\.politica__seccion\s*\{[^}]*scroll-margin-top: calc\(var\(--m-cabecera-alto\) \+ 16px\);/
    );
    expect(ESTILOS).toMatch(
      /@media \(max-width: 699px\)[\s\S]*\.politica__seccion\s*\{[^}]*scroll-margin-top: calc\(var\(--m-cabecera-alto-movil\) \+ 16px\);/
    );
  });

  it('el marco se centra por encima de 1280 px', () => {
    expect(ESTILOS).toMatch(/\.politica__marco\s*\{[^}]*margin: 0 auto;/);
  });

  it('el desplegable de móvil, a lo ancho, se hunde como botón ancho', () => {
    const alternar = montar().get('[data-test="alternar-indice"]');

    expect(alternar.classes()).toEqual(
      expect.arrayContaining(['politica__alternar', 'm-boton--ancho'])
    );
  });

  it('ya no trae el botón «Volver al inicio»', () => {
    expect(FUENTE).not.toContain('Volver al inicio');
  });
});
