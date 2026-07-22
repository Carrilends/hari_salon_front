/**
 * El HTML prerenderizado por SSG solo incluye lo que el plugin `Meta` de Quasar
 * deposita en `ssrContext._meta.headTags`. `buildSeoMeta` traduce las opciones
 * de `useSeo` a esa forma; si deja de emitir canonical, Open Graph o JSON-LD,
 * el sitio vuelve a publicarse sin datos estructurados.
 */
import { buildSeoMeta } from 'src/composables/seo/seoMeta';

const base = {
  title: 'Peluquería Marlene | Reserva tu cita',
  description: 'Peluquería en Sopó, Cundinamarca.',
  ogType: 'website',
  noindex: false,
};

describe('buildSeoMeta', () => {
  it('emite el título y la descripción', () => {
    const meta = buildSeoMeta(base);

    expect(meta.title).toBe('Peluquería Marlene | Reserva tu cita');
    expect(meta.meta.description).toEqual({
      name: 'description',
      content: 'Peluquería en Sopó, Cundinamarca.',
    });
  });

  it('emite las etiquetas Open Graph y Twitter', () => {
    const meta = buildSeoMeta(base);

    expect(meta.meta.ogTitle).toMatchObject({ property: 'og:title' });
    expect(meta.meta.ogDescription).toMatchObject({ property: 'og:description' });
    expect(meta.meta.ogType).toMatchObject({ property: 'og:type', content: 'website' });
    expect(meta.meta.ogSiteName).toMatchObject({
      property: 'og:site_name',
      content: 'Peluquería Marlene',
    });
    expect(meta.meta.twitterCard).toMatchObject({
      name: 'twitter:card',
      content: 'summary_large_image',
    });
  });

  it('añade el canonical y og:url solo cuando hay URL absoluta', () => {
    const sin = buildSeoMeta(base);
    expect(sin.link.canonical).toBeUndefined();
    expect(sin.meta.ogUrl).toBeUndefined();

    const con = buildSeoMeta({ ...base, canonical: 'https://ejemplo.test/services' });
    expect(con.link.canonical).toEqual({
      rel: 'canonical',
      href: 'https://ejemplo.test/services',
    });
    expect(con.meta.ogUrl).toMatchObject({
      property: 'og:url',
      content: 'https://ejemplo.test/services',
    });
  });

  it('marca robots según noindex', () => {
    expect(buildSeoMeta(base).meta.robots).toMatchObject({
      name: 'robots',
      content: 'index, follow',
    });
    expect(buildSeoMeta({ ...base, noindex: true }).meta.robots).toMatchObject({
      name: 'robots',
      content: 'noindex, nofollow',
    });
  });

  it('serializa un objeto JSON-LD como script application/ld+json', () => {
    const meta = buildSeoMeta({
      ...base,
      jsonLd: { '@type': 'HairSalon', name: 'Peluquería Marlene' },
    });

    const scripts = Object.values(meta.script);
    expect(scripts).toHaveLength(1);
    expect(scripts[0]).toMatchObject({ type: 'application/ld+json' });
    expect(scripts[0].innerHTML).toContain('"HairSalon"');
    expect(scripts[0].innerHTML).toContain('Peluquería Marlene');
  });

  it('serializa varios objetos JSON-LD con claves distintas', () => {
    const meta = buildSeoMeta({
      ...base,
      jsonLd: [{ '@type': 'HairSalon' }, { '@type': 'FAQPage' }],
    });

    const keys = Object.keys(meta.script);
    expect(keys).toHaveLength(2);
    expect(new Set(keys).size).toBe(2);
    expect(JSON.stringify(meta.script)).toContain('FAQPage');
  });

  it('no emite bloque de scripts cuando no hay datos estructurados', () => {
    expect(Object.keys(buildSeoMeta(base).script)).toHaveLength(0);
  });
});
