import { computed, ref } from 'vue';
import { defineStore } from 'pinia';

import type { BookingLine } from 'src/interfaces/booking';
import type Service from 'src/interfaces/service';
import { effectiveServiceUnitPrice } from 'src/helpers/service-promotion';

function isBookingLineArray(raw: unknown[]): raw is BookingLine[] {
  if (raw.length === 0) return true;
  const first = raw[0];
  return (
    first !== null &&
    typeof first === 'object' &&
    'service' in first &&
    'quantity' in first &&
    typeof (first as BookingLine).quantity === 'number'
  );
}

/** Convierte datos persistidos antiguos (Service[]) al formato con cantidad. */
export function migrateLegacyBookings(raw: unknown): BookingLine[] {
  if (!Array.isArray(raw)) return [];
  if (raw.length === 0) return [];
  if (isBookingLineArray(raw)) return raw;

  const merged = new Map<string, BookingLine>();
  for (const item of raw) {
    if (!item || typeof item !== 'object' || !('id' in item)) continue;
    const s = item as Service;
    if (!s.id) continue;
    const prev = merged.get(s.id);
    if (prev) {
      prev.quantity += 1;
      prev.service = s;
    } else {
      merged.set(s.id, { service: s, quantity: 1 });
    }
  }
  return Array.from(merged.values());
}

export const useBookStore = defineStore(
  'book',
  () => {
    const bookings = ref<BookingLine[]>([]);
    const showDialog = ref(false);

    const updateBookingQuantity = (
      serviceId: string,
      quantity: number,
      service?: Service
    ) => {
      const idx = bookings.value.findIndex((line) => line.service.id === serviceId);
      if (idx === -1) return;

      if (quantity <= 0) {
        removeBooking(serviceId);
        return;
      }

      const currentLine = bookings.value[idx];
      if (!currentLine) return;

      bookings.value[idx] = {
        service: service ?? currentLine.service,
        quantity,
      };
    };

    const addBooking = (booking: Service) => {
      const idx = bookings.value.findIndex((line) => line.service.id === booking.id);
      if (idx === -1) {
        bookings.value.push({ service: booking, quantity: 1 });
        return;
      }

      const currentLine = bookings.value[idx];
      if (!currentLine) return;

      updateBookingQuantity(booking.id, currentLine.quantity + 1, booking);
    };

    const removeBooking = (serviceId: string) => {
      bookings.value = bookings.value.filter(
        (line) => line.service.id !== serviceId
      );
    };

    const clearBookings = () => {
      bookings.value = [];
    };

    const incrementBookingQuantity = (service: Service) => {
      addBooking(service);
    };

    const decrementBookingQuantity = (serviceId: string) => {
      const line = bookings.value.find((bookingLine) => bookingLine.service.id === serviceId);
      if (!line || line.quantity <= 1) return;
      updateBookingQuantity(serviceId, line.quantity - 1);
    };

    const syncBookingWithService = (service: Service) => {
      bookings.value = bookings.value.map((line) =>
        line.service.id === service.id ? { ...line, service } : line
      );
    };

    /** Suma de cantidades (cuántas veces hay servicios en el carrito). */
    const totalBookingQuantity = computed(() =>
      bookings.value.reduce((sum, line) => sum + line.quantity, 0)
    );

    const bookingsCost = computed(() =>
      bookings.value.reduce(
        (sum, line) =>
          sum + effectiveServiceUnitPrice(line.service) * line.quantity,
        0
      )
    );

    const bookingsDuration = computed(() =>
      bookings.value.reduce(
        (sum, line) => sum + (line.service.duration || 0) * line.quantity,
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
      removeBooking,
      updateBookingQuantity,
      incrementBookingQuantity,
      decrementBookingQuantity,
      syncBookingWithService,
      showDialogFn,
      clearBookings,
    };
  },
  { persist: true }
);
