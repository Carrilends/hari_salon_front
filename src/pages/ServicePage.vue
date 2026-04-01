<template>
  <q-page class="row full-width items-start q-px-lg q-pt-md">
    <div class="col-12 box-style service-header-box q-my-sm">
      <div class="service-header-inner">
        <transition name="service-header-fade" mode="out-in">
          <div
            v-if="isCompactSearch && compactSearchOverlayOpen"
            key="search-overlay"
            class="compact-search-overlay"
          >
            <q-btn
              flat
              round
              dense
              color="grey-8"
              icon="close"
              aria-label="Cerrar búsqueda"
              class="compact-search-overlay-close"
              @click="compactSearchOverlayOpen = false"
            />
            <q-input
              ref="compactSearchInputRef"
              dense
              filled
              clearable
              color="blue"
              debounce="1000"
              placeholder="Buscar servicio…"
              v-model="filterService.name"
              class="compact-search-overlay-input"
              @keyup.enter="compactSearchOverlayOpen = false"
            >
              <template v-slot:before>
                <q-icon name="search" color="blue" />
              </template>
            </q-input>
          </div>
          <div
            v-else
            key="heading-row"
            class="service-page-heading"
            :class="{ 'service-page-heading--compact': isCompactSearch }"
          >
            <div
              class="service-heading-search"
              :class="{ 'service-heading-search--expanded': !isCompactSearch }"
            >
              <q-input
                v-if="!isCompactSearch"
                dense
                filled
                clearable
                color="blue"
                debounce="1000"
                label="Busca por nombre del servicio"
                v-model="filterService.name"
                class="full-width service-heading-search-input"
              >
                <template v-slot:before>
                  <q-icon name="search" />
                </template>
              </q-input>
              <q-btn
                v-else
                round
                flat
                color="blue"
                icon="search"
                aria-label="Buscar por nombre"
                @click="openCompactSearchOverlay"
              />
            </div>
            <div
              class="service-heading-actions"
              :class="{ 'service-heading-actions--compact': isCompactSearch }"
            >
              <q-btn
                v-if="authStore.isLoggedIn"
                @click="dialogCreation = true"
                color="indigo-5"
                icon="las la-plus"
                :label="showActionButtonLabels ? 'Crear' : undefined"
                :round="!showActionButtonLabels"
                :rounded="showActionButtonLabels"
              />
              <div class="filter-badge-wrapper">
                <q-btn
                  @click="showFilterDialog = true"
                  class="color-bar"
                  icon="las la-filter"
                  :label="showActionButtonLabels ? 'Filtros' : undefined"
                  :round="!showActionButtonLabels"
                  :rounded="showActionButtonLabels"
                  flat
                />
                <q-badge
                  v-if="externalAmountOfFilters > 0"
                  color="red"
                  rounded
                  floating
                  class="filter-badge-count"
                >
                  {{ externalAmountOfFilters > 9 ? '9+' : externalAmountOfFilters }}
                </q-badge>
              </div>
            </div>
          </div>
        </transition>
      </div>
    </div>
    <div class="col-12 box-style service-body-box">
      <div v-if="isListLayout" class="service-body-mobile q-py-lg">
        <q-list
          bordered
          separator
          class="service-list-mobile rounded-borders q-mx-sm"
        >
          <q-item
            v-for="(service, index) in services"
            :key="`${index}_${service.id}`"
            dense
            class="service-list-item"
          >
            <q-item-section avatar class="service-list-avatar-wrap">
              <q-avatar rounded size="52px" class="service-list-avatar">
                <img
                  :src="serviceImageUrl(service)"
                  :alt="service.name"
                  loading="lazy"
                />
              </q-avatar>
            </q-item-section>
            <q-item-section class="service-list-main">
              <q-item-label lines="2" class="text-body2 text-weight-medium">
                {{ service.name }}
              </q-item-label>
              <q-item-label caption class="q-mt-xs service-list-price">
                <PriceDisplayPill :amount="service.price" dense />
              </q-item-label>
            </q-item-section>
            <q-item-section side top class="service-list-side">
              <div class="service-list-actions column q-gutter-xs">
                <q-btn
                  v-if="authStore.isLoggedIn"
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
                  v-if="authStore.isLoggedIn"
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
      </div>
      <q-scroll-area
        v-else
        class="service-scroll-area q-py-lg"
        :style="{ height: `${desktopScrollBodyPx}px` }"
        :thumb-style="thumbStyle"
      >
        <div class="service-cards-grid q-px-md">
          <div
            v-for="(service, index) in services"
            :key="`${index}_${service.id}`"
            class="service-card-cell"
          >
            <TabsByEachService
              @detail-service="() => (serviceIdRef = service.id)"
              @delete-service="fetchServices"
              @edit-service="() => openEditService(service.id)"
              :props="{
                id: service.id,
                name: service.name,
                precio: service.price,
                url: service.images[0]?.url,
              }"
              :selected="true"
            />
          </div>
        </div>
      </q-scroll-area>
    </div>
    <div class="col-12 flex flex-center box-style" style="padding: 10px 0">
      <q-pagination
        v-model="filterService.page"
        color="blue"
        :max="totalPages"
        direction-links
      />
    </div>
    <ServiceFilterDialog
      v-model:dialog="showFilterDialog"
      @update:amount="externalAmountOfFilters = $event"
      @update:services="fetchServices"
    />
    <service-create-edit v-model="dialogCreation" />
  </q-page>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useQuasar } from 'quasar';
import { useServices } from 'src/composables/services/useServices';
import {
  deleteService,
  useService,
  useServiceForEdition,
} from 'src/composables/services/useService';
import TabsByEachService from 'src/components/servicePage/TabsByEachService.vue';
import PriceDisplayPill from 'src/components/shared/PriceDisplayPill.vue';
import type Service from 'src/interfaces/service';
import ServiceFilterDialog from 'src/components/dialogs/serviceFilterDialog.vue';
import { FilterService } from 'src/composables/dialogs/useServiceFilter';
import { useFiltersStore } from 'src/stores/filters-store';
import serviceCreateEdit from 'src/components/dialogs/serviceCreateEdit.vue';

import { MenuCard } from './IndexPage.vue';
import { useAuthStore } from 'src/stores/auth-store';

const filtersStore = useFiltersStore();
const authStore = useAuthStore();

const { services, filterService, totalPages, refetch } = useServices();
const { serviceIdRef } = useService();
const { serviceIdEditRef } = useServiceForEdition();
const dialogCreation = ref(false);

const openEditService = (id: string) => {
  serviceIdEditRef.value = '';
  void nextTick(() => {
    serviceIdEditRef.value = id;
  });
};

const showFilterDialog = ref(false);
const externalAmountOfFilters = ref(0);

const BREAKPOINT_WIDE = 1100;
const BREAKPOINT_COMPACT_SEARCH = 550;
const BREAKPOINT_LIST_LAYOUT = 501;

const DEFAULT_SERVICE_IMAGE = 'src/assets/examples/tupper.jpg';

const $q = useQuasar();

const windowWidth = ref(
  typeof window !== 'undefined' ? window.innerWidth : BREAKPOINT_WIDE + 1
);
const windowHeight = ref(
  typeof window !== 'undefined' ? window.innerHeight : 800
);

/** Altura del q-scroll-area solo en vista de cards: encaja en el viewport sin dejar un “hueco” scrolleable vacío. */
const SCROLL_BODY_MAX = 680;
const SCROLL_BODY_MIN = 280;
const SCROLL_BODY_VIEWPORT_RESERVE = 260;

const desktopScrollBodyPx = computed(() => {
  const h = windowHeight.value - SCROLL_BODY_VIEWPORT_RESERVE;
  return Math.round(
    Math.max(SCROLL_BODY_MIN, Math.min(SCROLL_BODY_MAX, h))
  );
});
const compactSearchOverlayOpen = ref(false);
const compactSearchInputRef = ref<{ focus: () => void } | null>(null);

const openCompactSearchOverlay = () => {
  compactSearchOverlayOpen.value = true;
};

const showActionButtonLabels = computed(
  () => windowWidth.value >= BREAKPOINT_WIDE
);
const isCompactSearch = computed(
  () => windowWidth.value < BREAKPOINT_COMPACT_SEARCH
);
const isListLayout = computed(
  () => windowWidth.value < BREAKPOINT_LIST_LAYOUT
);

const serviceImageUrl = (service: Service) =>
  service.images?.[0]?.url || DEFAULT_SERVICE_IMAGE;

const openServiceDetail = (id: string) => {
  serviceIdRef.value = id;
};

const syncViewport = () => {
  windowWidth.value = window.innerWidth;
  windowHeight.value = window.innerHeight;
};

watch(
  () => filterService.value.name,
  () => {
    if (compactSearchOverlayOpen.value) {
      compactSearchOverlayOpen.value = false;
    }
  }
);

watch(compactSearchOverlayOpen, (open) => {
  if (open) {
    void nextTick(() => {
      compactSearchInputRef.value?.focus();
    });
  }
});

watch(isCompactSearch, (compact) => {
  if (!compact) {
    compactSearchOverlayOpen.value = false;
  }
});

const service: MenuCard = history.state?.service;

const fetchServices = (e: FilterService | string) => {
  if (typeof e === 'string') {
    refetch.value++;
  } else {
    showFilterDialog.value = false;
    filterService.value.selectedGenres = e.selectedGenres;
    filterService.value.selectedServicesIDs = e.selectedServicesIDs;
    filterService.value.includePriceRange = e.includePriceRange;
    filterService.value.prices.min = e.prices.min;
    filterService.value.prices.max = e.prices.max;
  }
};

const confirmDeleteService = (id: string) => {
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

const thumbStyle = {
  right: '4px',
  borderRadius: '5px',
  backgroundColor: '#abd7fa',
  width: '5px',
  opacity: '0.75',
};

onMounted(() => {
  syncViewport();
  window.addEventListener('resize', syncViewport);
  if (service) {
    showFilterDialog.value = true;
    filtersStore.setGenres(service.filterFormat?.genres || []);
    filtersStore.setServicesExternal(service.filterFormat?.services || []);
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', syncViewport);
});

defineOptions({
  name: 'ServicePage',
});
</script>

<style lang="scss" scoped>
.service-header-box {
  overflow: hidden;
}

.service-header-inner {
  padding: 12px 16px;
}

.service-page-heading {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  width: 100%;
  min-width: 0;
  gap: 20px;
}

.service-heading-search {
  min-width: 0;
}

.service-heading-search--expanded {
  flex: 1 1 auto;
}

.service-heading-search-input :deep(.q-field__control) {
  min-height: 40px;
}

.service-heading-actions {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: 15px;
}

.service-heading-actions--compact {
  margin-left: auto;
}

.compact-search-overlay {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  width: 100%;
  gap: 10px;
  min-height: 40px;
}

.compact-search-overlay-close {
  flex-shrink: 0;
}

.compact-search-overlay-input {
  flex: 1 1 auto;
  min-width: 0;
}

.compact-search-overlay-input :deep(.q-field__control) {
  min-height: 40px;
}

.service-header-fade-enter-active,
.service-header-fade-leave-active {
  transition: opacity 0.2s ease;
}

.service-header-fade-enter-from,
.service-header-fade-leave-to {
  opacity: 0;
}

.color-bar {
  background: linear-gradient(100deg, #f8bbd0 0%, #bdc9d7 90%);
}
.filter-badge-wrapper {
  position: relative;
  display: inline-block;
}

.filter-badge-count {
  position: absolute;
  top: -8px;
  right: -8px;
  font-size: 13px; // Aumenta el tamaño del texto
  padding: 4px 8px; // Aumenta el padding para hacerlo más ancho/alto
  line-height: 1;
  z-index: 10;
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.2);
}

.box-style {
  box-shadow: 0 0 10px #dbcbee;
  background: #f5f5f5;
  border-radius: 10px;
}

.service-body-box {
  min-width: 0;
}

.service-body-mobile {
  min-height: 0;
}

.service-scroll-area {
  width: 100%;
}

.service-cards-grid {
  display: grid;
  grid-template-columns: repeat(
    auto-fill,
    minmax(min(100%, 260px), 350px)
  );
  gap: 1rem 1.25rem;
  justify-content: center;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.service-card-cell {
  display: flex;
  justify-content: center;
  width: 100%;
  min-width: 0;
}

.service-list-mobile {
  background: #fff;
  box-shadow:
    0 1px 2px rgba(60, 64, 67, 0.12),
    0 1px 3px rgba(60, 64, 67, 0.08);
}

.service-list-item {
  min-height: 72px;
}

.service-list-avatar-wrap {
  min-width: 52px;
}

.service-list-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.service-list-main {
  min-width: 0;
}

.service-list-side {
  flex-shrink: 0;
  padding-left: 4px;
}

.service-list-price :deep(.cop-price-pill--dense .cop-price-pill__amount) {
  font-size: 0.8125rem;
}

.service-list-price :deep(.cop-price-pill--dense .cop-price-pill__suffix) {
  font-size: 0.5rem;
}

.service-list-price :deep(.cop-price-pill) {
  margin-top: 2px;
}

.service-list-actions {
  align-items: stretch;
  min-width: 5.5rem;
}
</style>
