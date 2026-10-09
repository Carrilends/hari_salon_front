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
              <!--
                Dentro del botón para hundirse con él al pulsar («Realce y
                hundido», `app.scss`); como hermano se quedaba quieto. `q-btn`
                ya es `position: relative`, que es lo que ancla el `floating`.
              -->
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
            </q-btn>
          </div>
          <q-btn
            class="main-header__link main-header__mas"
            :class="{ 'main-header__mas--abierto': menuAbierto }"
            aria-label="Más opciones"
            aria-haspopup="dialog"
            :aria-expanded="menuAbierto || hojaAbierta ? 'true' : 'false'"
            rounded
            flat
            :dense="!showButtonLabels"
            @click="alPulsarMas"
          >
            <StrokeIcon v-if="esMovil" nombre="menu" :tamano="22" />
            <template v-else>
              <svg
                class="main-header__chevron"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
              <span v-if="showButtonLabels" class="main-header__mas-rotulo">Más</span>
            </template>
            <q-menu
              v-if="!esMovil"
              v-model="menuAbierto"
              class="more-menu"
              role="dialog"
              aria-label="Menú"
              anchor="bottom right"
              self="top right"
              :offset="[0, 6]"
              transition-show="fade"
              transition-hide="fade"
              @before-show="refrescarHorario"
            >
              <MenuMasContenido
                class="more-menu__list"
                :secciones="seccionesMenu"
                variante="desplegable"
                :nombre="authStore.fullname"
                :correo="authStore.email"
                :horario-hoy="horarioHoy"
                @elegir="alElegirEntrada"
              />
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
    <MenuMasHoja
      v-model:abierta="hojaAbierta"
      :secciones="seccionesMenu"
      :nombre="authStore.fullname"
      :correo="authStore.email"
      :horario-hoy="horarioHoy"
      @elegir="alElegirEntrada"
    />
    <BookingDialog v-model:dialog="bookingStore.showDialog" />

    <AssistantLauncher :mostrar-flotante="mostrarFlotanteAsistente" />
  </q-layout>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import ourContact from 'src/components/dialogs/ourContact.vue';
import whoWeAreDialog from 'src/components/dialogs/whoWeAreDialog.vue';
import BookingDialog from 'src/components/dialogs/bookingDialog.vue';
import AssistantLauncher from 'src/components/assistant/AssistantLauncher.vue';
import StrokeIcon from 'src/components/shared/StrokeIcon.vue';
import MenuMasContenido from 'src/components/shared/MenuMasContenido.vue';
import MenuMasHoja from 'src/components/shared/MenuMasHoja.vue';
import { migrateLegacyBookings, useBookStore } from 'src/stores/book-store';
import { useAuthStore } from 'src/stores/auth-store';
import { useReviewDialog } from 'src/composables/reviews/useReviewDialog';
import { useConsultaMedios } from 'src/composables/shared/useConsultaMedios';
import {
  seccionesDelMenu,
  type EntradaMenu,
} from 'src/composables/shared/menuMas';
import { horarioDeHoy } from 'src/helpers/businessHours';
import { adminServiceApi } from 'src/api/services-api';
import { authApi } from 'src/api/auth-api';
import type { CreateReviewBody, CreateReviewResponse } from 'src/api/apiTypes';

type HeaderActionButton = {
  icon: string;
  label: string;
  class: string;
  method: () => void;
};

const bookingStore = useBookStore();
const authStore = useAuthStore();
const $q = useQuasar();

const BREAKPOINT_LABELS_PX = 1171;

/**
 * Por debajo de este ancho «Más» es una hamburguesa y abre la hoja inferior
 * (M6). Es el mismo corte que el `@media (max-width: 699px)` que ya cambia la
 * cabecera en el CSS de abajo.
 */
const CONSULTA_MENU_MOVIL = '(max-width: 699px)';

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

/**
 * Tampoco en `/services`: allí el pie con el paginador está siempre a la vista
 * y la burbuja, abajo a la izquierda, se le sentaba encima. Mismo criterio que
 * en el inicio: un solo flotante por pantalla, el del asistente. Lo marca cada
 * ruta con `meta.sinFabResena` (`src/router/routes.ts`) y no una comparación
 * de `route.path`, que en producción vale `/services/` con barra final.
 */
const mostrarFabResena = computed(
  () => showReviewButton.value && !route.meta.sinFabResena,
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

const whoWeAreDialogComponent = ref(false);
const ourContactDialog = ref(false);

/**
 * M11: arrancan en lo que prerenderiza el SSG (rótulos a la vista, sin
 * hamburguesa) y la ventana real llega al montar. Antes los rótulos se
 * sembraban con `matchMedia` en `setup` —desajuste de hidratación en un
 * teléfono— y se escuchaban con `addEventListener` directo, que revienta en
 * Safari 13.1.
 */
const showButtonLabels = useConsultaMedios(
  `(min-width: ${BREAKPOINT_LABELS_PX}px)`,
  true
);
const esMovil = useConsultaMedios(CONSULTA_MENU_MOVIL, false);

// --- Menú «Más» -----------------------------------------------------------
//
// El modelo lo da `seccionesDelMenu` (src/composables/shared/menuMas.ts), lo
// pinta `MenuMasContenido` dentro de dos envoltorios —el `q-menu` de arriba
// desde 700 px y `MenuMasHoja` por debajo— y lo que se hace al elegir se
// resuelve aquí, que es donde viven los diálogos y la sesión.

const menuAbierto = ref(false);
const hojaAbierta = ref(false);
const horarioHoy = ref('');

const seccionesMenu = computed(() =>
  seccionesDelMenu({
    isLoggedIn: authStore.isLoggedIn,
    isAdmin: authStore.isAdmin,
    redirect: route.fullPath || '/services',
  })
);

/**
 * M9: el horario de hoy se calcula al ABRIR el menú, no en `setup`: así no
 * descuadra el HTML prerenderizado ni se queda con el día de ayer si la pestaña
 * pasa la medianoche abierta.
 */
function refrescarHorario() {
  const { abre, cierra } = horarioDeHoy();
  horarioHoy.value = `${abre} a ${cierra}`;
}

/** En escritorio el `q-menu` se abre solo al pulsar su botón padre. */
function alPulsarMas() {
  if (!esMovil.value) return;
  refrescarHorario();
  hojaAbierta.value = true;
}

/**
 * Toda entrada pasa por aquí, también los enlaces: el menú se cierra primero
 * —incluso si la entrada lleva a la página en la que ya se está, donde el
 * `<router-link>` no navega— y después se resuelve la acción, si la hay. Las
 * entradas con destino navegan solas.
 */
function alElegirEntrada(entrada: EntradaMenu) {
  menuAbierto.value = false;
  hojaAbierta.value = false;
  if (entrada.accion === 'quienes-somos') {
    whoWeAreDialogComponent.value = true;
  } else if (entrada.accion === 'horarios') {
    ourContactDialog.value = true;
  } else if (entrada.accion === 'cerrar-sesion') {
    void onLogout();
  }
}

/**
 * Al cruzar los 700 px con el menú abierto (girar el teléfono, estrechar la
 * ventana) se cierran los dos: el `q-menu` se desmontaría con `menuAbierto` en
 * `true` y el botón seguiría diciendo `aria-expanded="true"`, y la hoja
 * volvería a saltar sola al estrechar.
 */
watch(esMovil, () => {
  menuAbierto.value = false;
  hojaAbierta.value = false;
});

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
});

const serviceHomeButton = ref<HeaderActionButton>({
  icon: 'las la-cut',
  label: 'Servicios',
  class: 'color-bar',
  method: () => router.push('/services'),
});

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

/**
 * El disparador de «Más» (M6). El filete transparente reserva su píxel: al
 * abrirse el botón se pinta en nieve con filete sin cambiar de tamaño, y la
 * cabecera no se mueve.
 */
.main-header__mas {
  min-height: var(--m-tactil-min);
  border: var(--m-filete-grosor) solid transparent;
}

.main-header__mas--abierto {
  background: var(--m-nieve);
  border-color: var(--m-filete);
}

.main-header__mas-rotulo {
  margin-left: 7px;
}

.main-header__chevron {
  flex: 0 0 auto;
  transition: transform var(--m-transicion-pulsar) ease;
}

.main-header__mas--abierto .main-header__chevron {
  transform: rotate(180deg);
}

@media (prefers-reduced-motion: reduce) {
  .main-header__chevron {
    transition: none;
  }
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


  // La hamburguesa: 44 × 44, como en el tablero móvil.
  .main-header__mas {
    min-width: var(--m-tactil-min);
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

/**
 * Realce al pasar (solo puntero fino): el COLOR. El movimiento —subir 1 px con
 * sombra suave, hundirse a 0,96 al pulsar— es global, en `app.scss`
 * («Realce y hundido»).
 */
@media (hover: hover) and (pointer: fine) {
  // Navegación plana sobre hueso: el dorado legible es el profundo (5,5:1).
  .main-header__link:hover {
    color: var(--m-oro-profundo);
  }

  // «Reservar», tinta maciza: el rótulo se enciende en oro (5,8:1 sobre tinta).
  // Es un `q-btn`: de la regla global solo recibe el hundido.
  .main-header__cta:hover {
    color: var(--m-oro);
  }
}
</style>

<!--
  Sin `scoped` a propósito. Quasar teletransporta el menú al `body`, así que su
  raíz (`.q-menu`) no lleva el atributo de ámbito del componente y ninguna regla
  scoped la alcanza. Las clases van prefijadas, así que no se escapan. Aquí solo
  vive el MARCO del desplegable; lo de dentro es de `MenuMasContenido.vue`.
-->
<style lang="scss">
/**
 * El desplegable de «Más» desde 700 px (M6, M12; tablero
 * MenuSeccionesEscritorio): tarjeta de nieve de 344 px con filete y la sombra de
 * capa flotante. Se conservan `.more-menu` y `.more-menu__list`, que es por
 * donde lo busca `tests/browser-compat/index-layout.spec.ts`.
 *
 * El techo de alto sustituye al 65vh de Quasar: con las cuatro secciones de la
 * dueña, 65vh de una ventana de 900 px cortaba el pie. 88 px = cabecera de
 * 68 + aire.
 */
.more-menu {
  width: 344px;
  max-width: calc(100vw - 32px);
  max-height: calc(100vh - 88px);
  background: var(--m-nieve);
  border: var(--m-filete-grosor) solid var(--m-filete);
  border-radius: var(--m-radio-tarjeta);
  box-shadow: var(--m-sombra-flotante);
}
</style>
