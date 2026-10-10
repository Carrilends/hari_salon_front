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

const estilos = (fuente: string) => fuente.slice(fuente.indexOf('<style'));
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

  it.each(ARCHIVOS)('%s no trae botones, campos ni tarjetas de Quasar', (ruta) => {
    expect(plantilla(leer(ruta))).not.toMatch(/<q-(btn|input|card)\b/);
  });

  it.each(ARCHIVOS)('%s respeta Safari 13.1: ni `inset` ni `:has()`', (ruta) => {
    const css = estilos(leer(ruta));

    expect(css).not.toMatch(/\binset\s*:/);
    expect(css).not.toMatch(/:has\(/);
  });

  it.each(ARCHIVOS)('%s deja ver el foco', (ruta) => {
    const fuente = leer(ruta);
    // La página no tiene controles propios: los pone cada pieza.
    if (ruta === 'pages/ServicePage.vue') return;

    expect(fuente).toContain(':focus-visible');
  });

  /**
   * El rosa de «Borrar» sobre tinta es para fondo oscuro: sobre hueso da 1,8:1.
   * Solo lo usan la franja de la dueña y la hoja de la promoción.
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

  /** Foco de revisión 2: el peligro macizo sobre carbón da 2,1:1. */
  it('ninguna superficie oscura de este plan escribe con el peligro macizo', () => {
    for (const ruta of [
      'components/dialogs/ServicePromotionDialog.vue',
      'components/servicePage/ServiceCardAdminActions.vue',
      'components/servicePage/ServiceRow.vue',
      'components/dialogs/serviceDialog.vue',
    ]) {
      expect({ ruta, usa: /var\(--m-peligro\)/.test(leer(ruta)) }).toEqual({
        ruta,
        usa: false,
      });
    }
  });
});
