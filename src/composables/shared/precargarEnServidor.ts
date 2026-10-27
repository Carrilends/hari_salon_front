import { onServerPrefetch } from 'vue';
import { EN_SERVIDOR } from './en-servidor';

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
