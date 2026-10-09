/**
 * `--m-barra-movil-alto` no es decorativo: de él cuelgan el relleno inferior de
 * la página y la altura a la que se posa el flotante del asistente. Si el token
 * se queda corto, el flotante cae dentro de la barra y le roba los toques al
 * botón de WhatsApp — justo en los teléfonos con área segura, que son los de
 * 390 px del diseño.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const TOKENS = readFileSync(join(__dirname, '../../src/css/tokens.scss'), 'utf8');

const valorDe = (token: string) =>
  TOKENS.match(new RegExp(`--${token}:\\s*([^;]+);`))?.[1]?.trim() ?? '';

describe('tokens visuales', () => {
  it('el alto de la barra de móvil cuenta el área segura del teléfono', () => {
    expect(valorDe('m-barra-movil-alto')).toContain('env(safe-area-inset-bottom');
  });

  it('cuenta también el filete superior de la barra', () => {
    expect(valorDe('m-barra-movil-alto')).toContain('77px');
  });

  it('declara el velo del panel del asistente', () => {
    expect(valorDe('m-velo')).toBe('rgba(15, 13, 11, 0.52)');
  });

  it('declara el fondo de la banda de aviso', () => {
    expect(valorDe('m-aviso-fondo')).toBe('#efe7dc');
  });

  it('declara el rosa de peligro de las acciones destructivas', () => {
    expect(valorDe('m-peligro')).toBe('#8e3b5c');
    expect(valorDe('m-peligro-texto')).toBe('#f6f1ea');
  });

  it('declara el canal del riel de desplazamiento, oscuro y claro', () => {
    expect(valorDe('m-riel-canal')).toBe('#2a251f');
    expect(valorDe('m-riel-canal-claro')).toBe('#e6ded3');
  });

  /**
   * Lo que un pie fijo tiene que dejar libre abajo para que el lanzador del
   * asistente no le tape los controles. Sale de la geometría del lanzador:
   * si la píldora cambia de sitio o de alto, esto tiene que cambiar con ella.
   */
  it('el despeje del flotante cuenta el borde, el alto del lanzador y un hueco', () => {
    const LANZADOR = readFileSync(
      join(__dirname, '../../src/components/assistant/AssistantLauncher.vue'),
      'utf8'
    );
    const fab = LANZADOR.slice(LANZADOR.indexOf('.assistant-launcher__fab {'));
    const bajo = /bottom: (\d+)px;/.exec(fab)?.[1];
    const alto = /height: (\d+)px;/.exec(fab)?.[1];

    expect(valorDe('m-flotante-despeje')).toBe(
      `calc(${bajo}px + ${alto}px + 8px)`
    );
  });

  it('declara el fondo de los botones que se posan sobre una foto', () => {
    expect(valorDe('m-velo-accion')).toBe('rgba(22, 19, 15, 0.72)');
  });

  /** Spec del menú §4: la sombra del desplegable de «Más», con su token. */
  it('declara la sombra de capa flotante con los canales de la tinta', () => {
    expect(valorDe('m-sombra-flotante')).toBe('0 18px 44px rgba(22, 19, 15, 0.16)');
  });

  it('anota que la sombra flotante no es color de texto', () => {
    const [, comentario] =
      TOKENS.match(/((?:\s*\/\/\/[^\n]*\n)+)\s*--m-sombra-flotante:/) ?? [];

    expect(comentario).toMatch(/no es color de texto/i);
  });

  /**
   * La regla del fichero es que todo token lleve su contraste medido o la razón
   * de que no sea color de texto. Un token sin anotar vuelve a abrir la puerta
   * a elegir colores a ojo.
   */
  it('anota el contraste del rosa de peligro, que sí es color de texto', () => {
    const [, comentario] =
      TOKENS.match(/((?:\s*\/\/\/[^\n]*\n)+)\s*--m-peligro:/) ?? [];

    expect(comentario).toMatch(/6,4:1/);
  });

  it('anota que el canal del riel no es color de texto', () => {
    const [, comentario] =
      TOKENS.match(/((?:\s*\/\/\/[^\n]*\n)+)\s*--m-riel-canal:/) ?? [];

    expect(comentario).toMatch(/no es color de texto/i);
  });

  it('anota que el fondo de acción sobre foto no es color de texto', () => {
    const [, comentario] =
      TOKENS.match(/((?:\s*\/\/\/[^\n]*\n)+)\s*--m-velo-accion:/) ?? [];

    expect(comentario).toMatch(/No es color de texto/);
  });
});

const APP = readFileSync(join(__dirname, '../../src/css/app.scss'), 'utf8');

/**
 * El riel dorado es de quien desplaza en la página de servicios, no del portal:
 * en las bandas claras del inicio un pulgar de oro sobre canal carbón sería una
 * raya oscura en medio del hueso.
 *
 * Mudado el 2026-10-07: antes se declaraba sobre `html.m-riel-oro`, que
 * `ServicePage.vue` ponía al montarse, porque desplazaba el documento (D4).
 * Ahora el documento está quieto y desplazan la lista y el carril, así que el
 * riel es una clase de utilidad, `.m-riel-oro`, que se pone en el elemento que
 * desplaza. Las reglas son las mismas; cambia a quién se le ponen.
 */
describe('riel dorado de la página de servicios', () => {
  it('pinta el pulgar en oro sobre el canal del token, fino', () => {
    expect(APP).toMatch(
      /^\.m-riel-oro\s*\{[^}]*scrollbar-width: thin;[^}]*scrollbar-color: var\(--m-oro\) var\(--m-riel-canal\);/m
    );
  });

  it('mide 6 px y el pulgar va redondo del todo', () => {
    expect(APP).toMatch(
      /^\.m-riel-oro::-webkit-scrollbar\s*\{[^}]*width: 6px;/m
    );
    expect(APP).toMatch(
      /^\.m-riel-oro::-webkit-scrollbar\s*\{[^}]*height: 6px;/m
    );
    expect(APP).toMatch(
      /^\.m-riel-oro::-webkit-scrollbar-thumb\s*\{[^}]*background: var\(--m-oro\);[^}]*border-radius: var\(--m-radio-pildora\);/m
    );
  });

  it('declara el canal, para que el riel se vea siempre y no solo al desplazar', () => {
    expect(APP).toMatch(
      /^\.m-riel-oro::-webkit-scrollbar-track\s*\{[^}]*background: var\(--m-riel-canal\);/m
    );
  });

  /**
   * Lo que de verdad se vigila: que no se escape al resto del portal. Toda
   * regla de riel tiene que colgar de la clase de utilidad, y ninguna del
   * documento: un riel sobre `html` volvería a teñir el inicio.
   */
  it('no toca el riel de ninguna otra página', () => {
    // `[^\n{]` y no `[^{]`: una clase negada SÍ casa saltos de línea, y la
    // expresión se comería desde el comentario de arriba hasta la primera
    // llave, devolviendo un selector que no existe.
    const selectores = [
      ...APP.matchAll(/^([^\n{]*::-webkit-scrollbar[^\n{]*)\{/gm),
    ].map((coincidencia) => coincidencia[1].trim());

    expect(selectores).toHaveLength(3);
    for (const selector of selectores) {
      expect(selector).toMatch(/^\.m-riel-oro::-webkit-scrollbar/);
    }
    expect(APP.match(/scrollbar-color/g)).toHaveLength(1);
    expect(APP).not.toMatch(/html\.m-riel-oro/);
  });

  /**
   * Y que nadie más se la ponga: la clase existe en `app.scss` y solo la usan
   * quienes desplazan en la página de servicios (la lista y el carril).
   */
  it('solo la usan la página de servicios y su carril', () => {
    const SRC = join(__dirname, '../../src');
    const recorrer = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((entrada) =>
        entrada.isDirectory()
          ? recorrer(join(dir, entrada.name))
          : [join(dir, entrada.name)]
      );
    const usuarios = recorrer(SRC)
      .filter((ruta) => readFileSync(ruta, 'utf8').includes('m-riel-oro'))
      .map((ruta) => relative(SRC, ruta).split(sep).join('/'))
      .sort();

    expect(usuarios).toEqual([
      'components/servicePage/ServiceFilterRail.vue',
      'css/app.scss',
      'pages/ServicePage.vue',
    ]);
  });
});

/**
 * La etiqueta que solo oye el lector de pantalla. Va global y no en un
 * componente porque la necesitan el buscador de la barra (fase A) y los campos
 * de los filtros (fase C): declararla dos veces sería dos sitios donde
 * equivocarse.
 */
describe('utilidad de texto para lector de pantalla', () => {
  it('declara la clase `sr` y la saca del flujo sin apagarla', () => {
    expect(APP).toMatch(/^\.sr \{/m);
    expect(APP).toMatch(/\.sr \{[^}]*position: absolute;/);
    expect(APP).toMatch(/\.sr \{[^}]*clip-path: inset\(50%\);/);
    // `display: none` la escondería TAMBIÉN del lector de pantalla.
    expect(APP).not.toMatch(/\.sr \{[^}]*display: none/);
  });
});
