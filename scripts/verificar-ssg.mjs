#!/usr/bin/env node
/**
 * Comprueba que `yarn build:ssg` generó las páginas públicas con sus datos
 * (RF62, NF04): catálogo, preguntas y reseñas pintados, JSON-LD no vacío y el
 * estado de Vue Query (`window.__VQ_STATE__`) para hidratar sin desajustes.
 *
 * Corre al final de `build:ssg`. Si algo falta, sale con código 1 y la
 * compilación no se da por buena: unas páginas vacías no se publican.
 *
 * Uso: node scripts/verificar-ssg.mjs [carpeta]   (por defecto, dist/ssg)
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PAGINAS, verificarPaginas } from './reglas-ssg.mjs';

const raiz = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  process.argv[2] ?? 'dist/ssg'
);

const paginas = {};
const errores = [];
for (const [nombre, ruta] of Object.entries(PAGINAS)) {
  try {
    paginas[nombre] = readFileSync(resolve(raiz, ruta), 'utf8');
  } catch {
    errores.push(`${nombre}: no existe ${ruta} en ${raiz}.`);
    paginas[nombre] = '';
  }
}

errores.push(...verificarPaginas(paginas));

if (errores.length) {
  console.error('[verificar-ssg] Las páginas generadas no traen sus datos:');
  for (const error of errores) console.error(`  - ${error}`);
  process.exit(1);
}

console.log(
  `[verificar-ssg] ${Object.keys(PAGINAS).length} páginas con sus datos en ${raiz}.`
);
