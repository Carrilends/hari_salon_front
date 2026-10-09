/**
 * Quasar pone `pointer-events: none` en `.q-dialog__inner` y solo lo devuelve
 * a sus hijos directos que sean `<div>` (`.q-dialog__inner > div`). Un diálogo
 * cuya raíz es un `<article>` o una `<section>` hereda el «none»: se ve, pero
 * cada clic atraviesa el contenido y cae en el velo de detrás. Así quedaron la
 * ficha, la hoja de filtros y los dos diálogos de la dueña, sin que ninguna
 * prueba lo notara: jsdom no calcula `pointer-events`.
 *
 * Esta suite recorre todo `src/`: si la raíz que cuelga de un `<q-dialog>` no
 * es un `<div>` ni un `<q-card>`, su clase raíz tiene que declarar
 * `pointer-events: all`.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC = join(__dirname, '../../src');

const vues = (dir: string): string[] =>
  readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) return vues(ruta);
    return ruta.endsWith('.vue') ? [ruta] : [];
  });

type Raiz = { archivo: string; etiqueta: string; clase: string | null };

/** La primera etiqueta que cuelga de cada `<q-dialog …>` del archivo. */
const raices = (archivo: string, fuente: string): Raiz[] => {
  const encontradas: Raiz[] = [];
  const apertura = /<q-dialog\b[^>]*>/g;
  let m: RegExpExecArray | null;
  while ((m = apertura.exec(fuente))) {
    const resto = fuente.slice(m.index + m[0].length);
    const hija = /<([a-zA-Z][\w-]*)\b([^>]*)>/.exec(resto);
    if (!hija) continue;
    const clase = /\sclass="([^"]+)"/.exec(hija[2]);
    encontradas.push({
      archivo: relative(SRC, archivo),
      etiqueta: hija[1],
      clase: clase ? clase[1].split(/\s+/)[0] : null,
    });
  }
  return encontradas;
};

const RECIBEN_CLICS_SOLAS = new Set(['div', 'q-card', 'template']);

describe('los diálogos reciben los clics', () => {
  const casos = vues(SRC).flatMap((archivo) =>
    raices(archivo, readFileSync(archivo, 'utf8'))
  );

  it('encuentra los diálogos de la remodelación (la búsqueda no está vacía)', () => {
    const archivos = casos.map((c) => c.archivo);
    expect(archivos).toEqual(
      expect.arrayContaining([
        join('components', 'dialogs', 'serviceDialog.vue'),
        join('components', 'dialogs', 'serviceFilterDialog.vue'),
        join('components', 'dialogs', 'ServicePromotionDialog.vue'),
        join('components', 'dialogs', 'ServiceDeleteDialog.vue'),
        join('components', 'shared', 'MenuMasHoja.vue'),
      ])
    );
  });

  it.each(
    vues(SRC)
      .flatMap((archivo) => raices(archivo, readFileSync(archivo, 'utf8')))
      .filter((c) => !RECIBEN_CLICS_SOLAS.has(c.etiqueta))
      .map(
        (c) => [`${c.archivo} <${c.etiqueta} class="${c.clase}">`, c] as const
      )
  )('%s devuelve los clics a su raíz', (_nombre, c) => {
    expect(c.clase).not.toBeNull();
    const fuente = readFileSync(join(SRC, c.archivo), 'utf8');
    const estilo = fuente.slice(fuente.indexOf('<style'));
    const regla = new RegExp(`\\.${c.clase}\\s*\\{[^}]*pointer-events:\\s*all`);
    expect(estilo).toMatch(regla);
  });
});
