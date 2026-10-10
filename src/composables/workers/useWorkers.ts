import { useMutation, useQueryClient } from '@tanstack/vue-query';
import { createWorker, removeWorker, updateWorker } from 'src/api/workers-api';
import { queryKeys } from 'src/api/query-keys';

/** La lista de `GET /workers` (la consumía la página antigua; se conserva la clave). */
export const WORKERS_QUERY_KEY = ['workers'] as const;

export type RenombrarEstilista = { id: string; body: { name: string } };

/**
 * Altas, cambios de nombre y bajas de estilistas.
 *
 * Cada una refresca dos cosas: la lista (`['workers']`) y todo lo que cuelga de
 * la disponibilidad —la semana de esta página y las horas del diálogo de
 * reserva—, porque el nombre de una estilista sale en las dos. Se espera al
 * refresco antes de resolver: quien llama ve la tabla ya al día.
 *
 * `mutationFn` envuelve a la API en vez de pasarla tal cual: Vue Query llama a
 * su función con argumentos de más, y la API no tiene por qué recibirlos.
 */
export const useWorkers = () => {
  const queryClient = useQueryClient();

  const refrescar = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: WORKERS_QUERY_KEY }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.workerAvailability.all,
      }),
    ]);
  };

  const crear = useMutation({
    mutationFn: (body: { name: string }) => createWorker(body),
    onSuccess: refrescar,
  });

  const renombrar = useMutation({
    mutationFn: ({ id, body }: RenombrarEstilista) => updateWorker(id, body),
    onSuccess: refrescar,
  });

  const eliminar = useMutation({
    mutationFn: (id: string) => removeWorker(id),
    onSuccess: refrescar,
  });

  return { crear, renombrar, eliminar };
};
