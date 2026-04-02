import { createServiceHelper, updateServiceHelper } from 'src/helpers/service.helpers';
import type { ServiceFormData } from 'src/composables/services/useServiceCreateEdit';
import { adminServiceApi } from 'src/api/services-api';
import type { QVueGlobals } from 'quasar';

jest.mock('src/api/services-api', () => {
  const post = jest.fn();
  const patch = jest.fn();
  const get = jest.fn();
  return {
    adminServiceApi: { post, patch, get },
    servicesApi: { post: jest.fn(), patch: jest.fn(), get: jest.fn() },
  };
});

describe('service.helpers', () => {
  const q = ({ notify: jest.fn() } satisfies Partial<QVueGlobals>) as unknown as QVueGlobals;
  const data: ServiceFormData = {
    name: 'Service',
    detail: { description: 'Desc', specifications: { df: '' } },
    price: 10_000,
    images: [],
    tags: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('createServiceHelper posts and notifies positive', async () => {
    (adminServiceApi.post as unknown as jest.Mock).mockResolvedValueOnce({ data: {} });
    await createServiceHelper(data, q);
    expect(adminServiceApi.post).toHaveBeenCalledWith('/service', data);
    expect(q.notify).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'positive' })
    );
  });

  test('createServiceHelper notifies negative and rethrows on error', async () => {
    (adminServiceApi.post as unknown as jest.Mock).mockRejectedValueOnce(new Error('fail'));
    await expect(createServiceHelper(data, q)).rejects.toThrow('fail');
    expect(q.notify).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'negative' })
    );
  });

  test('updateServiceHelper patches and notifies positive', async () => {
    (adminServiceApi.patch as unknown as jest.Mock).mockResolvedValueOnce({ data: {} });
    await updateServiceHelper(data, 'id1', q);
    expect(adminServiceApi.patch).toHaveBeenCalledWith('/service/id1', data);
    expect(q.notify).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'positive' })
    );
  });
});

