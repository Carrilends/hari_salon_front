/**
 * Ruta canónica de una página: con barra final, que es como la sirve Netlify.
 *
 * El generador deja cada página en `<ruta>/index.html`, y Netlify responde a
 * `/services` con un 301 a `/services/` (comprobado al publicar, 2026-11-17).
 * Una canónica sin barra apuntaba a una dirección que redirige. La portada, las
 * rutas que ya terminan en barra, los archivos (`/sitemap.xml`) y las URL con
 * consulta o fragmento se dejan igual.
 *
 * Módulo puro: lo usan `useSeo.ts` y, con la misma regla, el mapa del sitio
 * (`scripts/contenido-seo.mjs`).
 */
export function rutaCanonica(path: string): string {
  if (path === '/' || path.endsWith('/')) return path;
  if (/[?#]/.test(path)) return path;
  const ultimo = path.slice(path.lastIndexOf('/') + 1);
  if (ultimo.includes('.')) return path;
  return `${path}/`;
}
