<template>
  <q-page class="mostrador">
    <ServiceToolbar
      :total="totalServices"
      :mostrados="services.length"
      :busqueda="filterService.name"
      :filtros-activos="externalAmountOfFilters"
      :es-admin="authStore.isAdmin"
      :con-carril="hayCarril"
      @update:busqueda="alBuscar"
      @abrir-filtros="showFilterDialog = true"
      @crear-servicio="dialogCreation = true"
    />

    <div class="mostrador__cuerpo">
      <!--
        El carril decide por sí mismo si le toca pintarse (D1): por debajo de su
        ancho no pinta nada y la lista se queda con toda la fila.
      -->
      <ServiceFilterRail
        @aplicar="fetchServices"
        @update:amount="externalAmountOfFilters = $event"
      />
      <div class="mostrador__lista">
        <!--
          La ranura `acciones` se queda vacía hasta la fase E (D-B6): allí van
          los tres botones de administración (`ServiceCardAdminActions`).
        -->
        <ServiceCardsGrid
          :servicios="services"
          :columnas="columnas"
          :renglones="esListaMovil"
          :cargando="isLoading"
          :recargando="recargandoLista"
          :error="Boolean(error)"
          :hay-filtros="hayFiltrosActivos"
          @detalle="openServiceDetail"
          @limpiar-filtros="limpiarFiltros"
          @reintentar="reintentar"
        />
      </div>
    </div>

    <ServicePagerBar
      :pagina="filterService.page"
      :total-paginas="totalPages"
      :mostrados="services.length"
      :total="totalServices"
      @update:pagina="alCambiarPagina"
    />

    <ServiceFilterDialog
      v-model:dialog="showFilterDialog"
      :total="totalServices"
      @update:amount="externalAmountOfFilters = $event"
      @update:services="fetchServices"
    />
    <service-create-edit v-model="dialogCreation" />
  </q-page>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  watch,
} from 'vue';
import { useQuasar } from 'quasar';
import { useServices } from 'src/composables/services/useServices';
import { useServiceViewport } from 'src/composables/services/useServiceViewport';
import {
  deleteService,
  getService,
  useService,
  useServiceForEdition,
} from 'src/composables/services/useService';
import ServiceCardsGrid from 'src/components/servicePage/ServiceCardsGrid.vue';
import ServiceToolbar from 'src/components/servicePage/ServiceToolbar.vue';
import ServicePagerBar from 'src/components/servicePage/ServicePagerBar.vue';
import type Service from 'src/interfaces/service';
import ServiceFilterDialog from 'src/components/dialogs/serviceFilterDialog.vue';
import ServiceFilterRail from 'src/components/servicePage/ServiceFilterRail.vue';
import { FilterService } from 'src/composables/dialogs/useServiceFilter';
import { useDialogMaximizedBelow } from 'src/composables/dialogs/useDialogMaximizedBelow';
import { ANCHO_CARRIL_PX, useFiltersStore } from 'src/stores/filters-store';
import serviceCreateEdit from 'src/components/dialogs/serviceCreateEdit.vue';

import type { IndexSection } from 'src/constants/index-sections';
import { useAuthStore } from 'src/stores/auth-store';
import { useBookStore } from 'src/stores/book-store';
import { adminServiceApi } from 'src/api/services-api';
import { serviceIsOnPromotion } from 'src/helpers/service-promotion';
import { useOptions } from 'src/composables/shared/useOptions';
import { useOptionsStore } from 'src/stores/options-store';
import { useSeo } from 'src/composables/seo/useSeo';
import { servicesSchema } from 'src/composables/seo/structuredData';

useOptions();
const optionsStore = useOptionsStore();

const filtersStore = useFiltersStore();
const authStore = useAuthStore();
const bookStore = useBookStore();

const {
  services,
  filterService,
  totalPages,
  totalServices,
  refetch,
  isLoading,
  isFetching,
  error,
} = useServices();

// D9: los cortes de ancho son del composable. Renglones solo por debajo de
// 501 px; entre 501 y 759 px, una columna de tarjetas.
const { esListaMovil, columnas } = useServiceViewport();

useSeo({
  title: 'Servicios | Peluquería Marlene',
  description:
    'Descubre todos nuestros servicios de peluquería: cortes de cabello, coloración, alisados, barbería, maquillaje, uñas y más. Reserva online en pocos pasos.',
  path: '/services',
  jsonLd: computed(() =>
    servicesSchema(
      (services.value || []).slice(0, 20).map((service) => ({
        name: service.name,
        description: service.detail?.description,
        price: service.price,
      })),
    ),
  ),
});
const { serviceIdRef } = useService();
const { serviceIdEditRef } = useServiceForEdition();
const dialogCreation = ref(false);

/**
 * ATENCIÓN · deuda de la fase B. Estos manejadores se quedan **sin consumidor**
 * hasta la fase E, que pinta los botones de administración dentro de la ranura
 * `acciones` de la rejilla: `openEditService`, `confirmDeleteService` y
 * `handlePromotionAction` (con `askPromotionPercentage`, `askPromotionRemoval`,
 * `applyPromotionToService`, `buildPromotionPayload` y `normalizeServiceTags`).
 *
 * No se borran por una razón concreta: `applyPromotionToService` es quien llama
 * a `bookStore.syncBookingWithService(fresh)` (§6.1 de la hoja de ruta), y
 * perder esa llamada deja una reserva en curso con el precio viejo.
 *
 * En este repo `@typescript-eslint/no-unused-vars` es un **error**, no un aviso:
 * por eso los tres que se quedan sin uso llevan su `eslint-disable-next-line`,
 * que la fase E retira al volver a consumirlos.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- lo retira la fase E (D-B6)
const openEditService = (id: string) => {
  if (!authStore.isAdmin) return;
  serviceIdEditRef.value = '';
  void nextTick(() => {
    serviceIdEditRef.value = id;
  });
};

const showFilterDialog = ref(false);
const externalAmountOfFilters = ref(0);

/**
 * Desde el ancho del carril los filtros son el carril (D1) y la barra pierde su
 * botón: la hoja no se pinta por encima de ese ancho. El carril y la hoja
 * deciden cada uno si les toca; esto solo sirve para la barra y para el atajo
 * del inicio. Mismo corte y misma consulta que ellos, importados del store.
 */
const { maximized: esHojaFiltros } = useDialogMaximizedBelow(ANCHO_CARRIL_PX);
const hayCarril = computed(() => !esHojaFiltros.value);

/**
 * Ir a otra ruta y volver conserva `filters-store`, pero `useServices` arranca
 * con su filtro en blanco: el carril pintaría un género elegido sobre una lista
 * sin filtrar, y la barra diría cero filtros. Se copia el store una sola vez,
 * al arrancar; el atajo del inicio, si lo hay, lo pisa después.
 */
const filtroDelStore = (): FilterService => ({
  selectedGenres: filtersStore.selectedGenres.map((g) => g.id),
  selectedServicesIDs: [...filtersStore.selectedServicesIDs],
  includePriceRange: filtersStore.includePriceRange,
  includePromotionsOnly: filtersStore.includePromotionsOnly,
  prices: { ...filtersStore.prices },
});

/** El único sitio que escribe estos cinco campos en la consulta de la lista. */
const aplicarAlFiltro = (filtro: FilterService) => {
  filterService.value.selectedGenres = filtro.selectedGenres;
  filterService.value.selectedServicesIDs = filtro.selectedServicesIDs;
  filterService.value.includePriceRange = filtro.includePriceRange;
  filterService.value.includePromotionsOnly = filtro.includePromotionsOnly;
  filterService.value.prices.min = filtro.prices.min;
  filterService.value.prices.max = filtro.prices.max;
};

const copiarFiltroDelStore = () => {
  aplicarAlFiltro(filtroDelStore());
  externalAmountOfFilters.value = filtersStore.cantidadFiltros;
};
if (filtersStore.cantidadFiltros > 0) copiarFiltroDelStore();

const $q = useQuasar();

const openServiceDetail = (id: string) => {
  serviceIdRef.value = id;
};

/**
 * La recarga (otra página, o un filtro nuevo) no es la primera carga: con
 * `placeholderData: previousData` las filas anteriores siguen puestas, así que
 * se avisa con una línea discreta y **no** con el esqueleto (§6.3).
 */
const recargandoLista = computed(() => isFetching.value && !isLoading.value);

/** Para decidir si el vacío ofrece «Limpiar filtros» o solo explica. */
const hayFiltrosActivos = computed(
  () =>
    externalAmountOfFilters.value > 0 ||
    filterService.value.includePriceRange ||
    filterService.value.includePromotionsOnly ||
    Boolean(filterService.value.name)
);

/**
 * Limpiar escribe en `filters-store`, que es el estado compartido (§6.2), y no
 * en una copia local: el carril y la hoja leen de ahí. El vaciado es el mismo
 * que hace «Limpiar» del carril y de la hoja —rango incluido, de vuelta a la
 * escala completa—, así que los tres coinciden después.
 */
const limpiarFiltros = () => {
  filtersStore.limpiarFiltros();
  filterService.value.name = '';
  aplicarAlFiltro(filtroDelStore());
  filterService.value.page = 1;
  externalAmountOfFilters.value = 0;
};

/** El botón «Reintentar»: `refetch` forma parte de la clave de la consulta. */
const reintentar = () => {
  refetch.value++;
};

/**
 * Buscar vuelve a la primera página. Hoy no lo hacía: buscando desde la página
 * 3, el backend devuelve `[]` para un término que sí tiene resultados y la
 * lista se queda en blanco.
 */
const alBuscar = (texto: string) => {
  filterService.value.name = texto;
  filterService.value.page = 1;
};

/**
 * Desde que la página entera desplaza (D4), el pie queda al final de la lista:
 * cambiar de página sin subir deja a la visitante mirando el pie de la página
 * nueva. Detrás de la guarda porque `build:ssg` prerenderiza sin `window`.
 */
const alCambiarPagina = (pagina: number) => {
  filterService.value.page = pagina;
  if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
};

type HistoryStateWithService = { service?: IndexSection };
const indexShortcutCard =
  typeof history !== 'undefined'
    ? (history.state as HistoryStateWithService | null | undefined)?.service
    : undefined;

/** Solo se consume una vez al llegar desde el índice con `router.push({ state })`. */
const indexShortcutPending = ref(!!indexShortcutCard);

function applyShortcutFromIndex(card: IndexSection) {
  const genreIds = card.filterFormat?.genres ?? [];
  const serviceIds = card.filterFormat?.services ?? [];
  // El atajo es un filtro nuevo: un interruptor o un rango que se quedara en el
  // store saldría marcado en el carril sin estar aplicado a la lista.
  filtersStore.limpiarFiltros();
  filtersStore.setGenres(genreIds);
  filtersStore.setServicesExternal(serviceIds);
  if (genreIds.length > 0 && filtersStore.selectedGenres.length === 0) {
    console.warn(
      '[ServicePage] Atajo del inicio con IDs de género no encontrados en optionsStore.genres:',
      genreIds
    );
  }
  aplicarAlFiltro(filtroDelStore());
  filterService.value.page = 1;
  externalAmountOfFilters.value = filtersStore.cantidadFiltros;
  /**
   * Con el carril (D1) no hay nada que abrir en escritorio: los filtros ya se
   * ven. Por debajo de su ancho se abre la hoja, como hasta ahora.
   */
  showFilterDialog.value = !hayCarril.value;
}

watch(
  () =>
    optionsStore.principalServices.length > 0 &&
    optionsStore.genres.length > 0,
  (ready) => {
    if (!indexShortcutCard || !indexShortcutPending.value || !ready) return;
    indexShortcutPending.value = false;
    applyShortcutFromIndex(indexShortcutCard);
  },
  { immediate: true }
);

/**
 * Recibe el filtro del carril y de la hoja. Ya NO cierra la hoja: aplica en
 * cada toque (D1), y cerrarla aquí la bajaría con cada chip. La cierran su pie
 * («Ver N servicios») y su aspa.
 */
const fetchServices = (e: FilterService | string) => {
  if (typeof e === 'string') {
    refetch.value++;
  } else {
    aplicarAlFiltro(e);
    /**
     * Con aplicación instantánea esto pasa a cada clic del carril: sin volver a
     * la página 1, filtrar estando en la 3 deja la lista vacía y parece que el
     * filtro no encontró nada.
     */
    filterService.value.page = 1;
  }
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- lo retira la fase E (D-B6)
const confirmDeleteService = (id: string) => {
  if (!authStore.isAdmin) return;
  $q.dialog({
    title: 'Eliminar servicio',
    message: '¿Está seguro de que desea eliminar este servicio?',
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      await deleteService(id);
      $q.notify({
        type: 'positive',
        message: 'Servicio eliminado correctamente',
      });
    } catch {
      $q.notify({
        type: 'negative',
        message: 'Error al eliminar el servicio',
      });
      return;
    }
    fetchServices('delete_service');
  });
};

type ServiceTagInput = string | { id?: string };

const normalizeServiceTags = (service: Service): string[] =>
  ((service.tags as unknown as ServiceTagInput[]) || [])
    .map((tag) => (typeof tag === 'string' ? tag : tag?.id || ''))
    .filter((id) => Boolean(id));

const buildPromotionPayload = (
  service: Service,
  havePromotion: boolean,
  porcentageDiscount: number
) => ({
  name: service.name,
  detail: {
    id: service.detail?.id,
    description: service.detail?.description,
    specifications: service.detail?.specifications,
  },
  price: Number(service.price || 0),
  images: service.images || [],
  tags: normalizeServiceTags(service),
  havePromotion,
  porcentageDiscount,
});

const applyPromotionToService = async (
  service: Service,
  havePromotion: boolean,
  porcentageDiscount: number
) => {
  $q.loading.show({
    message: havePromotion ? 'Aplicando promoción...' : 'Quitando promoción...',
    spinnerColor: 'negative',
  });
  try {
    const payload = buildPromotionPayload(service, havePromotion, porcentageDiscount);
    await adminServiceApi.patch(`/service/${service.id}`, payload);
    const fresh = await getService(service.id);
    bookStore.syncBookingWithService(fresh);
    fetchServices('promotion_update');
    $q.notify({
      type: 'positive',
      message: havePromotion
        ? `Promoción ${porcentageDiscount}% aplicada`
        : 'Promoción retirada',
      position: 'top',
    });
  } catch {
    $q.notify({
      type: 'negative',
      message: 'No se pudo actualizar la promoción del servicio',
      position: 'top',
    });
  } finally {
    $q.loading.hide();
  }
};

const askPromotionPercentage = (service: Service) => {
  const defaultValue = Math.min(
    100,
    Math.max(1, Math.round(Number(service.porcentageDiscount || 10)))
  );
  $q.dialog({
    title: 'Activar promoción',
    message: 'Ingresa el porcentaje de descuento (1-100)',
    prompt: {
      model: String(defaultValue),
      type: 'number',
      isValid: (val) => {
        const pct = Number(val);
        return Number.isFinite(pct) && pct >= 1 && pct <= 100;
      },
    },
    ok: {
      label: 'Aplicar',
      color: 'negative',
      unelevated: true,
    },
    cancel: true,
    persistent: true,
  }).onOk((value) => {
    const pct = Math.round(Number(value));
    if (!Number.isFinite(pct) || pct < 1 || pct > 100) {
      $q.notify({
        type: 'warning',
        message: 'Ingresa un porcentaje válido entre 1 y 100',
        position: 'top',
      });
      return;
    }
    void applyPromotionToService(service, true, pct);
  });
};

const askPromotionRemoval = (service: Service) => {
  $q.dialog({
    title: 'Quitar promoción',
    message: '¿Deseas quitar la promoción de este servicio?',
    ok: {
      label: 'Quitar',
      color: 'negative',
      unelevated: true,
    },
    cancel: true,
    persistent: true,
  }).onOk(() => {
    void applyPromotionToService(service, false, 0);
  });
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- lo retira la fase E (D-B6)
const handlePromotionAction = (service: Service) => {
  if (!(authStore.isLoggedIn && authStore.isAdmin)) return;
  if (serviceIsOnPromotion(service)) {
    askPromotionRemoval(service);
    return;
  }
  askPromotionPercentage(service);
};

/**
 * El riel dorado es del documento, no de un `<div>`: desde que la página dejó
 * su scroll interno (D4), el que desplaza es `html`. Se enciende al entrar y se
 * apaga al salir para que el oro no se cuele en las bandas claras del inicio.
 * La regla vive en `app.scss` (`html.m-riel-oro`).
 */
onMounted(() => {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.add('m-riel-oro');
});

onUnmounted(() => {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.remove('m-riel-oro');
});


defineOptions({
  name: 'ServicePage',
});
</script>

<style lang="scss" scoped>
/**
 * «El mostrador»: el nombre interno del armazón, que es como lo rotula el
 * tablero de escritorio del lienzo. El `<h1>` dice «Servicios», que es lo que
 * se busca y lo que publica el `<title>`.
 *
 * Columna, y no fila dentro de una caja: la caja gris con sombra lila era lo que
 * hacía que la página pareciera un formulario dentro de otra página. El fondo
 * tinta se declara aquí porque el `q-layout` lleva una foto de fondo.
 */
.mostrador {
  display: flex;
  flex-direction: column;
  padding: 0 var(--m-banda-margen) 40px;
  background: var(--m-tinta);
  color: var(--m-hueso);
  font-family: var(--m-font-sans);
}

.mostrador__cuerpo {
  // Se come el alto sobrante para que el pie quede al final y no flotando a
  // media pantalla: `q-page` recibe un `min-height` de Quasar.
  flex: 1 0 auto;
  min-width: 0;
  padding: 22px 0 10px;
  // Carril a la izquierda y lista al lado (D1). Sin carril, el `v-if` del
  // carril no deja ningún elemento y la lista ocupa la fila entera.
  display: flex;
  align-items: flex-start;
  gap: 24px;
}

.mostrador__lista {
  flex: 1 1 auto;
  // Sin esto la rejilla no encoge por debajo de su contenido y empuja la
  // página hacia la derecha.
  min-width: 0;
}

@media (max-width: 699px) {
  .mostrador {
    padding: 0 var(--m-banda-margen-movil) 28px;
  }

  .mostrador__cuerpo {
    padding: 16px 0 8px;
  }
}
</style>
