import { boot } from 'quasar/wrappers'
import {
  QueryClient,
  VueQueryPlugin,
  dehydrate,
  hydrate,
  type DehydratedState,
} from '@tanstack/vue-query';
import { activarActiveTactil } from 'src/helpers/activar-active-tactil';

declare global {
  interface Window {
    __VQ_STATE__?: DehydratedState;
  }
}

/**
 * Lo que este boot usa del `ssrContext` de `quasar-app-extension-ssg`
 * (`ssg-create-render-fn.js`): `onRendered` corre tras `renderToString`, y lo
 * que se añade a `_meta.headTags` sale en el `<head>` del HTML generado. Los
 * tipos de Quasar no declaran `_meta`.
 */
interface ContextoDeRender {
  nonce?: string;
  onRendered: (fn: () => void) => void;
  _meta: { headTags: string };
}

/**
 * El estado de Vue Query como `<script>` en línea. `<` se neutraliza para que
 * un dato (una reseña, una pregunta) no pueda cerrar la etiqueta.
 */
function guionDelEstado(estado: DehydratedState, nonce?: string): string {
  const json = JSON.stringify(estado).replace(/</g, '\\u003c');
  const atributo = nonce ? ` nonce="${nonce}"` : '';
  return `<script${atributo}>window.__VQ_STATE__=${json};document.currentScript.remove()</script>`;
}

/**
 * Las páginas públicas se generan con sus datos (RF62, NF04).
 *
 * - Un `QueryClient` por página: este boot corre una vez por cada render de
 *   `quasar ssg generate`, así que ninguna página hereda la caché de otra.
 * - En el servidor, los composables esperan a su consulta con
 *   `onServerPrefetch` (`precargarEnServidor`), y al terminar el render la
 *   caché se escribe en el HTML como `window.__VQ_STATE__`. Va por su propio
 *   canal, no por el estado de Pinia (`__INITIAL_STATE__`): los datos del
 *   servidor son de Vue Query.
 * - En el navegador, `hydrate` la recoge antes de montar: la hidratación pinta
 *   lo mismo que el HTML y no hay desajuste. Como la página se generó hace
 *   más de `staleTime`, Vue Query la refresca en segundo plano al montar.
 */
export default boot(({ app, ssrContext }) => {
  // iOS Safari no pinta `:active` en un toque sin un oyente de `touchstart`:
  // sin esto, el hundido de los botones no se ve en un iPhone. No-op en SSG.
  activarActiveTactil();

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        // En el servidor no se reintenta: si la API falla, la generación falla
        // ya, en vez de esperar tres reintentos para publicar lo mismo.
        ...(import.meta.env.SSR ? { retry: false } : {}),
      },
    },
  });

  if (import.meta.env.SSR) {
    const contexto = ssrContext as unknown as ContextoDeRender;
    contexto.onRendered(() => {
      contexto._meta.headTags += guionDelEstado(
        dehydrate(queryClient),
        contexto.nonce
      );
    });
  } else if (window.__VQ_STATE__) {
    hydrate(queryClient, window.__VQ_STATE__);
    delete window.__VQ_STATE__;
  }

  app.use(VueQueryPlugin, { queryClient });
})
