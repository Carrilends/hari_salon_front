<template>
  <q-layout class="shadow-2 background-image" view="hHh lpR fFf">
    <q-header class="main-header-bar" role="banner">
      <div class="main-header">
        <a
          class="main-header__brand"
          href="/"
          aria-label="Ir al inicio de Peluquería Marlene"
          @click.prevent="router.push('/')"
        >
          MARLENE
        </a>
        <nav class="main-header__actions" aria-label="Navegación principal">
          <q-btn
            class="main-header__link"
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
              class="main-header__cta"
              icon="local_mall"
              label="Reservar"
              aria-label="Reservar"
              rounded
              unelevated
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
            class="main-header__link"
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
              transition-show="fade"
              transition-hide="fade"
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
        </nav>
      </div>
    </q-header>

    <q-page-container
      class="full-width"
      role="main"
      style="height: 100vh; min-height: 0"
    >
      <router-view />
    </q-page-container>

    <q-btn
      v-if="mostrarFabResena"
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
          <q-btn
            color="positive"
            label="Enviar reseña"
            :loading="isSendingReview"
            @click="submitReview"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <whoWeAreDialog v-model:dialog="whoWeAreDialogComponent" />
    <ourContact v-model:dialog="ourContactDialog" />
    <BookingDialog v-model:dialog="bookingStore.showDialog" />

    <AssistantLauncher :mostrar-flotante="mostrarFlotanteAsistente" />
  </q-layout>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import ourContact from 'src/components/dialogs/ourContact.vue';
import whoWeAreDialog from 'src/components/dialogs/whoWeAreDialog.vue';
import BookingDialog from 'src/components/dialogs/bookingDialog.vue';
import AssistantLauncher from 'src/components/assistant/AssistantLauncher.vue';
import { migrateLegacyBookings, useBookStore } from 'src/stores/book-store';
import { useAuthStore } from 'src/stores/auth-store';
import { useReviewDialog } from 'src/composables/reviews/useReviewDialog';
import { adminServiceApi } from 'src/api/services-api';
import { authApi } from 'src/api/auth-api';
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

const { abierto: reviewDialog, abrir: abrirResena, registrarSolicitud } =
  useReviewDialog();

// La banda de reseñas del inicio pide por aquí: la regla de quién puede dejar
// una reseña se escribe una sola vez, y es esta.
registrarSolicitud(onReviewClick);
const isSendingReview = ref(false);
const scoreOptions = [1, 2, 3, 4, 5].map((score) => ({
  label: `${score}`,
  value: score,
}));

const reviewForm = reactive<CreateReviewBody>({
  name: '',
  description: '',
  score: 5,
});

/**
 * El inicio ofrece «Deja la tuya» dentro de su banda de reseñas, y la regla de
 * la remodelación es un solo flotante en pantalla (el del asistente). Aquí la
 * burbuja verde tapaba el pie y la barra fija de móvil.
 */
/**
 * El flotante del asistente tampoco sale en el inicio: allí la banda de reseñas
 * ya ofrece el asistente con sus chips, y un botón más en esa esquina sería
 * ruido. Solo se oculta el botón — el panel sigue montado, porque esos chips
 * son justamente los que lo abren.
 */
const mostrarFlotanteAsistente = computed(() => route.path !== '/');

const mostrarFabResena = computed(
  () => showReviewButton.value && route.path !== '/',
);

const showReviewButton = computed(() => {
  if (!authStore.isLoggedIn) return true;
  if (authStore.isAdmin) return false;
  return (
    authStore.roles.length === 0 ||
    authStore.roles.every((role) => role === 'user')
  );
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
  abrirResena();
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

async function onLogout() {
  // Revoca el refresh en el servidor y limpia la cookie; sin esto la cookie
  // seguiría siendo válida hasta caducar. Nunca debe bloquear el cierre local.
  try {
    await authApi.logout();
  } catch {
    /* la sesión local se cierra igual */
  }
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
      icon: 'event_available',
      label: 'Mis reservas',
      visible: () => authStore.isLoggedIn,
      method: () => router.push('/mis-reservas'),
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
      label: 'Mis estilistas',
      visible: () => authStore.isAdmin,
      method: () => router.push('/mis-empleados'),
    },
    {
      icon: 'event_note',
      label: 'Reservas',
      visible: () => authStore.isAdmin,
      method: () => router.push('/reservas'),
    },
    {
      icon: 'help_outline',
      label: 'Preguntas frecuentes',
      method: () => router.push('/preguntas-frecuentes'),
    },
    {
      icon: 'privacy_tip',
      label: 'Política de datos',
      method: () => router.push({ name: 'privacy-policy' }),
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
.main-header-bar {
  /* Fondo sólido a propósito: translúcido sobre las fotos de la portada se
     emborrona al pasar. La cabecera es fija por `view="hHh lpR fFf"`. */
  background: var(--m-hueso);
  color: var(--m-tinta);
  border-bottom: var(--m-filete-grosor) solid var(--m-filete);
}

.main-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  flex-wrap: nowrap;
  gap: 12px;
  padding: 0 var(--m-banda-margen);
  min-height: var(--m-cabecera-alto);
  box-sizing: border-box;
}

.main-header__brand {
  cursor: pointer;
  font-family: var(--m-font-display);
  font-size: 20px;
  font-weight: 400;
  letter-spacing: var(--m-tracking-marca);
  text-transform: uppercase;
  color: var(--m-tinta);
  text-decoration: none;
  flex-shrink: 0;
  line-height: 1.2;
  text-align: left;
}

.main-header__brand:hover,
.main-header__brand:focus {
  color: var(--m-tinta);
  text-decoration: none;
}

/* Las entradas de navegación van planas: el único botón sólido es «Reservar». */
.main-header__link {
  font-family: var(--m-font-sans);
  font-size: 12px;
  letter-spacing: var(--m-tracking-nav);
  color: var(--m-tinta);
}

.main-header__cta {
  background: var(--m-tinta);
  color: var(--m-hueso);
  font-family: var(--m-font-sans);
  font-size: 12px;
  letter-spacing: var(--m-tracking-nav);
  border-radius: var(--m-radio-pildora);
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

@media (max-width: 699px) {
  .main-header {
    padding: 0 var(--m-banda-margen-movil);
    min-height: var(--m-cabecera-alto-movil);
    gap: 8px;
  }

  .main-header__brand {
    font-size: 16px;
    letter-spacing: var(--m-tracking-etiqueta);
  }

  .main-header__actions {
    gap: 6px;
    flex-wrap: nowrap;
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
  background-image: url('/people/rainbow_hair.jpg');
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

<!--
  Sin `scoped` a propósito. Quasar teletransporta el menú al `body`, así que su
  raíz no lleva el atributo de ámbito del componente y ninguna regla scoped la
  alcanza. De hecho el `border-radius` y el `backdrop-filter` que había antes
  aquí nunca llegaron a aplicarse: solo pegaban las de la lista y las filas, que
  sí viven en esta plantilla. Las clases van prefijadas, así que no se escapan.
-->
<style lang="scss">
/**
 * El desplegable de «Más», con el lenguaje de la remodelación.
 *
 * Era lo último que quedaba de la pintura vieja: degradado de rosa a azul,
 * iconos morados, esquinas de 14 px, píldoras dentro de la tarjeta y un
 * desplazamiento al pasar el ratón. Ahora es una tarjeta de nieve con filete,
 * filas separadas por una línea de 1 px y los rótulos en versalitas, como la
 * fila de navegación de la que cuelga.
 */
.more-menu {
  border-radius: var(--m-radio-tarjeta);
  border: var(--m-filete-grosor) solid var(--m-filete);
  box-shadow: 0 14px 34px rgba(11, 9, 7, 0.16);
}

.more-menu__list {
  min-width: 258px;
  padding: 0;
  background: var(--m-nieve);
  font-family: var(--m-font-sans);
}

/// La línea entre filas es el filete, no el gris que trae Quasar.
.more-menu__list.q-list--separator > .q-item-type + .q-item-type {
  border-top-color: var(--m-filete);
}

.more-menu__item {
  min-height: var(--m-tactil-min);
  padding: 10px 18px;
  color: var(--m-tinta);
}

.more-menu__item .q-item__label {
  font-size: 11.5px;
  letter-spacing: var(--m-tracking-nav);
  text-transform: uppercase;
  line-height: 1.35;
}

/// Quasar reserva 56 px para el hueco del icono; con uno de 20 sobra la mitad.
.more-menu__item .q-item__section--avatar {
  min-width: 34px;
  padding-right: 12px;
}

.more-menu__item:hover {
  background: var(--m-hueso);
}

.more-menu__item:focus-visible {
  outline: 2px solid var(--m-oro);
  outline-offset: -2px;
}

/// El dorado claro no es color de icono sobre nieve (2,8:1): aquí, el profundo.
.more-menu__icon {
  color: var(--m-oro-profundo);
  font-size: 20px;
}
</style>
