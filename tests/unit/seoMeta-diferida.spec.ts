/**
 * En el servidor, `useMeta` de Quasar evalúa sus opciones UNA vez, en el
 * `setup`, cuando la precarga aún no ha traído los datos; las lee de verdad
 * después del render (`injectServerMeta`, en `onRendered`). `metaDiferida`
 * entrega un objeto que se lee en ese momento, para que el JSON-LD del
 * catálogo, las reseñas y las preguntas salga con los datos (RF62).
 */
import { ref } from 'vue';
import { buildSeoMeta, metaDiferida } from 'src/composables/seo/seoMeta';

const base = { title: 'T', description: 'D', ogType: 'website', noindex: false };

describe('metaDiferida', () => {
  it('lee la meta en el momento en que se consulta, no al crearse', () => {
    const lista = ref<Record<string, unknown> | undefined>(undefined);
    const diferida = metaDiferida(() => buildSeoMeta({ ...base, jsonLd: lista.value }));

    expect(Object.keys(diferida.script)).toEqual([]);

    lista.value = { '@type': 'ItemList', itemListElement: [{ name: 'Corte' }] };

    expect(diferida.script.ldJson0.innerHTML).toContain('"itemListElement":[{');
    expect(diferida.title).toBe('T');
  });

  it('expone las mismas claves que la meta, para que Quasar las recorra', () => {
    const diferida = metaDiferida(() => buildSeoMeta(base));
    expect(Object.keys(diferida).sort()).toEqual(['link', 'meta', 'script', 'title']);
  });
});
