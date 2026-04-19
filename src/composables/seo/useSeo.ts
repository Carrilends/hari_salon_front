import { computed, unref, type MaybeRef } from 'vue';
import { useHead } from '@vueuse/head';

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

const SITE_URL = (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, '') || '';
const SITE_NAME = 'Peluquería Pecas';
const DEFAULT_OG_IMAGE = '/icons/favicon-128x128.png';

function absoluteUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (/^https?:\/\//i.test(value)) return value;
  if (!SITE_URL) return value;
  return `${SITE_URL}${value.startsWith('/') ? '' : '/'}${value}`;
}

export function useSeo(options: SeoOptions) {
  const title = computed(() => unref(options.title));
  const description = computed(() => unref(options.description));
  const path = computed(() => unref(options.path));
  const image = computed(() => unref(options.image) || DEFAULT_OG_IMAGE);
  const ogType = computed(() => unref(options.ogType) || 'website');
  const noindex = computed(() => Boolean(unref(options.noindex)));
  const jsonLd = computed(() => unref(options.jsonLd));

  const canonical = computed(() => {
    const p = path.value;
    if (!p || !SITE_URL) return undefined;
    return `${SITE_URL}${p.startsWith('/') ? '' : '/'}${p}`;
  });

  const ogImage = computed(() => absoluteUrl(image.value));

  useHead({
    title,
    meta: computed(() => {
      const items: Array<Record<string, string>> = [
        { name: 'description', content: description.value },
        { property: 'og:site_name', content: SITE_NAME },
        { property: 'og:title', content: title.value },
        { property: 'og:description', content: description.value },
        { property: 'og:type', content: ogType.value },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: title.value },
        { name: 'twitter:description', content: description.value },
      ];

      if (canonical.value) {
        items.push({ property: 'og:url', content: canonical.value });
      }
      if (ogImage.value) {
        items.push({ property: 'og:image', content: ogImage.value });
        items.push({ name: 'twitter:image', content: ogImage.value });
      }
      if (noindex.value) {
        items.push({ name: 'robots', content: 'noindex, nofollow' });
      } else {
        items.push({ name: 'robots', content: 'index, follow' });
      }

      return items;
    }),
    link: computed(() => {
      const links: Array<Record<string, string>> = [];
      if (canonical.value) {
        links.push({ rel: 'canonical', href: canonical.value });
      }
      return links;
    }),
    script: computed(() => {
      const data = jsonLd.value;
      if (!data) return [];
      const payload = Array.isArray(data) ? data : [data];
      return payload.map((entry) => ({
        type: 'application/ld+json',
        children: JSON.stringify(entry),
      }));
    }),
  });
}
