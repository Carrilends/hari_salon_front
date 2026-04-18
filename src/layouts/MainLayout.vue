<template>
  <q-layout class="shadow-2 background-image" view="hHh lpR fFf">
    <q-header style="background: #424242">
      <div class="main-header">
        <div class="main-header__brand" @click="router.push('/')">
          💈 Peluqueria pecas 💈
        </div>
        <div class="main-header__actions">
          <q-btn
            :class="serviceHomeButton.class"
            :icon="serviceHomeButton.icon"
            :label="showButtonLabels ? serviceHomeButton.label : undefined"
            :aria-label="serviceHomeButton.label"
            rounded
            flat
            :dense="!showButtonLabels"
            @click="serviceHomeButton.method"
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
            >
            </q-btn>
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
            class="color-bar"
            icon="expand_more"
            :label="showButtonLabels ? 'Más' : undefined"
            aria-label="Más opciones"
            rounded
            flat
            :dense="!showButtonLabels"
          >
            <q-menu
              class="more-menu"
              auto-close
              anchor="bottom right"
              self="top right"
              transition-show="jump-down"
              transition-hide="jump-up"
            >
              <q-list class="more-menu__list" separator>
                <q-item
                  v-for="item in moreMenuItems"
                  :key="item.label"
                  clickable
                  v-close-popup
                  class="more-menu__item"
                  @click="item.method"
                >
                  <q-item-section avatar>
                    <q-icon :name="item.icon" class="more-menu__icon" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>{{ item.label }}</q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </q-menu>
          </q-btn>
        </div>
      </div>
    </q-header>

    <q-page-container class="full-width" style="height: 100vh; min-height: 0">
      <router-view />
    </q-page-container>

    <q-btn
      v-if="showReviewButton"
      class="review-fab"
      color="positive"
      icon="chat"
      round
      size="lg"
      aria-label="Agregar reseña"
      @click="onReviewClick"
    />

    <q-dialog v-model="reviewDialog">
      <q-card class="review-dialog q-pa-sm">
        <q-card-section class="q-pb-none">
          <div class="text-h6">Tu reseña</div>
          <div class="text-caption text-grey-7">
            Cuéntanos tu experiencia y deja una puntuación
          </div>
        </q-card-section>

        <q-card-section class="q-gutter-md">
          <q-input
            v-model="reviewForm.name"
            outlined
            label="Nombre"
            :rules="[
              (val) => !!val || 'Requerido',
              (val) => val.trim().length >= 2 || 'Mínimo 2 caracteres',
            ]"
          />
          <q-input
            v-model="reviewForm.description"
            outlined
            type="textarea"
            autogrow
            label="Descripción"
            :rules="[
              (val) => !!val || 'Requerido',
              (val) => val.trim().length >= 5 || 'Mínimo 5 caracteres',
            ]"
          />
          <q-select
            v-model="reviewForm.score"
            outlined
            label="Puntaje"
            :options="scoreOptions"
            emit-value
            map-options
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn color="positive" label="Enviar reseña" :loading="isSendingReview" @click="submitReview" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <whoWeAreDialog v-model:dialog="whoWeAreDialogComponent" />
    <ourContact v-model:dialog="ourContactDialog" />
    <BookingDialog v-model:dialog="bookingStore.showDialog" />
  </q-layout>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import ourContact from 'src/components/dialogs/ourContact.vue';
import whoWeAreDialog from 'src/components/dialogs/whoWeAreDialog.vue';
import BookingDialog from 'src/components/dialogs/bookingDialog.vue';
import { migrateLegacyBookings, useBookStore } from 'src/stores/book-store';
import { useAuthStore } from 'src/stores/auth-store';
import { adminServiceApi } from 'src/api/services-api';
import type { CreateReviewBody, CreateReviewResponse } from 'src/api/apiTypes';

type HeaderActionButton = {
  icon: string;
  label: string;
  class: string;
  method: () => void;
};

type HeaderMenuItem = {
  label: string;
  icon: string;
  method: () => void;
  visible?: () => boolean;
};

const bookingStore = useBookStore();
const authStore = useAuthStore();
const $q = useQuasar();

const BREAKPOINT_LABELS_PX = 1171;

const route = useRoute();
const router = useRouter();

const reviewDialog = ref(false);
const isSendingReview = ref(false);
const scoreOptions = [1, 2, 3, 4, 5].map((score) => ({ label: `${score}`, value: score }));

const reviewForm = reactive<CreateReviewBody>({
  name: '',
  description: '',
  score: 5,
});

const showReviewButton = computed(() => {
  if (!authStore.isLoggedIn) return true;
  if (authStore.isAdmin) return false;
  return authStore.roles.length === 0 || authStore.roles.every((role) => role === 'user');
});

function resetReviewForm() {
  reviewForm.name = authStore.fullname || '';
  reviewForm.description = '';
  reviewForm.score = 5;
}

function onReviewClick() {
  if (!authStore.isLoggedIn) {
    router.push({
      name: 'login',
      query: {
        redirect: route.fullPath || '/services',
      },
    });
    return;
  }

  resetReviewForm();
  reviewDialog.value = true;
}

async function submitReview() {
  if (!authStore.isLoggedIn || isSendingReview.value) return;
  if (!reviewForm.name.trim() || !reviewForm.description.trim()) return;

  isSendingReview.value = true;
  try {
    await adminServiceApi.post<CreateReviewResponse>('/reviews', {
      name: reviewForm.name.trim(),
      description: reviewForm.description.trim(),
      score: reviewForm.score,
    });

    reviewDialog.value = false;
    $q.notify({
      type: 'positive',
      message: 'Reseña enviada correctamente',
    });
    resetReviewForm();
  } catch {
    $q.notify({
      type: 'negative',
      message: 'No se pudo enviar la reseña',
    });
  } finally {
    isSendingReview.value = false;
  }
}

function onLogout() {
  authStore.logout();
  router.push({ path: '/' });
}

function onLogin() {
  router.push({
    name: 'login',
    query: {
      redirect: route.fullPath || '/services',
    },
  });
}

const whoWeAreDialogComponent = ref(false);
const ourContactDialog = ref(false);

const showButtonLabels = ref(
  typeof window !== 'undefined'
    ? window.matchMedia(`(min-width: ${BREAKPOINT_LABELS_PX}px)`).matches
    : true
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

const serviceHomeButton = ref<HeaderActionButton>({
  icon: 'las la-cut',
  label: 'Servicios',
  class: 'color-bar',
  method: () => router.push('/services'),
});

const moreMenuItems = computed<HeaderMenuItem[]>(() =>
  [
    {
      icon: 'manage_accounts',
      label: 'Mi cuenta',
      visible: () => authStore.isLoggedIn,
      method: () => router.push('/mi-cuenta'),
    },
    {
      icon: 'rate_review',
      label: 'Testimonios',
      method: () => router.push('/testimonios'),
    },
    {
      icon: 'groups',
      label: '¿Quiénes somos?',
      method: () =>
        (whoWeAreDialogComponent.value = !whoWeAreDialogComponent.value),
    },
    {
      icon: 'schedule',
      label: 'Horarios',
      method: () => (ourContactDialog.value = !ourContactDialog.value),
    },
    {
      icon: 'supervisor_account',
      label: 'Mis empleados',
      visible: () => authStore.isAdmin,
      method: () => router.push('/mis-empleados'),
    },
    {
      icon: 'help_outline',
      label: 'Preguntas frecuentes',
      method: () => router.push('/preguntas-frecuentes'),
    },
    {
      icon: 'login',
      label: 'Iniciar sesión',
      visible: () => !authStore.isLoggedIn,
      method: onLogin,
    },
    {
      icon: 'logout',
      label: 'Cerrar sesión',
      visible: () => authStore.isLoggedIn,
      method: onLogout,
    },
  ].filter((item) => (item.visible ? item.visible() : true))
);

function syncServicesNavButton() {
  if (route.path === '/') {
    serviceHomeButton.value.icon = 'las la-cut';
    serviceHomeButton.value.label = 'Servicios';
    serviceHomeButton.value.method = () => router.push('/services');
  } else if (route.path === '/services') {
    serviceHomeButton.value.icon = 'home';
    serviceHomeButton.value.label = 'Inicio';
    serviceHomeButton.value.method = () => router.push('/');
  }
}

watch(() => route.path, syncServicesNavButton, { immediate: true });

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
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
    Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
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

.more-menu {
  border-radius: 14px;
  overflow: hidden;
  backdrop-filter: blur(4px);
}

.more-menu__list {
  min-width: 230px;
  padding: 6px;
  background: linear-gradient(180deg, #fff9fc 0%, #f3f7fb 100%);
}

.more-menu__item {
  border-radius: 10px;
  transition: background-color 0.2s ease, transform 0.2s ease;
}

.more-menu__item:hover {
  background: rgba(248, 187, 208, 0.35);
  transform: translateX(2px);
}

.more-menu__icon {
  color: #5a4f77;
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

.review-fab {
  position: fixed;
  left: 18px;
  bottom: 18px;
  z-index: 2500;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25);
}

.review-dialog {
  width: min(92vw, 460px);
  border-radius: 14px;
}
</style>
