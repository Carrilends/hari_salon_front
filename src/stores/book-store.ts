import { computed, ref } from 'vue';
import { defineStore } from 'pinia';

import type { BookingLine } from 'src/interfaces/booking';
import type Service from 'src/interfaces/service';
import { effectiveServiceUnitPrice } from 'src/helpers/service-promotion';

/**
 * Convierte lo que haya guardado el navegador al formato actual: cada servicio
 * una vez. Acepta el `Service[]` más antiguo y las líneas con `quantity` de
 * antes de 2026-10-21, cuando la bolsa admitía «× 2» que no llegaba a la cita.
 */
export function migrateLegacyBookings(raw: unknown): BookingLine[] {
  if (!Array.isArray(raw)) return [];

  const porId = new Map<string, BookingLine>();
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const service = (
      'service' in item ? (item as { service: unknown }).service : item
    ) as Service | null;
    if (!service || typeof service !== 'object' || !service.id) continue;
    if (!porId.has(service.id)) porId.set(service.id, { service });
  }
  return Array.from(porId.values());
}

export const useBookStore = defineStore(
  'book',
  () => {
    const bookings = ref<BookingLine[]>([]);
    const showDialog = ref(false);

    const hasBooking = (serviceId: string) =>
      bookings.value.some((line) => line.service.id === serviceId);

    /**
     * Cada servicio entra una vez: el servidor rechaza repetidos en una cita.
     * Devuelve `false` si ya estaba, para que quien llama lo diga.
     */
    const addBooking = (booking: Service): boolean => {
      if (hasBooking(booking.id)) return false;
      bookings.value.push({ service: booking });
      return true;
    };

    const removeBooking = (serviceId: string) => {
      bookings.value = bookings.value.filter(
        (line) => line.service.id !== serviceId
      );
    };

    const clearBookings = () => {
      bookings.value = [];
    };

    const syncBookingWithService = (service: Service) => {
      bookings.value = bookings.value.map((line) =>
        line.service.id === service.id ? { service } : line
      );
    };

    /** Cuántos servicios hay en la bolsa. */
    const totalBookingQuantity = computed(() => bookings.value.length);

    const bookingsCost = computed(() =>
      bookings.value.reduce(
        (sum, line) => sum + effectiveServiceUnitPrice(line.service),
        0
      )
    );

    const bookingsDuration = computed(() =>
      bookings.value.reduce(
        (sum, line) => sum + (line.service.duration || 0),
        0
      )
    );

    const showDialogFn = () => (showDialog.value = !showDialog.value);

    return {
      bookings,
      totalBookingQuantity,
      bookingsCost,
      bookingsDuration,
      showDialog,
      addBooking,
      hasBooking,
      removeBooking,
      syncBookingWithService,
      showDialogFn,
      clearBookings,
    };
  },
  { persist: true }
);
