import { adminServiceApi } from 'src/api/services-api';
import type { ServiceFormData } from 'src/composables/services/useServiceCreateEdit';
import { useQuasar } from 'quasar';
import { Tag } from 'src/interfaces/tag';

/** ------------- CREATE SERVICE -------------
 * ------------------------------------------------------------------------
 * Helper to create a service
 * @param data - ServiceFormData
 * @returns void
 * ------------------------------------------------------------------------
 * ------------------------------------------------------------------------
 */
export const createServiceHelper = async (data: ServiceFormData) => {
  const q = useQuasar();
  try {
    adminServiceApi
      .post('/service', data)
      .then(() => {
        q.notify({
          type: 'positive',
          message: 'Servicio creado exitosamente',
          position: 'bottom',
        });
      })
      .catch(() => {
        // error
        q.notify({
          type: 'negative',
          message: 'Error al crear el servicio',
          position: 'bottom',
        });
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
 * @returns void
 * ------------------------------------------------------------------------
 * ------------------------------------------------------------------------
 */
export const updateServiceHelper = async (
  data: ServiceFormData,
  id: string
) => {
  // Lógica para actualizar el servicio (a implementar)
  const q = useQuasar();
  try {
    adminServiceApi
      .patch(`/service/${id}`, data)
      .then(() => {
        q.notify({
          type: 'positive',
          message: 'Servicio actualizado exitosamente',
          position: 'bottom',
        });
      })
      .catch(() => {
        // error
        q.notify({
          type: 'negative',
          message: 'Error al actualizar el servicio',
          position: 'bottom',
        });
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
