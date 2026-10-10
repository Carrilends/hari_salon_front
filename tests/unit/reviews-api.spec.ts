/**
 * El envío de una reseña salía de `MainLayout.vue` con un `post` en línea. Ahora
 * es una función de la capa de API, como el resto de recursos, y la clave de la
 * lista de reseñas vive en el registro de claves para poder invalidarla.
 */
jest.mock('src/api/services-api', () => ({
  servicesApi: { get: jest.fn() },
  adminServiceApi: { post: jest.fn() },
}));

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { crearResena } from 'src/api/reviews-api';
import { adminServiceApi } from 'src/api/services-api';
import { queryKeys } from 'src/api/query-keys';

const post = adminServiceApi.post as jest.Mock;
const CUERPO = { name: 'Laura', description: 'Muy bien todo', score: 5 };

describe('API de reseñas', () => {
  beforeEach(() => post.mockReset());

  it('crearResena hace POST /reviews por la instancia con sesión y devuelve la creada', async () => {
    post.mockResolvedValue({
      data: {
        ...CUERPO,
        id: 'r1',
        createdAt: '2026-10-09T00:00:00.000Z',
        userId: 'u1',
      },
    });

    const creada = await crearResena(CUERPO);

    expect(post).toHaveBeenCalledWith('/reviews', CUERPO);
    expect(creada.id).toBe('r1');
  });

  it('el error llega intacto a quien llama', async () => {
    post.mockRejectedValue(new Error('caída'));

    await expect(crearResena(CUERPO)).rejects.toThrow('caída');
  });
});

describe('la clave de la lista de reseñas', () => {
  it('es la raíz que ya usaba la lista', () => {
    expect(queryKeys.reviews.all).toEqual(['reviews']);
  });

  it('useReviews la toma del registro, no de un literal', () => {
    const fuente = readFileSync(
      join(__dirname, '../../src/composables/reviews/useReviews.ts'),
      'utf8'
    );

    expect(fuente).toContain('queryKey: queryKeys.reviews.all');
    expect(fuente).not.toContain("queryKey: ['reviews']");
  });
});
