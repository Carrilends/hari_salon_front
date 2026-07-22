/**
 * Traduce las opciones de `useSeo` a la forma que espera el plugin `Meta` de
 * Quasar (`quasar.config.js` → `framework.plugins`).
 *
 * Por qué importa: el generador SSG solo escribe en el HTML estático lo que el
 * plugin `Meta` deposita en `ssrContext._meta.headTags`. Un gestor de `<head>`
 * externo aplica las etiquetas en el navegador tras la hidratación, pero los
 * rastreadores que leen el HTML prerenderizado no verían nada. Por eso el SEO
 * de este proyecto pasa obligatoriamente por aquí.
 *
 * Se mantiene como función pura (sin `useMeta`) para poder verificarla en
 * pruebas unitarias sin montar la aplicación.
 */
import { SALON_NAME } from 'src/constants/salon-location';

export interface ResolvedSeo {
  title: string;
  description: string;
  /** URL absoluta de la página; si falta se omiten canonical y `og:url`. */
  canonical?: string;
  /** URL absoluta de la imagen Open Graph. */
  ogImage?: string;
  ogType: string;
  noindex: boolean;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

type MetaTag = Record<string, string>;
type ScriptTag = { type: string; innerHTML: string };

export interface QuasarSeoMeta {
  title: string;
  meta: Record<string, MetaTag>;
  link: Record<string, MetaTag>;
  script: Record<string, ScriptTag>;
}

/**
 * Serializa JSON-LD neutralizando `<` para que un valor de datos no pueda
 * cerrar la etiqueta `<script>` que lo contiene.
 */
function serializeJsonLd(entry: Record<string, unknown>): string {
  return JSON.stringify(entry).replace(/</g, '\\u003c');
}

export function buildSeoMeta(seo: ResolvedSeo): QuasarSeoMeta {
  const meta: Record<string, MetaTag> = {
    description: { name: 'description', content: seo.description },
    ogSiteName: { property: 'og:site_name', content: SALON_NAME },
    ogTitle: { property: 'og:title', content: seo.title },
    ogDescription: { property: 'og:description', content: seo.description },
    ogType: { property: 'og:type', content: seo.ogType },
    twitterCard: { name: 'twitter:card', content: 'summary_large_image' },
    twitterTitle: { name: 'twitter:title', content: seo.title },
    twitterDescription: { name: 'twitter:description', content: seo.description },
    robots: {
      name: 'robots',
      content: seo.noindex ? 'noindex, nofollow' : 'index, follow',
    },
  };

  const link: Record<string, MetaTag> = {};

  if (seo.canonical) {
    link.canonical = { rel: 'canonical', href: seo.canonical };
    meta.ogUrl = { property: 'og:url', content: seo.canonical };
  }

  if (seo.ogImage) {
    meta.ogImage = { property: 'og:image', content: seo.ogImage };
    meta.twitterImage = { name: 'twitter:image', content: seo.ogImage };
  }

  const script: Record<string, ScriptTag> = {};
  const entries = seo.jsonLd
    ? Array.isArray(seo.jsonLd)
      ? seo.jsonLd
      : [seo.jsonLd]
    : [];

  entries.forEach((entry, index) => {
    script[`ldJson${index}`] = {
      type: 'application/ld+json',
      innerHTML: serializeJsonLd(entry),
    };
  });

  return { title: seo.title, meta, link, script };
}
