/**
 * Guarda de fuente del plan 7 (reseña y 404). El CSS no existe en Jest: los
 * hechos de pintura se leen en la fuente. Vigila lo acordado para todas las
 * vistas (hoja de ruta §2): solo tokens, sin avisos flotantes ni componentes
 * de Quasar nuevos, Safari 13.1, SSG, foco visible y el oro claro fuera del
 * texto sobre claro.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const leer = (ruta: string) =>
  readFileSync(join(__dirname, '../../src', ruta), 'utf8');

const VISTAS = [
  'components/resena/ResenaDialog.vue',
  'components/resena/EstrellasPuntaje.vue',
  'components/resena/ErrorCampo.vue',
  'pages/ErrorNotFound.vue',
];

const LOGICA = [
  'helpers/resena.ts',
  'api/reviews-api.ts',
  'composables/reviews/useFormularioResena.ts',
  'composables/reviews/useReviewDialog.ts',
];

const estilo = (fuente: string) => fuente.slice(fuente.indexOf('<style'));
const plantilla = (fuente: string) => fuente.split('<script')[0];
const script = (fuente: string) =>
  fuente.slice(fuente.indexOf('<script'), fuente.indexOf('</script>'));
const sinComentarios = (css: string) =>
  css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe.each(VISTAS)('%s', (ruta) => {
  const fuente = leer(ruta);

  it('sin hexadecimales: solo tokens', () => {
    expect(fuente).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it('sin avisos flotantes ni componentes de Quasar nuevos', () => {
    expect(fuente).not.toMatch(/\$q\.notify|useQuasar|Notify\.create/);
    expect(fuente).not.toMatch(/<q-(btn|input|card|select|icon|form|spinner)\b/);
  });

  it('Safari 13.1: sin inset, sin :has() y sin dvh', () => {
    const css = sinComentarios(estilo(fuente));

    expect(css).not.toMatch(/(^|[\s;{])inset:/);
    expect(css).not.toContain(':has(');
    expect(css).not.toContain('dvh');
  });

  it('SSG: el script no toca window, document ni matchMedia', () => {
    expect(script(fuente)).not.toMatch(/\bwindow\.|\bdocument\.|matchMedia/);
  });

  it('los colores salen de los tokens', () => {
    const css = sinComentarios(estilo(fuente));
    const declaraciones = Array.from(
      css.matchAll(
        /(?:^|[;{\s])(color|background|background-color|border|border-top|border-bottom|border-color|border-bottom-color|outline|fill):\s*([^;]+);/g
      )
    );

    expect(declaraciones.length).toBeGreaterThan(0);
    for (const [, propiedad, valor] of declaraciones) {
      expect(`${propiedad}: ${valor.trim()}`).toMatch(
        /var\(--m-[\w-]+\)|:\s*(transparent|none|currentColor|inherit|0)$/
      );
    }
  });

  it('todo <button> declara su tipo', () => {
    const botones = plantilla(fuente).match(/<button\b[^>]*>/g) ?? [];

    for (const boton of botones) {
      expect(boton).toMatch(/\stype="(button|submit)"/);
    }
  });
});

describe.each(LOGICA)('%s', (ruta) => {
  it('sin avisos de Quasar ni ventana', () => {
    const fuente = leer(ruta);

    expect(fuente).not.toMatch(/\$q\b|useQuasar|Notify/);
    expect(fuente).not.toMatch(/\bwindow\.|\bdocument\./);
  });
});

describe('foco visible', () => {
  it.each([
    ['components/resena/ResenaDialog.vue', 'm-tinta'],
    ['components/resena/EstrellasPuntaje.vue', 'm-tinta'],
    ['pages/ErrorNotFound.vue', 'm-hueso'],
  ])('%s dibuja un anillo de 2 px en %s', (ruta, token) => {
    const css = sinComentarios(estilo(leer(ruta)));

    expect(css).toMatch(
      new RegExp(`:focus-visible[^{]*\\{[^}]*outline: 2px solid var\\(--${token}\\);`)
    );
  });
});

describe('el oro claro no es texto sobre claro', () => {
  it.each([
    'components/resena/ResenaDialog.vue',
    'components/resena/EstrellasPuntaje.vue',
    'components/resena/ErrorCampo.vue',
  ])('%s', (ruta) => {
    // La única excepción es el rótulo del botón de tinta maciza al pasar.
    const css = sinComentarios(estilo(leer(ruta))).replace(
      /\.resena__enviar(?::not\(:disabled\))?:hover\s*\{[^}]*\}/g,
      ''
    );

    expect(css).not.toMatch(/(^|[\s;{])color:\s*var\(--m-oro\)\s*;/);
  });
});

describe('área táctil', () => {
  it('la X del diálogo mide 44 × 44', () => {
    const css = sinComentarios(estilo(leer('components/resena/ResenaDialog.vue')));

    expect(css).toMatch(
      /\.resena__cerrar\s*\{[^}]*width: var\(--m-tactil-min\);[^}]*height: var\(--m-tactil-min\);/
    );
  });

  it('el enlace al inicio de la 404 mide al menos 44 de alto', () => {
    const css = sinComentarios(estilo(leer('pages/ErrorNotFound.vue')));

    expect(css).toMatch(/\.pagina-404__inicio\s*\{[^}]*min-height: var\(--m-tactil-min\);/);
  });
});
