import { nextTick } from 'vue';
import { useQuasar } from 'quasar';
import { useQueryClient } from '@tanstack/vue-query';

import { adminServiceApi } from 'src/api/services-api';
import ServiceDeleteDialog from 'src/components/dialogs/ServiceDeleteDialog.vue';
import ServicePromotionDialog from 'src/components/dialogs/ServicePromotionDialog.vue';
import {
  deleteService,
  getService,
  useServiceForEdition,
} from 'src/composables/services/useService';
import { useAviso } from 'src/composables/shared/useAviso';
import { useAuthStore } from 'src/stores/auth-store';
import { useBookStore } from 'src/stores/book-store';
import { useServicesStore } from 'src/stores/service-store';
import type Service from 'src/interfaces/service';

/** Por qué se pide refrescar. El borrado puede dejar la página fuera de rango. */
export type MotivoRefresco = 'borrado' | 'promocion';

type ServiceTagInput = string | { id?: string };

/**
 * Los tags llegan del API como objetos (`{ id, name }`) y el `PATCH` del
 * servicio los quiere como ids. Si se manda lo que vino, el backend no
 * reconoce nada y el servicio se queda sin etiquetas.
 */
export const normalizeServiceTags = (service: Service): string[] =>
  ((service.tags as unknown as ServiceTagInput[]) || [])
    .map((tag) => (typeof tag === 'string' ? tag : tag?.id || ''))
    .filter((id) => Boolean(id));

/**
 * Cuerpo **completo** del `PATCH /service/:id`.
 *
 * No es verbosidad: el endpoint reemplaza lo que recibe, así que un cuerpo
 * parcial —solo `havePromotion` y `porcentageDiscount`— borraría nombre,
 * detalle, imágenes y etiquetas del servicio. Activar una promoción dejaría el
 * servicio fuera de todas sus categorías.
 */
export const buildPromotionPayload = (
  service: Service,
  havePromotion: boolean,
  porcentageDiscount: number
) => ({
  name: service.name,
  detail: {
    id: service.detail?.id,
    description: service.detail?.description,
    specifications: service.detail?.specifications,
  },
  price: Number(service.price || 0),
  images: service.images || [],
  tags: normalizeServiceTags(service),
  havePromotion,
  porcentageDiscount,
});

/**
 * A qué página saltar después de borrar.
 *
 * Si en la página actual quedaba un solo servicio y no es la primera, tras el
 * borrado el paginador apunta a una página que ya no existe: la lista se queda
 * en blanco y la dueña cree que borró todo.
 */
export function paginaTrasBorrado(
  serviciosEnPagina: number,
  pagina: number
): number {
  return serviciosEnPagina <= 1 && pagina > 1 ? pagina - 1 : pagina;
}

/**
 * Editar, promocionar y borrar un servicio.
 *
 * Vivía dentro de `ServicePage.vue`, con tres `$q.dialog` de Quasar y cuatro
 * `$q.notify` sueltos. Aquí queda en un sitio, con los diálogos propios de la
 * remodelación y los avisos de la paleta, y la página solo cablea.
 *
 * El guardia de `isAdmin` es cosmético: cada endpoint está protegido con
 * `@Auth()` en el backend. Se conserva porque enseñar un control que va a
 * devolver 401 es peor que no enseñarlo.
 */
export function useServiceAdminActions(opciones: {
  refrescar: (motivo: MotivoRefresco) => void;
}) {
  const $q = useQuasar();
  const aviso = useAviso();
  const authStore = useAuthStore();
  const bookStore = useBookStore();
  const storeServices = useServicesStore();
  const queryClient = useQueryClient();
  const { serviceIdEditRef } = useServiceForEdition();

  const esAdmin = () => authStore.isLoggedIn && authStore.isAdmin;

  /**
   * El `nextTick` no es adorno: `useServiceForEdition` abre el formulario al
   * cambiar el id, así que editar dos veces el mismo servicio no abriría nada
   * sin pasar antes por la cadena vacía.
   */
  const editar = (id: string) => {
    if (!esAdmin()) return;
    serviceIdEditRef.value = '';
    void nextTick(() => {
      serviceIdEditRef.value = id;
    });
  };

  const aplicarPromocion = async (
    service: Service,
    havePromotion: boolean,
    porcentageDiscount: number
  ) => {
    $q.loading.show({
      message: havePromotion
        ? 'Aplicando promoción...'
        : 'Quitando promoción...',
    });
    try {
      try {
        await adminServiceApi.patch(
          `/service/${service.id}`,
          buildPromotionPayload(service, havePromotion, porcentageDiscount)
        );
      } catch {
        aviso.fallo('No se pudo actualizar la promoción del servicio');
        return;
      }

      // El PATCH ya cambió el precio en el servidor: la lista se recarga pase
      // lo que pase con la lectura de abajo.
      opciones.refrescar('promocion');

      let fresh: Service;
      try {
        fresh = await getService(service.id);
      } catch {
        // La promoción SÍ se guardó; lo que falta es el precio nuevo en la
        // bolsa y en la ficha. Decir «no se pudo actualizar la promoción»
        // invitaría a repetirla.
        aviso.atencion(
          'La promoción se guardó, pero no se pudo recargar el servicio. Recarga la página para ver el precio nuevo.'
        );
        return;
      }
      // Sin esto, la bolsa de quien ya tenía el servicio cobra el precio viejo.
      bookStore.syncBookingWithService(fresh);
      // La ficha guarda su consulta tres minutos (`staleTime` de `useService`):
      // sin sembrarla, el detalle abierto justo después enseñaría el precio viejo.
      queryClient.setQueryData(['service', service.id], fresh);
      aviso.logro(
        havePromotion
          ? `Promoción ${porcentageDiscount}% aplicada`
          : 'Promoción retirada'
      );
    } finally {
      $q.loading.hide();
    }
  };

  /**
   * El diálogo elige su variante (poner / quitar) y devuelve el porcentaje.
   * **Un cero significa quitar**: es el único canal que el plugin de diálogos
   * ofrece de vuelta.
   */
  const promocionar = (service: Service) => {
    if (!esAdmin()) return;
    $q.dialog({
      component: ServicePromotionDialog,
      componentProps: { service },
    }).onOk((porcentaje: number) => {
      const pct = Math.round(Number(porcentaje) || 0);
      void aplicarPromocion(service, pct > 0, pct);
    });
  };

  const eliminar = async (id: string) => {
    if (!esAdmin()) return;
    // La ficha del diálogo necesita foto, nombre y precio. Lo normal es que el
    // servicio esté en la lista que se está mirando; si no está (otra pestaña
    // lo movió), se pide al API antes que abrir un diálogo sin ficha.
    let service = storeServices.services.find((s: Service) => s.id === id);
    if (!service) {
      try {
        service = await getService(id);
      } catch {
        aviso.fallo('No se pudo cargar el servicio que se va a eliminar');
        return;
      }
    }

    $q.dialog({
      component: ServiceDeleteDialog,
      componentProps: { service },
    }).onOk(async () => {
      try {
        await deleteService(id);
      } catch {
        aviso.fallo('Error al eliminar el servicio');
        return;
      }
      aviso.logro('Servicio eliminado correctamente');
      opciones.refrescar('borrado');
    });
  };

  return { editar, promocionar, eliminar };
}
