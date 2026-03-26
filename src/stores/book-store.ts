import { computed, ref } from 'vue';
import { defineStore } from 'pinia';

import type { BookingLine } from 'src/interfaces/booking';
import type Service from 'src/interfaces/service';

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

    const addBooking = (booking: Service) => {
      const idx = bookings.value.findIndex((l) => l.service.id === booking.id);
      if (idx !== -1) {
        const line = bookings.value[idx];
        if (!line) return;
        bookings.value[idx] = {
          service: booking,
          quantity: line.quantity + 1,
        };
      } else {
        bookings.value.push({ service: booking, quantity: 1 });
      }
    };

    const removeBooking = (serviceId: string) => {
      bookings.value = bookings.value.filter(
        (line) => line.service.id !== serviceId
      );
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
          sum + Number(line.service.price || 0) * line.quantity,
        0
      )
    );

    const showDialogFn = () => (showDialog.value = !showDialog.value);

    return {
      bookings,
      totalBookingQuantity,
      bookingsCost,
      showDialog,
      addBooking,
      removeBooking,
      syncBookingWithService,
      showDialogFn,
    };
  },
  { persist: true }
);
