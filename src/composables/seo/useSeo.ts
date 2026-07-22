import { computed, unref, type MaybeRef } from 'vue';
import { useMeta } from 'quasar';
import { SITE_URL } from './site-url';
import { buildSeoMeta } from './seoMeta';

export interface SeoOptions {
  title: MaybeRef<string>;
  description: MaybeRef<string>;
  /**
   * Path relativo al sitio, por ejemplo '/services'. Se concatena con
   * VITE_SITE_URL para construir la URL canónica y las URLs Open Graph.
   * Si no se pasa, se omite el canonical (útil para 404).
   */
  path?: MaybeRef<string | undefined>;
  /** Imagen Open Graph. Puede ser ruta absoluta o relativa al dominio. */
  image?: MaybeRef<string | undefined>;
  /** Tipo Open Graph; default 'website'. */
  ogType?: MaybeRef<string>;
  /** Si true, agrega noindex/nofollow (útil para páginas privadas o 404). */
  noindex?: MaybeRef<boolean>;
  /** Datos estructurados JSON-LD (uno o varios objetos schema.org). */
  jsonLd?: MaybeRef<Record<string, unknown> | Record<string, unknown>[] | undefined>;
}

const DEFAULT_OG_IMAGE = '/icons/favicon-128x128.png';

function absoluteUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (/^https?:\/\//i.test(value)) return value;
  if (!SITE_URL) return value;
  return `${SITE_URL}${value.startsWith('/') ? '' : '/'}${value}`;
}

/**
 * Publica título, descripción, Open Graph, canonical y JSON-LD de la página.
 *
 * Usa el plugin `Meta` de Quasar (activado en `quasar.config.js`) en lugar de un
 * gestor de `<head>` externo: es el único mecanismo que el generador SSG inyecta
 * en el HTML prerenderizado, que es lo que leen los rastreadores. La
 * construcción del objeto vive en `seoMeta.ts` y está cubierta por pruebas.
 */
export function useSeo(options: SeoOptions) {
  const meta = computed(() => {
    const path = unref(options.path);

    return buildSeoMeta({
      title: unref(options.title),
      description: unref(options.description),
      canonical: path && SITE_URL ? absoluteUrl(path) : undefined,
      ogImage: absoluteUrl(unref(options.image) || DEFAULT_OG_IMAGE),
      ogType: unref(options.ogType) || 'website',
      noindex: Boolean(unref(options.noindex)),
      jsonLd: unref(options.jsonLd),
    });
  });

  useMeta(() => meta.value);
}
