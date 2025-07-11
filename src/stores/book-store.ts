import { defineStore } from 'pinia';
import Service from 'src/interfaces/service';
import { computed, ref } from 'vue';

export const useBookStore = defineStore(
  'book',
  () => {
    const bookings = ref<Service[]>([]);
    const showDialog = ref(false)

    const addBooking = (booking: Service) => {
      bookings.value.push(booking);
    };

    const removeBooking = (bookingsId: string) => {
      bookings.value = bookings.value.filter(book => book.id !== bookingsId)
    }

    const totalBookings = computed(() => {
      return bookings.value.length
    })

    const showDialogFn = () => showDialog.value = !showDialog.value

    return {
      bookings,
      totalBookings,
      showDialog,
      addBooking,
      removeBooking,
      showDialogFn
    };
  },
  { persist: true }
);
