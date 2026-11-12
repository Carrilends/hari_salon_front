import { computed, Ref } from 'vue';
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import {
  AbsenceInput,
  AbsencePlan,
  AbsenceResult,
  fetchAbsences,
  markAbsence,
  previewAbsence,
  removeAbsence,
} from 'src/api/workers-api';
import { queryKeys } from 'src/api/query-keys';

/**
 * Ausencias de las estilistas (solo la dueña). `habilitado` apaga la consulta
 * para quien no es admin. Marcar o quitar una ausencia cambia la semana, las
 * citas (reasignadas o canceladas) y las horas libres: se refresca todo eso,
 * y se espera al refresco antes de resolver. Previsualizar no toca nada.
 *
 * Las claves `reservations.all` y `workerAvailability.all` son raíces:
 * invalidan por prefijo la bandeja, las reservas de hoy, la semana y el día.
 */
export const useAusencias = (habilitado: Ref<boolean>) => {
  const queryClient = useQueryClient();

  const consulta = useQuery({
    queryKey: queryKeys.absences.all,
    queryFn: fetchAbsences,
    enabled: habilitado,
  });

  const refrescar = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.absences.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.workerAvailability.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.reservations.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.occupancy.all }),
    ]);
  };

  const previsualizar = (input: AbsenceInput): Promise<AbsencePlan> =>
    previewAbsence(input);

  const marcar = async (input: AbsenceInput): Promise<AbsenceResult> => {
    const resultado = await markAbsence(input);
    await refrescar();
    return resultado;
  };

  const quitar = async (id: string): Promise<void> => {
    await removeAbsence(id);
    await refrescar();
  };

  return {
    ausencias: computed(() => consulta.data.value),
    cargando: computed(() => consulta.isLoading.value),
    previsualizar,
    marcar,
    quitar,
  };
};
