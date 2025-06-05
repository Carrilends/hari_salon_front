<template>
  <q-page class="row items-start q-px-lg q-pt-lg" style="">
    <div class="col-12 q-pl-md" style="box-shadow: 0 0 10px #dbcbee">
      <div class="row">
        <div class="col-6">
          <q-input v-model="text" debounce="1000" style="width: 80%">
            <template v-slot:prepend>
              <q-icon name="search" />
            </template>
          </q-input>
        </div>
        <div class="col-3 flex flex-center">
          <q-toggle
            v-model="genre"
            :color="genre ? 'pink' : 'blue'"
            checked-icon="las la-venus"
            unchecked-icon="las la-mars"
            size="80px"
            keep-color
          />
        </div>
        <div class="col-3 flex flex-center">
          <q-btn
            class="color-bar"
            icon="las la-filter"
            label="Filtros"
            rounded
            flat
          />
        </div>
      </div>
    </div>
    <div class="col-12" style="box-shadow: 0 0 10px #dbcbee">
      <q-scroll-area
        class="q-py-lg"
        style="height: 680px"
        :thumb-style="thumbStyle"
      >
        <div class="row q-gutter-md" style="justify-content: center">
          <TabsByEachService
            v-for="(service, index) in services"
            @detail-service="() => serviceIdRef = service.id"
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
    <div class="col-12 q-pa-lg flex flex-center">
      <q-pagination
        v-model="page"
        color="blue"
        :max="totalPages"
        direction-links
      />
    </div>
    <ServiceFilterDialog />
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useService } from 'src/composables/services/useService';
import { useServices } from 'src/composables/services/useServices';
import TabsByEachService from 'src/components/servicePage/TabsByEachService.vue';
import ServiceFilterDialog from 'src/components/dialogs/serviceFilterDialog.vue';

const { services, page, totalPages } = useServices();
const { serviceIdRef } = useService();


const thumbStyle = {
  right: '4px',
  borderRadius: '5px',
  backgroundColor: '#abd7fa',
  width: '5px',
  opacity: '0.75',
};

const text = ref('');
const genre = ref(false);

defineOptions({
  name: 'ServicePage',
});
</script>

<style lang="scss" scoped>
.color-bar {
  background: linear-gradient(100deg, #f8bbd0 0%, #bdc9d7 90%);
}
</style>
