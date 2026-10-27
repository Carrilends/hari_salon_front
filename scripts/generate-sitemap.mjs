#!/usr/bin/env node
/**
 * Genera public/sitemap.xml y public/robots.txt con el dominio del sitio.
 * El contenido vive en scripts/contenido-seo.mjs (módulo puro con prueba).
 *
 * Variables de entorno:
 *   SITE_URL  -> dominio absoluto (ej: https://peluqueriamarlene.com)
 *
 * OJO: este script corre en Node puro, fuera de Vite, asi que NO lee el archivo
 * .env. Si no exportas SITE_URL (o VITE_SITE_URL) en el entorno, se usa
 * https://peluqueriamarlene.com. En Netlify basta con definir la variable.
 *
 * Uso: node scripts/generate-sitemap.mjs
 */

import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  construirRobots,
  construirSitemap,
  resolverSiteUrl,
} from './contenido-seo.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publico = resolve(__dirname, '..', 'public');

const siteUrl = resolverSiteUrl(process.env);
const hoy = new Date().toISOString().split('T')[0];

writeFileSync(resolve(publico, 'sitemap.xml'), construirSitemap(siteUrl, hoy), 'utf8');
writeFileSync(resolve(publico, 'robots.txt'), construirRobots(siteUrl), 'utf8');

console.log(`[sitemap] sitemap.xml y robots.txt generados en ${publico} con dominio ${siteUrl}`);

if (!process.env.SITE_URL && !process.env.VITE_SITE_URL) {
  console.warn(
    '[sitemap] WARN: ni SITE_URL ni VITE_SITE_URL están definidas; se usó el dominio por defecto.',
  );
}
