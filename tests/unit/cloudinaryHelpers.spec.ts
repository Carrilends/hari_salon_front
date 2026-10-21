import { prepareImagesForUpload } from 'src/helpers/cloudinaryHelpers';

jest.mock('src/api/cloudinary-api', () => {
  return {
    cloudinaryUploadUrl: (cloudName: string) => `https://cloudinary.test/${cloudName}`,
  };
});

// La firma se pide por el cliente autenticado (adminServiceApi), no por el
// público: el endpoint /cloudinary/sign exige rol admin (M6).
jest.mock('src/api/services-api', () => {
  return {
    adminServiceApi: { post: jest.fn() },
  };
});

describe('cloudinaryHelpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('prepareImagesForUpload firma una vez por el cliente autenticado y no sortea la principal', async () => {
    const { adminServiceApi } = require('src/api/services-api');
    adminServiceApi.post.mockResolvedValueOnce({
      data: {
        signature: 'sig',
        timestamp: '1',
        cloudName: 'demo',
        api_key: 'key',
        folder: 'f',
      },
    });

    const g = globalThis as typeof globalThis & { fetch?: typeof fetch };
    const originalFetch = g.fetch;
    const fetchMock = jest.fn(async () => {
      const responseLike: Pick<Response, 'ok' | 'json'> = {
        ok: true,
        json: async () => ({
          secure_url: 'https://img.test/x',
          public_id: 'pid',
          version: 'v1',
        }),
      };
      return responseLike as unknown as Response;
    });
    g.fetch = fetchMock as unknown as typeof fetch;

    // La principal la decide el servidor (conserva la que había o la primera);
    // antes se sorteaba aquí y la foto del catálogo cambiaba sola.
    const azar = jest.spyOn(Math, 'random');

    const f1 = new File(['a'], 'a.png', { type: 'image/png' });
    const f2 = new File(['b'], 'b.png', { type: 'image/png' });

    const res = await prepareImagesForUpload([f1, f2]);

    expect(adminServiceApi.post).toHaveBeenCalledWith('/cloudinary/sign');
    expect(res).toHaveLength(2);
    expect(res.map((x) => x.isPrincipal)).toEqual([false, false]);
    expect(azar).not.toHaveBeenCalled();

    g.fetch = originalFetch;
    jest.restoreAllMocks();
  });
});

