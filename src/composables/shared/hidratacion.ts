import {
  hydrate,
  type DehydratedState,
  type QueryClient,
} from '@tanstack/vue-query';

/** Lo único que se usa de la app de Vue: su `mount`, que es la hidratación. */
interface AppMontable {
  mount: (...args: never[]) => unknown;
}

/**
 * Hidrata la caché con lo pregenerado (`window.__VQ_STATE__`) de modo que la
 * primera pintura del navegador case con el HTML, por viejo que sea (RF62,
 * NF04).
 *
 * Lo publicado siempre es más viejo que el `staleTime`: se compila una vez y
 * se visita durante días. Con un `hydrate` a secas, cada consulta se ve vieja
 * al montar, vuelve a pedir en el mismo `setup` y la primera pintura sale con
 * `isFetching` («Actualizando…» y `aria-busy` en `/services`), que el HTML no
 * tiene: la hidratación no casa.
 *
 * Así que:
 * 1. mientras se hidrata, `refetchOnMount: false` por defecto: nadie pide al
 *    montar y la primera pintura es la del HTML;
 * 2. en cuanto `app.mount` vuelve (la hidratación de Vue es síncrona), se
 *    devuelven los valores por defecto y se refrescan en segundo plano las
 *    consultas hidratadas que estén viejas. El «Actualizando…» que eso pinte
 *    ya es una actualización normal, no un desajuste.
 */
export function hidratarSinDesajuste(
  app: AppMontable,
  queryClient: QueryClient,
  estado: DehydratedState
): void {
  const porDefecto = queryClient.getDefaultOptions();
  queryClient.setDefaultOptions({
    ...porDefecto,
    queries: { ...porDefecto.queries, refetchOnMount: false },
  });
  hydrate(queryClient, estado);

  const hidratadas = new Set(estado.queries.map((q) => q.queryHash));
  const montar = app.mount;
  app.mount = function montarYRefrescar(this: unknown, ...args: never[]) {
    const montada = montar.apply(this, args);
    queryClient.setDefaultOptions(porDefecto);
    void queryClient.refetchQueries({
      type: 'active',
      predicate: (query) => hidratadas.has(query.queryHash) && query.isStale(),
    });
    return montada;
  };
}
