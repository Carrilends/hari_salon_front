/**
 * Netlify sirve cada página generada desde `<ruta>/index.html` y redirige
 * `/services` a `/services/` (301, comprobado al publicar el 2026-11-17).
 * La canónica y el mapa del sitio tienen que apuntar a la dirección que se
 * sirve, no a la que redirige.
 */
import { rutaCanonica } from 'src/composables/seo/ruta-canonica';
import { construirSitemap, RUTAS_PUBLICAS } from '../../scripts/contenido-seo.mjs';

describe('rutaCanonica', () => {
  it('añade la barra final a una ruta de página', () => {
    expect(rutaCanonica('/services')).toBe('/services/');
    expect(rutaCanonica('/preguntas-frecuentes')).toBe('/preguntas-frecuentes/');
  });

  it('deja igual la portada y la ruta que ya la tiene', () => {
    expect(rutaCanonica('/')).toBe('/');
    expect(rutaCanonica('/testimonios/')).toBe('/testimonios/');
  });

  it('no toca un archivo ni una URL con consulta o fragmento', () => {
    expect(rutaCanonica('/sitemap.xml')).toBe('/sitemap.xml');
    expect(rutaCanonica('/services?page=2')).toBe('/services?page=2');
    expect(rutaCanonica('/services#top')).toBe('/services#top');
  });
});

describe('mapa del sitio con la barra final que sirve Netlify', () => {
  it('cada <loc> es la ruta canónica', () => {
    const xml = construirSitemap('https://ejemplo.test', '2026-11-24');
    for (const ruta of RUTAS_PUBLICAS) {
      expect(xml).toContain(`<loc>https://ejemplo.test${rutaCanonica(ruta.path)}</loc>`);
    }
    expect(xml).not.toContain('<loc>https://ejemplo.test/services</loc>');
  });
});
