import type Service from 'src/interfaces/service';
import { getService } from 'src/composables/services/useService';
import { useBookStore } from 'src/stores/book-store';

export type ResultadoAñadir =
  | { ok: true; añadidos: number }
  | { ok: false; motivo: string };

const NO_DISPONIBLE = 'Ese servicio ya no está disponible.';

/**
 * El puente entre lo que el asistente presenta y lo que la bolsa guarda.
 *
 * El asistente devuelve `PresentedService` —id, nombre, precio, minutos—, pero
 * la bolsa necesita el `Service` entero. Así que «Añadir» lo trae por su id con
 * `getService`, que es una petición limpia; `useService()` NO sirve aquí porque
 * abre un diálogo de Quasar como efecto secundario.
 *
 * Un paquete es todo o nada: se traen sus servicios antes de tocar la bolsa,
 * para no dejarla con la mitad de una propuesta si una línea falla.
 */
export const useAddToBag = () => {
  const bookStore = useBookStore();

  const traerTodos = async (ids: string[]): Promise<Service[] | null> => {
    try {
      return await Promise.all(ids.map((id) => getService(id)));
    } catch {
      return null;
    }
  };

  const añadirVarios = async (ids: string[]): Promise<ResultadoAñadir> => {
    const servicios = await traerTodos(ids);
    if (servicios === null) return { ok: false, motivo: NO_DISPONIBLE };

    for (const servicio of servicios) bookStore.addBooking(servicio);
    return { ok: true, añadidos: servicios.length };
  };

  return {
    añadirServicio: (id: string) => añadirVarios([id]),
    añadirVarios,
  };
};
