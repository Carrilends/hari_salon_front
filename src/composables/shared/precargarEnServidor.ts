import { onServerPrefetch } from 'vue';
import {
  dehydrate,
  type DehydratedState,
  type Query,
  type QueryClient,
} from '@tanstack/vue-query';
import { EN_SERVIDOR } from './en-servidor';

/**
 * La marca (`meta` de `useQuery`) de las consultas que se precargan. Solo esas
 * viajan en `window.__VQ_STATE__` (`estadoPrecargado`); quien llame a
 * `precargarEnServidor` la pone en su consulta.
 */
export const META_PRECARGADA = { precargada: true } as const;

/**
 * La caché que viaja en el HTML: las consultas precargadas que resolvieron.
 *
 * Ninguna otra. Una consulta sin precarga que resuelva mientras el render
 * espera a otra se pintó «cargando» en el HTML: si viajara, el navegador
 * hidrataría con datos (desajuste), y un `watch` sin `immediate` no se
 * enteraría nunca de esos datos.
 */
export function estadoPrecargado(queryClient: QueryClient): DehydratedState {
  return dehydrate(queryClient, {
    shouldDehydrateQuery: (query: Query) =>
      query.state.status === 'success' && query.meta?.precargada === true,
  });
}

/** Lo que devuelve el `suspense()` de un `useQuery`, en lo que importa aquí. */
interface ResultadoConsulta<T> {
  data: T | undefined;
  error: unknown;
}

/**
 * Las páginas públicas se generan con sus datos (RF62, NF04): en el servidor,
 * el componente espera a su consulta (`onServerPrefetch`) antes de pintarse, y
 * la caché de Vue Query viaja en el HTML (`src/boot/main.ts`) para que el
 * navegador hidrate con los mismos datos.
 *
 * - Si la API falla, la precarga falla y con ella `quasar ssg generate`: unas
 *   páginas vacías no se publican.
 * - `alResolver` recibe los datos ya resueltos. Hace falta porque en el
 *   servidor un `watch` solo corre una vez, al crearse (Vue no lo vuelve a
 *   disparar durante el render): quien copie los datos a otro sitio, como
 *   `useServices` al store, lo hace aquí.
 *
 * La consulta tiene que llevar `meta: META_PRECARGADA`, o no viaja al HTML.
 *
 * En el navegador no hace nada.
 */
export function precargarEnServidor<T>(
  suspense: () => Promise<ResultadoConsulta<T>>,
  alResolver?: (data: T | undefined) => void
): void {
  if (!EN_SERVIDOR) return;
  onServerPrefetch(async () => {
    const { data, error } = await suspense();
    if (error) throw error;
    alResolver?.(data);
  });
}
