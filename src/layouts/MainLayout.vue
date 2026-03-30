<template>
  <q-layout class="shadow-2 background-image" view="hHh lpR fFf">
    <q-header style="background: #424242">
      <div class="main-header">
        <div class="main-header__brand" @click="router.push('/')">
          💈 Peluqueria pecas 💈
        </div>
        <div class="main-header__actions">
          <q-btn
            v-for="button in buttons"
            :key="button.label"
            :class="button.class"
            :icon="button.icon"
            :label="showButtonLabels ? button.label : undefined"
            :aria-label="button.label"
            rounded
            flat
            :dense="!showButtonLabels"
            @click="button.method"
          />
          <div class="filter-badge-wrapper">
            <q-btn
              class="color-bar"
              icon="local_mall"
              :label="showButtonLabels ? 'Tus reservas' : undefined"
              aria-label="Tus reservas"
              rounded
              flat
              :dense="!showButtonLabels"
              @click="bookingStore.showDialogFn()"
            />
            <q-badge
              v-if="bookingStore.totalBookingQuantity > 0"
              color="red"
              rounded
              floating
              class="filter-badge-count"
            >
              {{
                bookingStore.totalBookingQuantity > 9
                  ? '9+'
                  : bookingStore.totalBookingQuantity
              }}
            </q-badge>
          </div>
          <q-btn
            v-if="authStore.isLoggedIn"
            class="color-bar"
            icon="logout"
            :label="showButtonLabels ? 'Salir' : undefined"
            aria-label="Cerrar sesión"
            rounded
            flat
            :dense="!showButtonLabels"
            @click="onLogout"
          />
        </div>
      </div>
    </q-header>

    <q-page-container class="full-width" style="height: 100vh; min-height: 0">
      <router-view />
    </q-page-container>
    <whoWeAreDialog v-model:dialog="whoWeAreDialogComponent" />
    <ourContact v-model:dialog="ourContactDialog" />
    <BookingDialog v-model:dialog="bookingStore.showDialog" />
  </q-layout>
</template>

<script setup lang="ts">
import { ref, onUpdated, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import ourContact from 'src/components/dialogs/ourContact.vue';
import whoWeAreDialog from 'src/components/dialogs/whoWeAreDialog.vue';
import BookingDialog from 'src/components/dialogs/bookingDialog.vue';
import { migrateLegacyBookings, useBookStore } from 'src/stores/book-store';
import { useAuthStore } from 'src/stores/auth-store';

const bookingStore = useBookStore();
const authStore = useAuthStore();

const BREAKPOINT_LABELS_PX = 1171;

const router = useRouter();

function onLogout() {
  authStore.logout();
  router.push({ path: '/' });
}

const whoWeAreDialogComponent = ref(false);
const ourContactDialog = ref(false);

const showButtonLabels = ref(
  typeof window !== 'undefined'
    ? window.matchMedia(`(min-width: ${BREAKPOINT_LABELS_PX}px)`).matches
    : true,
);

onMounted(() => {
  const b = bookingStore.bookings;
  if (b.length) {
    const first = b[0];
    if (!(first && typeof first === 'object' && 'quantity' in first)) {
      bookingStore.$patch({
        bookings: migrateLegacyBookings(b as unknown),
      });
    }
  }

  const mq = window.matchMedia(`(min-width: ${BREAKPOINT_LABELS_PX}px)`);
  const syncLabels = () => {
    showButtonLabels.value = mq.matches;
  };
  syncLabels();
  mq.addEventListener('change', syncLabels);
  onUnmounted(() => mq.removeEventListener('change', syncLabels));
});

const buttons = ref([
  {
    icon: 'las la-cut',
    label: 'Servicios',
    class: 'color-bar',
    method: () => router.push('/services'),
  },
  {
    icon: 'schedule',
    label: 'Horarios',
    class: 'color-bar',
    method: () => (ourContactDialog.value = !ourContactDialog.value),
  },
  {
    icon: 'las la-user-tie',
    label: '¿Quiénes somos?',
    class: 'color-bar',
    method: () =>
      (whoWeAreDialogComponent.value = !whoWeAreDialogComponent.value),
  },
]);

onUpdated(() => {
  if (router.currentRoute.value.path === '/') {
    buttons.value[0].icon = 'las la-cut';
    buttons.value[0].label = 'Servicios';
    buttons.value[0].method = () => router.push('/services');
  } else if (router.currentRoute.value.path === '/services') {
    buttons.value[0].icon = 'home';
    buttons.value[0].label = 'Inicio';
    buttons.value[0].method = () => router.push('/');
  }
});

defineOptions({
  name: 'MainLayout',
});
</script>

<style scoped lang="scss">
.main-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  flex-wrap: nowrap;
  gap: 12px;
  padding: 10px 20px 12px;
  min-height: 56px;
  box-sizing: border-box;
}

.main-header__brand {
  cursor: pointer;
  font-size: 1.25rem;
  font-weight: 700;
  color: white;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI',
    Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue',
    sans-serif;
  flex-shrink: 0;
  line-height: 1.2;
  text-align: left;
}

.main-header__actions {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  margin-left: auto;
  min-width: 0;
}

@media (max-width: 499px) {
  .main-header {
    flex-direction: column;
    align-items: stretch;
    padding: 12px 16px 14px;
    gap: 10px;
  }

  .main-header__brand {
    width: 100%;
    text-align: center;
  }

  .main-header__actions {
    margin-left: 0;
    justify-content: center;
    width: 100%;
  }
}

.item {
  transition: all 0.3s ease;
  transform-origin: right;
}
.item:hover {
  background-color: #f8bbd0;
  transform: translateX(-3px) scaleY(1.05);
  box-shadow: 4px 4px 8px rgba(209, 122, 156, 0.3);
  border-top-right-radius: 15px;
  border-bottom-right-radius: 15px;
}
.color-bar {
  background: linear-gradient(100deg, #f8bbd0 0%, #bdc9d7 90%);
  color: black;
}

.background-image {
  background-image: url('src/assets/people/rainbow_hair.jpg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

.filter-badge-wrapper {
  position: relative;
  display: inline-block;
}

.filter-badge-count {
  position: absolute;
  top: -8px;
  right: -8px;
  font-size: 13px;
  padding: 4px 8px;
  line-height: 1;
  z-index: 10;
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.2);
}
</style>
