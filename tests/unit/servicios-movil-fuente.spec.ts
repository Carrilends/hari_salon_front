/**
 * Plan 9 — servicios en móvil: la guarda de fuente de sus archivos (hoja de
 * ruta de las vistas, §2). El CSS no existe en Jest (está mapeado a
 * `tests/styleMock.js`): lo que se vigila aquí se lee de la fuente.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const SRC = join(__dirname, '../../src');
const leer = (ruta: string) => readFileSync(join(SRC, ruta), 'utf8');

const ARCHIVOS = [
  'components/dialogs/serviceDialog.vue',
  'components/dialogs/ServicePromotionDialog.vue',
  'components/servicePage/ServiceRow.vue',
  'components/servicePage/ServiceCardAdminActions.vue',
  'components/servicePage/ServiceToolbar.vue',
  'components/index/MobileActionBar.vue',
  'pages/ServicePage.vue',
];

/** Los que pintan sobre tinta o carbón. El renglón y su franja van sobre nieve. */
const SOBRE_OSCURO = ARCHIVOS.filter(
  (ruta) =>
    ![
      'components/servicePage/ServiceRow.vue',
      'components/servicePage/ServiceCardAdminActions.vue',
    ].includes(ruta)
);

const sinComentarios = (css: string) =>
  css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/** El CSS del archivo, sin comentarios; falla si no hay `<style`, para no pasar en vacío. */
const estilos = (fuente: string) => {
  const desde = fuente.indexOf('<style');
  if (desde === -1) throw new Error('el archivo no tiene <style');
  return sinComentarios(fuente.slice(desde));
};

/** El CSS sin los bloques de la consulta de puntero fino (llaves equilibradas). */
const fueraDePunteroFino = (css: string) => {
  let resto = css;
  for (;;) {
    const desde = resto.indexOf('@media (hover: hover) and (pointer: fine)');
    if (desde === -1) return resto;
    let nivel = 0;
    let i = resto.indexOf('{', desde);
    for (; i < resto.length; i++) {
      if (resto[i] === '{') nivel++;
      else if (resto[i] === '}' && --nivel === 0) break;
    }
    resto = resto.slice(0, desde) + resto.slice(i + 1);
  }
};
const plantilla = (fuente: string) => fuente.split('<script')[0];

/** Todos los `.vue`, `.ts` y `.scss` de `src/`, con su ruta relativa. */
const todos = (dir: string): string[] =>
  readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) return todos(ruta);
    return /\.(vue|ts|scss)$/.test(nombre) ? [ruta] : [];
  });

describe('plan 9 · guarda de fuente', () => {
  it.each(ARCHIVOS)('%s no pinta con hexadecimales', (ruta) => {
    expect(estilos(leer(ruta))).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it.each(ARCHIVOS)('%s no avisa con los avisos de Quasar a pelo', (ruta) => {
    expect(leer(ruta)).not.toMatch(/\$q\.notify/);
  });

  it.each(ARCHIVOS)(
    '%s no trae botones, campos ni tarjetas de Quasar',
    (ruta) => {
      expect(plantilla(leer(ruta))).not.toMatch(/<q-(btn|input|card)\b/);
    }
  );

  it.each(ARCHIVOS)(
    '%s respeta Safari 13.1: ni `inset` ni `:has()`',
    (ruta) => {
      const css = estilos(leer(ruta));

      expect(css).not.toMatch(/(?<![\w-])inset(-[a-z]+)?\s*:/);
      expect(css).not.toMatch(/:has\(/);
    }
  );

  it.each(ARCHIVOS)('%s no usa `rgba(` en sus estilos', (ruta) => {
    expect(estilos(leer(ruta))).not.toMatch(/rgba?\(/);
  });

  /**
   * El realce de color al pasar vive solo en la consulta de puntero fino. La
   * única excepción es la fila de la lista: su borde reacciona al puntero Y al
   * foco del teclado (`:focus-within`), y no hay equivalente táctil que dañar.
   */
  it.each(ARCHIVOS)(
    '%s no tiene `:hover` fuera de la consulta de puntero fino',
    (ruta) => {
      const fuera = fueraDePunteroFino(estilos(leer(ruta))).replace(
        /\.fila-servicio:hover,\s*\.fila-servicio:focus-within\s*\{/,
        ''
      );

      expect(fuera).not.toMatch(/:hover/);
    }
  );

  /** El foco se vigila por control, no por archivo: un control nuevo sin foco falla. */
  it.each([
    ['components/dialogs/serviceDialog.vue', 'ficha__cerrar'],
    ['components/dialogs/serviceDialog.vue', 'ficha__anadir'],
    ['components/dialogs/serviceDialog.vue', 'ficha__cerrar-pie'],
    ['components/dialogs/ServicePromotionDialog.vue', 'promo__boton'],
    ['components/dialogs/ServicePromotionDialog.vue', 'promo__entrada'],
    [
      'components/servicePage/ServiceCardAdminActions.vue',
      'acciones-admin__boton',
    ],
    ['components/index/MobileActionBar.vue', 'mobile-bar__crear'],
    ['components/servicePage/ServiceToolbar.vue', 'barra__boton'],
    ['components/servicePage/ServiceRow.vue', 'fila-servicio__enlace'],
  ])('%s · .%s deja ver el foco', (ruta, clase) => {
    expect(estilos(leer(ruta))).toMatch(
      new RegExp(`\\.${clase}(?![\\w-])[^{]*:focus-visible`)
    );
  });

  /**
   * El rosa de «Borrar» sobre tinta es para fondo oscuro: sobre hueso da 1,8:1.
   * Solo lo usan la franja de la dueña y la hoja de la promoción. Si otra
   * superficie oscura lo necesita, se añade aquí su ruta a propósito.
   */
  it('el rosa de peligro sobre tinta solo lo usan la franja y la promoción', () => {
    const usan = todos(SRC)
      .filter((ruta) =>
        readFileSync(ruta, 'utf8').includes('var(--m-peligro-sobre-tinta)')
      )
      .map((ruta) => relative(SRC, ruta).split(sep).join('/'))
      .sort();

    expect(usan).toEqual([
      'components/dialogs/ServicePromotionDialog.vue',
      'components/servicePage/ServiceCardAdminActions.vue',
    ]);
  });

  /**
   * Foco de revisión 2: sobre carbón el peligro macizo, el rosa profundo y el
   * oro profundo dan 2,1:1, 2,1:1 y 2,5:1. Ningún archivo que pinte sobre
   * oscuro los usa (el sufijo `-sobre-tinta` es otro token y no cuenta).
   *
   * Desde la paleta A (2026-10-11) el renglón y su franja de acciones van
   * sobre nieve y sí los usan; tienen su propia guarda, la de abajo.
   */
  it.each(SOBRE_OSCURO)(
    '%s no usa los tokens de fondo claro como color',
    (ruta) => {
      const css = estilos(leer(ruta));

      for (const token of [
        '--m-peligro',
        '--m-rosa-profundo',
        '--m-oro-profundo',
      ]) {
        expect({
          token,
          usa: new RegExp(`var\\(${token}(?![\\w-])`).test(css),
        }).toEqual({
          token,
          usa: false,
        });
      }
    }
  );

  /**
   * La guarda al revés, para la paleta A: el renglón va sobre nieve, y el
   * hueso y la piedra clara, que son texto para tinta, ahí dan 1,1:1 y 1,7:1.
   */
  it('el renglón, sobre nieve, no escribe con los tokens de fondo oscuro', () => {
    const css = estilos(leer('components/servicePage/ServiceRow.vue'));

    for (const token of ['--m-hueso', '--m-piedra-clara']) {
      expect({
        token,
        usa: new RegExp(`var\\(${token}(?![\\w-])`).test(css),
      }).toEqual({ token, usa: false });
    }
  });
});
