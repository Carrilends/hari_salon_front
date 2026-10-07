import { boot } from 'quasar/wrappers'
import { VueQueryPlugin } from '@tanstack/vue-query';
import { activarActiveTactil } from 'src/helpers/activar-active-tactil';

export default boot(({ app }) => {
  // iOS Safari no pinta `:active` en un toque sin un oyente de `touchstart`:
  // sin esto, el hundido de los botones no se ve en un iPhone. No-op en SSG.
  activarActiveTactil();

  app.use(
    VueQueryPlugin, {
      queryClientConfig: {
        defaultOptions: {
          queries: {
            /// cacheTime: 1000 * 60, // 5 minutes
            // refetchOnWindowFocus: false,
            // retry: false,
            // staleTime: 1000 * 60 * 5, // 5 minutes
          },
        },
      },
    }
  )
})
