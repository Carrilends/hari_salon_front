/**
 * Con la lista vacía no se publica un bloque JSON-LD vacío (RF62): un
 * `"itemListElement":[]` o un `"mainEntity":[]` le dice al buscador que la
 * página no tiene nada, y eso es mentira en cuanto la API responde.
 */
import {
  faqPageSchema,
  reviewsSchema,
  servicesSchema,
} from 'src/composables/seo/structuredData';

describe('JSON-LD con la lista vacía', () => {
  it('el catálogo vacío no emite el ItemList', () => {
    expect(servicesSchema([])).toBeUndefined();
  });

  it('las preguntas vacías no emiten el FAQPage', () => {
    expect(faqPageSchema([])).toBeUndefined();
  });

  it('sin reseñas no se emite el bloque de reseñas', () => {
    expect(reviewsSchema([])).toBeUndefined();
  });

  it('con datos, los tres siguen emitiéndose', () => {
    expect(servicesSchema([{ name: 'Corte' }])).toMatchObject({ '@type': 'ItemList' });
    expect(faqPageSchema([{ question: '¿Q?', answer: 'R.' }])).toMatchObject({
      '@type': 'FAQPage',
    });
    expect(reviewsSchema([{ author: 'A', body: 'B', rating: 5 }])).toMatchObject({
      '@type': 'HairSalon',
    });
  });
});
