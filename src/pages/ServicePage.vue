<template>
  <q-page class="row items-start q-px-lg q-pt-lg" style="">
    <!-- HEAD ESCRITORIO COMPONENT -->
    <div class="col-12 q-pl-md" style="box-shadow: 0 0 10px #dbcbee">
      <div class="row">
        <!-- INPUT TEXT -->
        <div class="col-6">
          <q-input v-model="text" debounce="1000" style="width: 80%">
            <template v-slot:prepend>
              <q-icon name="search" />
            </template>
          </q-input>
        </div>
        <!-- TOGGLE Y FILTROS -->
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
    <!-- CARDS ESCRITORIO -->
    <div class="col-12" style="box-shadow: 0 0 10px #dbcbee">
      <q-scroll-area
        class="q-py-lg"
        style="height: 680px"
        :thumb-style="thumbStyle"
      >
        <div class="row q-gutter-md" style="justify-content: center">
          <TabsByEachService
            v-for="(service, index) in services"
            @detail-service="serviceId = service.id"
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
    <!-- FOOTER ESCRITORIO -->
    <div class="col-12 q-pa-lg flex flex-center">
      <q-pagination
        v-model="current"
        color="blue"
        :max="10"
        :max-pages="6"
        direction-links
        boundary-links
      />
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useQuasar } from 'quasar';

import { useServicesStore } from 'src/stores/service-store';
import { useServices } from 'src/composables/services/useServices';
import TabsByEachService from 'src/components/servicePage/TabsByEachService.vue';
import ServiceDialog from 'src/components/dialogs/serviceDialog.vue';

// const { screen } = useQuasar()
const serviceId = ref('');
const { services /* isLoading */ } = useServices();

const serviceStore = useServicesStore();
const { service } = storeToRefs(serviceStore);
const q = useQuasar();

const current = ref(1);
const thumbStyle = {
  right: '4px',
  borderRadius: '5px',
  backgroundColor: '#abd7fa',
  width: '5px',
  opacity: '0.75',
};

watch(
  () => serviceId.value,
  async (val) => {
    if (!val) return;
    console.log('serviceId', val);
    await serviceStore.getServiceById(val);
    q.dialog({
      component: ServiceDialog,
      componentProps: {
        modelValue: true,
        service: service.value,
      },
      persistent: true,
    })
      .onOk((e) => {
        if (e === 'cancel') serviceId.value = ''
        else {
          serviceId.value = ''
          console.log('OKAY', e);
        }
      });
  }
);

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
