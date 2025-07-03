<template>
  <q-page class="row items-start q-px-lg q-pt-md">
    <div class="col-12 q-pl-md q-py-xs box-style">
      <div class="row q-my-sm">
        <div class="col-9">
          <q-input
            dense
            filled
            clearable
            color="blue"
            debounce="1000"
            label="Busca por nombre del servicio"
            v-model="filterService.name"
          >
            <template v-slot:before>
              <q-icon name="search" />
            </template>
          </q-input>
        </div>
        <div class="col-3 flex flex-center">
          <div class="filter-badge-wrapper">
            <q-btn
              @click="showFilterDialog = true"
              class="color-bar"
              icon="las la-filter"
              label="Filtros"
              rounded
              flat
            />
            <q-badge
              v-if="amountOfFilters > 0"
              color="red"
              rounded
              floating
              class="filter-badge-count"
            >
              {{ amountOfFilters > 9 ? '9+' : amountOfFilters }}
            </q-badge>
          </div>
        </div>
      </div>
    </div>
    <div class="col-12 box-style">
      <q-scroll-area
        class="q-py-lg"
        style="height: 680px"
        :thumb-style="thumbStyle"
      >
        <div class="row q-gutter-md" style="justify-content: center">
          <TabsByEachService
            v-for="(service, index) in services"
            @detail-service="() => (serviceIdRef = service.id)"
            :key="`${index}_${service.id}`"
            class="col-3"
            :props="{
              id: service.id,
              name: service.name,
              precio: service.price,
              principalImg: service.images.filter((img) => img.isPrincipal)[0]
                .url,
            }"
            :selected="true"
          />
        </div>
      </q-scroll-area>
    </div>
    <div class="col-12 flex flex-center box-style" style="padding: 10px 0;">
      <q-pagination
        v-model="filterService.page"
        color="blue"
        :max="totalPages"
        direction-links
      />
    </div>
    <ServiceFilterDialog
      v-model:dialog="showFilterDialog"
      @update:amount="amountOfFilters = $event"
      @update:services="fetchServices"
    />
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useService } from 'src/composables/services/useService';
import { useServices } from 'src/composables/services/useServices';
import TabsByEachService from 'src/components/servicePage/TabsByEachService.vue';
import ServiceFilterDialog from 'src/components/dialogs/serviceFilterDialog.vue';
import { FilterService } from 'src/composables/dialogs/useServiceFilter';

const { services, filterService, totalPages } = useServices();
const { serviceIdRef } = useService();

const showFilterDialog = ref(false);
const amountOfFilters = ref(0);

const fetchServices = (e: FilterService) => {
  showFilterDialog.value = false;
  filterService.value.selectedGenres = e.selectedGenres;
  filterService.value.selectedServicesIDs = e.selectedServicesIDs;
  filterService.value.includePriceRange = e.includePriceRange;
  filterService.value.prices.min = e.prices.min;
  filterService.value.prices.max = e.prices.max;
};

const thumbStyle = {
  right: '4px',
  borderRadius: '5px',
  backgroundColor: '#abd7fa',
  width: '5px',
  opacity: '0.75',
};

defineOptions({
  name: 'ServicePage',
});
</script>

<style lang="scss" scoped>
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

</style>
