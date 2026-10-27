/**
 * Contenido de robots.txt y del mapa del sitio, sin tocar el disco.
 *
 * Es un módulo puro (sin `fs` ni `import.meta`) para que Jest lo importe y
 * `generate-sitemap.mjs` lo use de verdad. Las rutas públicas deben coincidir
 * con `ssg.routes` de `quasar.config.js`; una prueba lo vigila.
 */

export const DOMINIO_POR_DEFECTO = 'https://peluqueriamarlene.com';

export const RUTAS_PUBLICAS = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/services', changefreq: 'weekly', priority: '0.9' },
  { path: '/testimonios', changefreq: 'weekly', priority: '0.7' },
  { path: '/preguntas-frecuentes', changefreq: 'monthly', priority: '0.6' },
  { path: '/politica-tratamiento-datos', changefreq: 'yearly', priority: '0.3' },
];

export const RUTAS_PRIVADAS = [
  '/auth/',
  '/mi-cuenta',
  '/mis-empleados',
  '/mis-reservas',
  '/reservas',
];

const sinBarraFinal = (url) => url.replace(/\/+$/, '');

/** Orden: SITE_URL, VITE_SITE_URL, dominio por defecto. */
export function resolverSiteUrl(env = {}) {
  return sinBarraFinal(
    env.SITE_URL || env.VITE_SITE_URL || DOMINIO_POR_DEFECTO,
  );
}

export function construirSitemap(siteUrl, hoy) {
  const base = sinBarraFinal(siteUrl);
  const urls = RUTAS_PUBLICAS.map(
    (ruta) => `  <url>
    <loc>${base}${ruta.path}</loc>
    <lastmod>${hoy}</lastmod>
    <changefreq>${ruta.changefreq}</changefreq>
    <priority>${ruta.priority}</priority>
  </url>`,
  ).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

export function construirRobots(siteUrl) {
  const base = sinBarraFinal(siteUrl);
  return `User-agent: *
Allow: /
${RUTAS_PRIVADAS.map((ruta) => `Disallow: ${ruta}`).join('\n')}

Sitemap: ${base}/sitemap.xml
`;
}
