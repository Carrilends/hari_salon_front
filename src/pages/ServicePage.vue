<template>
  <q-page class="mostrador">
    <ServiceToolbar
      :total="totalServices"
      :mostrados="services.length"
      :busqueda="filterService.name"
      :filtros-activos="externalAmountOfFilters"
      :es-admin="authStore.isAdmin"
      @update:busqueda="alBuscar"
      @abrir-filtros="showFilterDialog = true"
      @crear-servicio="dialogCreation = true"
    />

    <div class="mostrador__cuerpo">
      <!--
        La ficha tumbada de móvil y la rejilla de tarjetas siguen aquí tal como
        estaban: las sustituyen `ServiceRow.vue` y `ServiceCardsGrid.vue` en la
        fase B. Lo único que cambia es que ya no van dentro de un
        caja de scroll interno de altura calculada (D4).
      -->
      <q-list v-if="esListaMovil" class="mostrador__lista">
        <q-item
          v-for="(service, index) in services"
          :key="`${index}_${service.id}`"
          dense
          class="mostrador__renglon"
        >
          <q-item-section avatar class="mostrador__avatar-hueco">
            <q-avatar rounded size="52px" class="mostrador__avatar">
              <img
                :src="serviceImageUrl(service)"
                :srcset="serviceImageSrcset(service)"
                sizes="52px"
                :alt="`Imagen del servicio ${service.name}`"
                loading="lazy"
                decoding="async"
                width="52"
                height="52"
              />
            </q-avatar>
          </q-item-section>
          <q-item-section class="mostrador__renglon-texto">
            <q-item-label lines="2" class="mostrador__renglon-nombre">
              {{ service.name }}
            </q-item-label>
            <q-item-label caption class="mostrador__renglon-precio">
              <div class="row items-center no-wrap">
                <PriceDisplayPill :amount="service.price" dense />
                <ServicePromoButton
                  :have-promotion="service.havePromotion"
                  :porcentage-discount="Number(service.porcentageDiscount ?? 0)"
                  placement="inline"
                  @promo-click="handlePromotionAction(service)"
                />
              </div>
            </q-item-label>
          </q-item-section>
          <q-item-section side top class="mostrador__renglon-lado">
            <div class="column q-gutter-xs mostrador__renglon-acciones">
              <q-btn
                v-if="authStore.isAdmin"
                flat
                dense
                no-caps
                size="sm"
                padding="xs sm"
                color="indigo-6"
                label="Editar"
                @click.stop="openEditService(service.id)"
              />
              <q-btn
                flat
                dense
                no-caps
                size="sm"
                padding="xs sm"
                color="primary"
                label="Detalle"
                @click.stop="openServiceDetail(service.id)"
              />
              <q-btn
                v-if="authStore.isAdmin"
                flat
                dense
                no-caps
                size="sm"
                padding="xs sm"
                color="negative"
                label="Eliminar"
                @click.stop="confirmDeleteService(service.id)"
              />
            </div>
          </q-item-section>
        </q-item>
      </q-list>

      <div v-else class="mostrador__rejilla">
        <div
          v-for="(service, index) in services"
          :key="`${index}_${service.id}`"
          class="mostrador__celda"
        >
          <TabsByEachService
            @detail-service="() => (serviceIdRef = service.id)"
            @delete-service="fetchServices"
            @edit-service="() => openEditService(service.id)"
            @promo-service="() => handlePromotionAction(service)"
            :props="{
              id: service.id,
              name: service.name,
              precio: service.price,
              url: serviceCardImageUrl(service),
              havePromotion: service.havePromotion,
              porcentageDiscount: service.porcentageDiscount,
            }"
            :selected="true"
          />
        </div>
      </div>
    </div>

    <ServicePagerBar
      :pagina="filterService.page"
      :total-paginas="totalPages"
      :mostrados="services.length"
      :total="totalServices"
      @update:pagina="filterService.page = $event"
    />

    <ServiceFilterDialog
      v-model:dialog="showFilterDialog"
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
import TabsByEachService from 'src/components/servicePage/TabsByEachService.vue';
import ServiceToolbar from 'src/components/servicePage/ServiceToolbar.vue';
import ServicePagerBar from 'src/components/servicePage/ServicePagerBar.vue';
import ServicePromoButton from 'src/components/servicePage/ServicePromoButton.vue';
import PriceDisplayPill from 'src/components/shared/PriceDisplayPill.vue';
import type Service from 'src/interfaces/service';
import ServiceFilterDialog from 'src/components/dialogs/serviceFilterDialog.vue';
import { FilterService } from 'src/composables/dialogs/useServiceFilter';
import { useFiltersStore } from 'src/stores/filters-store';
import serviceCreateEdit from 'src/components/dialogs/serviceCreateEdit.vue';

import type { IndexSection } from 'src/constants/index-sections';
import { useAuthStore } from 'src/stores/auth-store';
import { useBookStore } from 'src/stores/book-store';
import { adminServiceApi } from 'src/api/services-api';
import { serviceIsOnPromotion } from 'src/helpers/service-promotion';
import { useOptions } from 'src/composables/shared/useOptions';
import { PLACEHOLDER_IMAGE } from 'src/constants/placeholder-image';
import { useOptionsStore } from 'src/stores/options-store';
import { useSeo } from 'src/composables/seo/useSeo';
import { servicesSchema } from 'src/composables/seo/structuredData';
import {
  buildCloudinarySrcset,
  optimizeCloudinaryUrl,
} from 'src/helpers/cloudinaryHelpers';

useOptions();
const optionsStore = useOptionsStore();

const filtersStore = useFiltersStore();
const authStore = useAuthStore();
const bookStore = useBookStore();

const { services, filterService, totalPages, totalServices, refetch } =
  useServices();

const { esListaMovil } = useServiceViewport();

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

const openEditService = (id: string) => {
  if (!authStore.isAdmin) return;
  serviceIdEditRef.value = '';
  void nextTick(() => {
    serviceIdEditRef.value = id;
  });
};

const showFilterDialog = ref(false);
const externalAmountOfFilters = ref(0);

const DEFAULT_SERVICE_IMAGE = PLACEHOLDER_IMAGE;

const $q = useQuasar();

const serviceImageUrl = (service: Service) =>
  optimizeCloudinaryUrl(service.images?.[0]?.url, 120) || DEFAULT_SERVICE_IMAGE;

/**
 * La vista de tarjetas servía la URL cruda de Cloudinary mientras la de lista
 * sí la optimizaba: la misma foto, a tamaño original, para pintar una tarjeta.
 * 480 px cubre la tarjeta más ancha de la rejilla.
 */
const serviceCardImageUrl = (service: Service) =>
  optimizeCloudinaryUrl(service.images?.[0]?.url, 480);

const serviceImageSrcset = (service: Service) =>
  buildCloudinarySrcset(service.images?.[0]?.url, [60, 120, 240]);

const openServiceDetail = (id: string) => {
  serviceIdRef.value = id;
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
  filtersStore.setGenres(genreIds);
  filtersStore.setServicesExternal(serviceIds);
  if (genreIds.length > 0 && filtersStore.selectedGenres.length === 0) {
    console.warn(
      '[ServicePage] Atajo del inicio con IDs de género no encontrados en optionsStore.genres:',
      genreIds
    );
  }
  filterService.value.selectedGenres = filtersStore.selectedGenres.map(
    (g) => g.id
  );
  filterService.value.selectedServicesIDs = serviceIds;
  filterService.value.includePriceRange = false;
  filterService.value.includePromotionsOnly = false;
  filterService.value.page = 1;
  externalAmountOfFilters.value =
    filtersStore.selectedGenres.length +
    filtersStore.selectedServicesIDs.length;
  showFilterDialog.value = true;
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

const fetchServices = (e: FilterService | string) => {
  if (typeof e === 'string') {
    refetch.value++;
  } else {
    showFilterDialog.value = false;
    filterService.value.selectedGenres = e.selectedGenres;
    filterService.value.selectedServicesIDs = e.selectedServicesIDs;
    filterService.value.includePriceRange = e.includePriceRange;
    filterService.value.includePromotionsOnly = e.includePromotionsOnly;
    filterService.value.prices.min = e.prices.min;
    filterService.value.prices.max = e.prices.max;
  }
};

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
}

.mostrador__rejilla {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 350px));
  gap: var(--m-rejilla-gap);
  justify-content: center;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.mostrador__celda {
  display: flex;
  justify-content: center;
  width: 100%;
  min-width: 0;
}

/**
 * La ficha tumbada de móvil, lo justo para que no quede blanca sobre tinta. La
 * reescribe `ServiceRow.vue` en la fase B; los tres botones de dentro siguen
 * con los colores de Quasar hasta que la fase E los sustituya.
 */
.mostrador__lista {
  background: var(--m-carbon);
  border: var(--m-filete-grosor) solid var(--m-filete-oscuro);
  border-radius: var(--m-radio-tarjeta);
  color: var(--m-hueso);
}

.mostrador__renglon {
  min-height: 72px;
}

.mostrador__renglon + .mostrador__renglon {
  border-top: var(--m-filete-grosor) solid var(--m-filete-oscuro);
}

.mostrador__avatar-hueco {
  min-width: 52px;
}

.mostrador__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.mostrador__renglon-texto {
  min-width: 0;
}

.mostrador__renglon-nombre {
  font-size: 0.875rem;
  font-weight: 500;
}

.mostrador__renglon-lado {
  flex-shrink: 0;
  padding-left: 4px;
}

.mostrador__renglon-acciones {
  align-items: stretch;
  min-width: 5.5rem;
}

.mostrador__renglon-precio :deep(.cop-price-pill--dense .cop-price-pill__amount) {
  font-size: 0.8125rem;
}

.mostrador__renglon-precio :deep(.cop-price-pill--dense .cop-price-pill__suffix) {
  font-size: 0.5rem;
}

.mostrador__renglon-precio :deep(.cop-price-pill) {
  margin-top: 2px;
}

@media (max-width: 699px) {
  .mostrador {
    padding: 0 var(--m-banda-margen-movil) 28px;
  }

  .mostrador__cuerpo {
    padding: 16px 0 8px;
  }

  .mostrador__rejilla {
    gap: var(--m-rejilla-gap-movil);
  }
}
</style>
