/**
 * Lo que viaja en `window.__VQ_STATE__` (RF62, NF04): SOLO las consultas que
 * precargó `precargarEnServidor`.
 *
 * Una consulta que no se precarga y que resuelve mientras el render espera a
 * otra se pintó como «cargando» en el HTML. Si viajara, el navegador
 * hidrataría con datos y no casaría; y un `watch` sin `immediate` (el de
 * `useOptions`) no la vería nunca.
 */
import { QueryClient } from '@tanstack/vue-query';
import {
  META_PRECARGADA,
  estadoPrecargado,
} from 'src/composables/shared/precargarEnServidor';

function cliente() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

const claves = (qc: QueryClient) =>
  estadoPrecargado(qc).queries.map((q) => q.queryKey);

describe('estadoPrecargado', () => {
  it('lleva la consulta precargada con sus datos', async () => {
    const qc = cliente();
    await qc.fetchQuery({
      queryKey: ['reviews'],
      queryFn: () => Promise.resolve([{ id: 'r1' }]),
      meta: META_PRECARGADA,
    });

    expect(claves(qc)).toEqual([['reviews']]);
  });

  it('no lleva una consulta resuelta que no se precargó', async () => {
    const qc = cliente();
    await qc.fetchQuery({
      queryKey: ['reviews'],
      queryFn: () => Promise.resolve([{ id: 'r1' }]),
      meta: META_PRECARGADA,
    });
    await qc.fetchQuery({
      queryKey: ['service', ''],
      queryFn: () => Promise.resolve({}),
    });

    expect(claves(qc)).toEqual([['reviews']]);
  });

  it('no lleva una precargada que falló', async () => {
    const qc = cliente();
    await qc
      .fetchQuery({
        queryKey: ['faqs'],
        queryFn: () => Promise.reject(new Error('caída')),
        meta: META_PRECARGADA,
      })
      .catch(() => undefined);

    expect(claves(qc)).toEqual([]);
  });
});
