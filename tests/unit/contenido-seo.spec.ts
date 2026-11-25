/**
 * Contenido de robots.txt y del mapa del sitio (RF62, RF64). Se importa el
 * módulo puro que el script usa de verdad, no una copia.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  RUTAS_PRIVADAS,
  RUTAS_PUBLICAS,
  construirRobots,
  construirSitemap,
  resolverSiteUrl,
} from '../../scripts/contenido-seo.mjs';

const DOMINIO = 'https://ejemplo.test';

describe('contenido SEO', () => {
  it('el mapa del sitio lista las páginas públicas con el dominio dado', () => {
    const xml = construirSitemap(DOMINIO, '2026-01-02');
    for (const ruta of RUTAS_PUBLICAS) {
      const servida = ruta.path === '/' ? '/' : `${ruta.path}/`;
      expect(xml).toContain(`<loc>${DOMINIO}${servida}</loc>`);
    }
    expect(xml).toContain(`<loc>${DOMINIO}/politica-tratamiento-datos/</loc>`);
    expect(xml).toContain('<lastmod>2026-01-02</lastmod>');
    expect(xml).not.toContain('netlify');
  });

  it('las páginas del mapa son las que se pregeneran', () => {
    const config = readFileSync(
      join(__dirname, '../../quasar.config.js'),
      'utf8'
    );
    const bloque = config.slice(config.indexOf('routes: ['));
    const pregeneradas = [
      ...bloque.slice(0, bloque.indexOf(']')).matchAll(/'(\/[^']*)'/g),
    ].map((m) => m[1]);
    expect(RUTAS_PUBLICAS.map((r: { path: string }) => r.path).sort()).toEqual(
      pregeneradas.sort()
    );
  });

  it('robots.txt señala el mapa del dominio dado y permite el rastreo', () => {
    const robots = construirRobots(DOMINIO);
    expect(robots).toContain('User-agent: *');
    expect(robots).toContain('Allow: /');
    expect(robots).toContain(`Sitemap: ${DOMINIO}/sitemap.xml`);
  });

  it('robots.txt bloquea las rutas privadas reales y ninguna inventada', () => {
    const robots = construirRobots(DOMINIO);
    for (const ruta of RUTAS_PRIVADAS) {
      expect(robots).toContain(`Disallow: ${ruta}`);
    }
    expect(robots).toContain('Disallow: /auth/');
    expect(robots).not.toMatch(/Disallow: \/login/);
    expect(robots).not.toMatch(/Disallow: \/register/);
  });

  it('quita la barra final del dominio', () => {
    expect(resolverSiteUrl({ SITE_URL: 'https://a.test/' })).toBe(
      'https://a.test'
    );
    expect(construirRobots('https://a.test/')).toContain(
      'Sitemap: https://a.test/sitemap.xml'
    );
  });

  it('respeta el orden SITE_URL, VITE_SITE_URL', () => {
    expect(
      resolverSiteUrl({ SITE_URL: 'https://a.test', VITE_SITE_URL: 'https://b.test' })
    ).toBe('https://a.test');
    expect(resolverSiteUrl({ VITE_SITE_URL: 'https://b.test' })).toBe(
      'https://b.test'
    );
  });

  it('sin dominio, usa peluqueriamarlene.com y no el provisional', () => {
    const url = resolverSiteUrl({});
    expect(url).toBe('https://peluqueriamarlene.com');
    expect(url).not.toContain('pecas');
  });
});
