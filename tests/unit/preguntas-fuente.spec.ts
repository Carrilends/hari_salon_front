/**
 * Contratos de la página de preguntas que no se ven montando: el CSS está
 * mockeado en Jest (`tests/styleMock.js`), así que se leen las fuentes.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = join(__dirname, '../../src');
const leer = (ruta: string) => readFileSync(join(SRC, ruta), 'utf8');

const COMPONENTES = readdirSync(join(SRC, 'components/preguntas'))
  .filter((nombre) => nombre.endsWith('.vue'))
  .map((nombre) => `components/preguntas/${nombre}`);

const ARCHIVOS = ['pages/FaqPage.vue', ...COMPONENTES];

const estilos = (archivo: string) => {
  const fuente = leer(archivo);
  return fuente.slice(fuente.indexOf('<style'));
};

/** El CSS sin comentarios: un hexadecimal citado en un comentario no pinta. */
const sinComentarios = (css: string) =>
  css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('la página de preguntas y sus piezas', () => {
  it('están las cinco piezas', () => {
    expect(COMPONENTES.slice().sort()).toEqual([
      'components/preguntas/AcordeonPreguntas.vue',
      'components/preguntas/AyudaPreguntas.vue',
      'components/preguntas/BorrarPreguntaDialog.vue',
      'components/preguntas/ListaPreguntasDuena.vue',
      'components/preguntas/PreguntaDialog.vue',
    ]);
  });

  it.each(ARCHIVOS)('%s no trae un solo hexadecimal de color', (archivo) => {
    expect(
      sinComentarios(estilos(archivo)).match(/#[0-9a-fA-F]{3,8}\b/g)
    ).toBeNull();
  });

  it.each(ARCHIVOS)(
    '%s no usa los avisos ni los controles de Quasar',
    (archivo) => {
      const fuente = leer(archivo);
      expect(fuente).not.toMatch(/\$q\b|useQuasar/);
      expect(fuente).not.toMatch(
        /<q-(btn|input|card|list|item|expansion-item|scroll-area|skeleton|icon|select|form)\b/
      );
    }
  );

  it.each(ARCHIVOS)(
    '%s respeta Safari 13.1: sin `inset`, sin `:has()`, `100dvh` solo tras `100vh`',
    (archivo) => {
      const css = sinComentarios(estilos(archivo));
      expect(css).not.toMatch(/(^|[\s;{])inset\s*:/);
      expect(css).not.toMatch(/:has\(/);
      expect(css.replace(/height: 100vh;\s*height: 100dvh;/g, '')).not.toMatch(
        /100dvh/
      );
    }
  );

  it.each(ARCHIVOS)('%s dibuja el foco de teclado', (archivo) => {
    expect(estilos(archivo)).toMatch(
      /:focus-visible\s*\{[^}]*outline: 2px solid var\(--m-(tinta|hueso)\);[^}]*outline-offset: 2px;/
    );
  });

  /** Foco de revisión, extra: con el dedo en el asa, el gesto es nuestro. */
  it('el asa no deja que el navegador desplace la página al arrastrar', () => {
    const css = sinComentarios(
      estilos('components/preguntas/ListaPreguntasDuena.vue')
    );
    const asa = css.match(/\.fila__asa\s*\{([^}]*)\}/)?.[1] ?? '';

    expect(asa).toMatch(/touch-action: none;/);
  });

  it('el botón que borra va en --m-peligro con su texto', () => {
    const css = sinComentarios(
      estilos('components/preguntas/BorrarPreguntaDialog.vue')
    );
    const peligro =
      css.match(/\.borrar-pregunta__boton--peligro\s*\{([^}]*)\}/)?.[1] ?? '';

    expect(peligro).toMatch(/background: var\(--m-peligro\);/);
    expect(peligro).toMatch(/color: var\(--m-peligro-texto\);/);
  });

  it('el texto sobre el verde de WhatsApp va oscuro', () => {
    const css = sinComentarios(
      estilos('components/preguntas/AyudaPreguntas.vue')
    );
    const verde = css.match(/\.ayuda__whatsapp\s*\{([^}]*)\}/)?.[1] ?? '';

    expect(verde).toMatch(/color: var\(--m-whatsapp-texto\);/);
  });

  it('las dos columnas se hacen con CSS, sin consultar la ventana en la página', () => {
    const fuente = leer('pages/FaqPage.vue');

    expect(fuente).not.toMatch(/matchMedia|window\./);
    expect(sinComentarios(estilos('pages/FaqPage.vue'))).toMatch(
      /grid-template-areas:\s*'cabeza lista'\s*'ayuda lista';/
    );
  });

  it('useFaqs no habla HTTP: todo pasa por faqs-api', () => {
    expect(leer('composables/faqs/useFaqs.ts')).not.toMatch(
      /services-api|adminServiceApi|servicesApi/
    );
  });
});
