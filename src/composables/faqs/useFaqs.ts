import { computed, ref } from 'vue';
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import type { CreateFaqBody, UpdateFaqBody } from 'src/api/apiTypes';
import {
  borrarPregunta,
  crearPregunta,
  editarPregunta,
  listarPreguntas,
  reordenarPreguntas,
  type Faq,
} from 'src/api/faqs-api';
import { ordenarPorIds } from 'src/helpers/orden-preguntas';

export const FAQ_QUERY_KEY = ['faqs'] as const;

type UpdateFaqPayload = {
  id: string;
  body: UpdateFaqBody;
};

export const useFaqs = () => {
  const queryClient = useQueryClient();
  const { data, isLoading, isFetching, isError, refetch } = useQuery<Faq[]>({
    queryKey: FAQ_QUERY_KEY,
    queryFn: listarPreguntas,
    staleTime: 1000 * 60,
  });

  const invalidar = () =>
    queryClient.invalidateQueries({ queryKey: FAQ_QUERY_KEY });

  const createFaqMutation = useMutation({
    mutationFn: (body: CreateFaqBody) => crearPregunta(body),
    onSuccess: invalidar,
  });

  const updateFaqMutation = useMutation({
    mutationFn: ({ id, body }: UpdateFaqPayload) => editarPregunta(id, body),
    onSuccess: invalidar,
  });

  const removeFaqMutation = useMutation({
    mutationFn: (id: string) => borrarPregunta(id),
    onSuccess: invalidar,
  });

  /*
   * Reordenar, con pintado optimista y una cola de un solo hueco.
   *
   * La dueña puede pulsar ↓ tres veces en un segundo: son tres órdenes. Si
   * salieran a la vez, el servidor podría aplicarlos desordenados. Así que hay
   * como mucho UN `PATCH` en vuelo; lo que llegue mientras tanto se guarda en
   * `pendiente` (pisando al anterior: solo importa el último) y sale cuando
   * vuelve el que estaba en vuelo.
   *
   * `confirmada` es la última lista que el servidor dio por buena: si un envío
   * falla, la pantalla vuelve ahí, no al orden de antes del primer toque.
   */
  let confirmada: Faq[] = [];
  let pendiente: string[] | null = null;
  let enVuelo: Promise<boolean> | null = null;
  const guardandoOrden = ref(false);

  const vaciarCola = async (): Promise<boolean> => {
    // La limpieza va aquí dentro, no en un `.finally` de fuera: así corre en
    // el mismo instante en que el bucle acaba, y un `reordenar` que llegue
    // justo después ya no ve un `enVuelo` viejo que nadie va a vaciar.
    try {
      while (pendiente) {
        const ids = pendiente;
        pendiente = null;
        try {
          const lista = await reordenarPreguntas(ids);
          confirmada = lista;
          // Si ya hay otro orden pintado esperando, la respuesta vieja no lo pisa.
          if (!pendiente) queryClient.setQueryData<Faq[]>(FAQ_QUERY_KEY, lista);
        } catch {
          pendiente = null;
          queryClient.setQueryData<Faq[]>(FAQ_QUERY_KEY, confirmada);
          // Un 400 suele ser «la lista cambió en otra pestaña»: se trae la real.
          void invalidar();
          return false;
        }
      }
      return true;
    } finally {
      enVuelo = null;
      guardandoOrden.value = false;
    }
  };

  const reordenar = async (ids: string[]): Promise<boolean> => {
    // Primero cancelar: una lectura en vuelo que se cancela DESPUÉS del
    // pintado revierte la caché a su foto de antes y borra el orden nuevo.
    await queryClient.cancelQueries({ queryKey: FAQ_QUERY_KEY });
    const actual = queryClient.getQueryData<Faq[]>(FAQ_QUERY_KEY) ?? [];
    if (!enVuelo) confirmada = actual;
    queryClient.setQueryData<Faq[]>(FAQ_QUERY_KEY, ordenarPorIds(actual, ids));
    pendiente = ids;
    if (!enVuelo) {
      guardandoOrden.value = true;
      enVuelo = vaciarCola();
    }
    return enVuelo;
  };

  const faqs = computed(() => data.value ?? []);

  return {
    faqs,
    isLoading,
    isFetching,
    isError,
    refetch,
    createFaqMutation,
    updateFaqMutation,
    removeFaqMutation,
    reordenar,
    guardandoOrden,
  };
};
