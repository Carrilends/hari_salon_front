import { computed, type Ref } from 'vue';
import { keepPreviousData, useQuery } from '@tanstack/vue-query';
import {
  fetchWorkersWeek,
  type WorkersWeekResponse,
} from 'src/api/workers-api';
import { queryKeys } from 'src/api/query-keys';

/**
 * La carga de la semana que empieza en `lunes` (contrato §4.5).
 *
 * - La clave cuelga de `workerAvailability.all`: el canal en tiempo real la
 *   invalida con cada reserva nueva, movida o cancelada.
 * - `keepPreviousData`: al cambiar de semana la tabla sigue con la anterior
 *   hasta que llega la nueva, sin parpadear a «Cargando…».
 * - `habilitada`: la ruta es solo de la dueña; sin su sesión no se pide.
 */
export function useSemanaEstilistas(
  lunes: Ref<string>,
  habilitada: Ref<boolean>
) {
  const consulta = useQuery<WorkersWeekResponse>({
    queryKey: computed(() => queryKeys.workerAvailability.week(lunes.value)),
    queryFn: () => fetchWorkersWeek(lunes.value),
    enabled: habilitada,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  return {
    semana: consulta.data,
    cargando: consulta.isLoading,
    error: consulta.error,
    reintentar: () => consulta.refetch(),
  };
}
