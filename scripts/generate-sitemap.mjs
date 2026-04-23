#!/usr/bin/env node
/**
 * Genera public/sitemap.xml a partir de la lista PUBLIC_ROUTES.
 * Mantenelo sincronizado con src/router/routes.ts.
 *
 * Variables de entorno:
 *   SITE_URL  -> dominio absoluto (ej: https://peluqueria-marlene-pecas.netlify.app)
 *
 * Uso: node scripts/generate-sitemap.mjs
 */

import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SITE_URL = (process.env.SITE_URL || process.env.VITE_SITE_URL || 'https://peluqueria-marlene-pecas.netlify.app')
  .replace(/\/$/, '');

const PUBLIC_ROUTES = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/services', changefreq: 'weekly', priority: '0.9' },
  { path: '/testimonios', changefreq: 'weekly', priority: '0.7' },
  { path: '/preguntas-frecuentes', changefreq: 'monthly', priority: '0.6' },
];

const today = new Date().toISOString().split('T')[0];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${PUBLIC_ROUTES.map(
  (route) => `  <url>
    <loc>${SITE_URL}${route.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`,
).join('\n')}
</urlset>
`;

const outPath = resolve(__dirname, '..', 'public', 'sitemap.xml');
writeFileSync(outPath, xml, 'utf8');

console.log(`[sitemap] generado en ${outPath} con dominio ${SITE_URL}`);

if (!process.env.SITE_URL && !process.env.VITE_SITE_URL) {
  console.warn(
    '[sitemap] WARN: ni SITE_URL ni VITE_SITE_URL están definidas; se usó el dominio por defecto. Definilas antes del build para que el sitemap apunte al dominio final.',
  );
}
