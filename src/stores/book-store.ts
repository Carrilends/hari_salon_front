import { computed, ref } from 'vue';
import { defineStore } from 'pinia';

import Service from 'src/interfaces/service';

export const useBookStore = defineStore(
  'book',
  () => {
    const bookings = ref<Service[]>([]);
    const showDialog = ref(false);

    const addBooking = (booking: Service) => {
      bookings.value.push(booking);
    };

    const removeBooking = (bookingsId: string) => {
      bookings.value = bookings.value.filter((book) => book.id !== bookingsId);
    };

    const totalBookings = computed(() => {
      return bookings.value.length;
    });

    const bookingsCost = computed(() => {
      return bookings.value.reduce((total, booking) => {
        return total + booking.price;
      }, 0);
    });

    const showDialogFn = () => (showDialog.value = !showDialog.value);

    return {
      bookings,
      totalBookings,
      bookingsCost,
      showDialog,
      addBooking,
      removeBooking,
      showDialogFn,
    };
  },
  { persist: true }
);
