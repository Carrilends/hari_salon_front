import { boot } from 'quasar/wrappers'
import { VueQueryPlugin } from '@tanstack/vue-query';

export default boot(({ app }) => {
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
