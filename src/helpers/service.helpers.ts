import { adminServiceApi } from 'src/api/services-api';
import type { ServiceFormData } from 'src/composables/services/useServiceCreateEdit';
import { useQuasar } from 'quasar';
import { Tag } from 'src/interfaces/tag';

type QuasarInstance = ReturnType<typeof useQuasar>;

/** ------------- CREATE SERVICE -------------
 * ------------------------------------------------------------------------
 * Helper to create a service
 * @param data - ServiceFormData
 * @param q - Quasar instance from component setup (do not call useQuasar here after async)
 * @returns void
 * ------------------------------------------------------------------------
 * ------------------------------------------------------------------------
 */
export const createServiceHelper = async (
  data: ServiceFormData,
  q: QuasarInstance
) => {
  try {
    await adminServiceApi.post('/service', data);
    q.notify({
      type: 'positive',
      message: 'Servicio creado exitosamente',
      position: 'bottom',
    });
  } catch (error) {
    q.notify({
      type: 'negative',
      message: 'Error al crear el servicio',
      position: 'bottom',
    });
    throw error;
  }
};

/** ------------- UPDATE SERVICE -------------
 * ------------------------------------------------------------------------
 * Helper to update a service
 * @param data - ServiceFormData
 * @param q - Quasar instance from component setup (do not call useQuasar here after async)
 * @returns void
 * ------------------------------------------------------------------------
 * ------------------------------------------------------------------------
 */
export const updateServiceHelper = async (
  data: ServiceFormData,
  id: string,
  q: QuasarInstance
) => {
  try {
    await adminServiceApi.patch(`/service/${id}`, data);
    q.notify({
      type: 'positive',
      message: 'Servicio actualizado exitosamente',
      position: 'bottom',
    });
  } catch (error) {
    q.notify({
      type: 'negative',
      message: 'Error al actualizar el servicio',
      position: 'bottom',
    });
    throw error;
  }
};

/* ------------------------------------------------------------------------
 * ---------------------- FILTERS UTILS FOR SERVICES ----------------------
 * ------------------------------------------------------------------------
 */

export interface FilterTagValidator {
  genres?: boolean;
  principalParents?: boolean;
  idParent?: string;
}

export const getChildrenServicesHelper = async (
  params: FilterTagValidator
): Promise<Tag[]> => {
  const { data } = await adminServiceApi.get<Tag[]>('/tags', { params });
  return data.map((d) => ({ ...d, selected: false }));
};
