/**
 * La primera pintura del navegador tiene que casar con el HTML pregenerado
 * aunque sus datos sean viejos (RF62, NF04).
 *
 * Lo publicado siempre es más viejo que el `staleTime`: la compilación se hace
 * una vez y la página se visita durante días. Con un `hydrate` a secas, al
 * montar la consulta se ve vieja, vuelve a pedir y la primera pintura sale con
 * `isFetching` («Actualizando…» en `/services»), que el HTML no tiene.
 *
 * `hidratarSinDesajuste` hidrata sin recargar al montar y, en cuanto la app
 * está montada (ya hidratada), refresca en segundo plano las consultas
 * hidratadas que estén viejas.
 */
import { createApp, defineComponent, h } from 'vue';
import {
  QueryClient,
  VueQueryPlugin,
  hydrate,
  useQuery,
  type DehydratedState,
} from '@tanstack/vue-query';
import {
  META_PRECARGADA,
  estadoPrecargado,
} from 'src/composables/shared/precargarEnServidor';
import { hidratarSinDesajuste } from 'src/composables/shared/hidratacion';

const UN_DIA = 24 * 60 * 60_000;

/** El estado que dejó una compilación de hace un día. */
async function estadoViejo(): Promise<DehydratedState> {
  const servidor = new QueryClient();
  await servidor.fetchQuery({
    queryKey: ['services'],
    queryFn: () => Promise.resolve(['viejo']),
    meta: META_PRECARGADA,
  });
  const estado = estadoPrecargado(servidor);
  estado.queries.forEach((q) => {
    q.state.dataUpdatedAt -= UN_DIA;
  });
  return estado;
}

const cliente = () =>
  new QueryClient({
    defaultOptions: { queries: { staleTime: 60_000, retry: false } },
  });

/** Monta una app con una consulta y anota `isFetching` en la PRIMERA pintura. */
function app(queryClient: QueryClient, queryFn: jest.Mock) {
  const pinturas: boolean[] = [];
  const Raiz = defineComponent({
    setup() {
      const { isFetching, data } = useQuery({
        queryKey: ['services'],
        queryFn,
        meta: META_PRECARGADA,
      });
      return () => {
        pinturas.push(isFetching.value);
        return h('p', String(data.value));
      };
    },
  });
  const instancia = createApp(Raiz);
  instancia.use(VueQueryPlugin, { queryClient });
  return { instancia, pinturas };
}

const esperar = () => new Promise((r) => setTimeout(r, 0));

describe('hidratarSinDesajuste', () => {
  it('con un hydrate a secas, la primera pintura ya sale «buscando» (el fallo)', async () => {
    const qc = cliente();
    const queryFn = jest.fn(() => Promise.resolve(['nuevo']));
    hydrate(qc, await estadoViejo());
    const { instancia, pinturas } = app(qc, queryFn);

    instancia.mount(document.createElement('div'));

    expect(pinturas[0]).toBe(true);
    instancia.unmount();
  });

  it('la primera pintura no busca aunque los datos sean de hace un día', async () => {
    const qc = cliente();
    const queryFn = jest.fn(() => Promise.resolve(['nuevo']));
    const { instancia, pinturas } = app(qc, queryFn);
    hidratarSinDesajuste(instancia, qc, await estadoViejo());

    instancia.mount(document.createElement('div'));

    expect(pinturas[0]).toBe(false);
    instancia.unmount();
  });

  it('ya montada, refresca en segundo plano lo hidratado que está viejo', async () => {
    const qc = cliente();
    const queryFn = jest.fn(() => Promise.resolve(['nuevo']));
    const { instancia } = app(qc, queryFn);
    hidratarSinDesajuste(instancia, qc, await estadoViejo());

    instancia.mount(document.createElement('div'));
    await esperar();

    expect(queryFn).toHaveBeenCalledTimes(1);
    expect(qc.getQueryData(['services'])).toEqual(['nuevo']);
    instancia.unmount();
  });

  it('ya montada, lo hidratado que sigue fresco no se vuelve a pedir', async () => {
    const qc = cliente();
    const queryFn = jest.fn(() => Promise.resolve(['nuevo']));
    const estado = await estadoViejo();
    estado.queries.forEach((q) => {
      q.state.dataUpdatedAt = Date.now();
    });
    const { instancia } = app(qc, queryFn);
    hidratarSinDesajuste(instancia, qc, estado);

    instancia.mount(document.createElement('div'));
    await esperar();

    expect(queryFn).not.toHaveBeenCalled();
    instancia.unmount();
  });

  it('después de montar, los valores por defecto vuelven a ser los de siempre', async () => {
    const qc = cliente();
    const { instancia } = app(qc, jest.fn(() => Promise.resolve([])));
    hidratarSinDesajuste(instancia, qc, await estadoViejo());

    expect(qc.getDefaultOptions().queries?.refetchOnMount).toBe(false);
    instancia.mount(document.createElement('div'));

    expect(qc.getDefaultOptions().queries).toEqual({ staleTime: 60_000, retry: false });
    instancia.unmount();
  });
});
