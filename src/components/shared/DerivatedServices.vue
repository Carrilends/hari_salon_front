<template>
  <div
    class="col-12 q-my-md q-pa-sm"
    style="background: #f2f2f2; border-radius: 8px"
  >
    <div class="row">
      <div class="col-11 flex flex-center">Listado de servicios:</div>
      <div v-if="selectedServicesIDs.length > 0" class="col-1">
        <q-btn
          @click="clearServices"
          color="red"
          icon="close"
          size="sm"
          round
          flat
        />
      </div>
    </div>
  </div>
  <div class="col-12 q-my-md q-pa-sm" style="background: #f2f2f2">
    <template v-for="p in principalServices" :key="p.id">
      <q-chip
        @click="
          manageServicesID(p.id, !p.selected);
          p.selected = !p.selected;
        "
        :color="p.selected ? 'teal-14' : 'teal'"
        :outline="!p.selected"
        :class="p.selected ? 'text-white' : 'text-black'"
        clickable
        icon="star"
      >
        {{ p.name }}
      </q-chip>
    </template>
    <template v-for="s in servicesToShow" :key="s.id">
      <q-chip
        @click="
          manageServicesID(s.id, !s.selected);
          s.selected = !s.selected;
        "
        :color="s.selected ? 'teal-14' : 'teal'"
        :outline="!s.selected"
        :class="s.selected ? 'text-white' : 'text-black'"
        clickable
        icon="star"
      >
        {{ s.name }}
      </q-chip>
    </template>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useOptionsStore } from 'src/stores/options-store';

const optionsStore = useOptionsStore();
const servicesToShow = ref([]);
const selectedServicesIDs = ref([]);

const principalServices = ref([
  ...optionsStore.principalServices.map((s) => ({ ...s, selected: false })),
]);

const restServices = ref([
  ...optionsStore.restServices.map((s) => ({ ...s, selected: false })),
]);

const setServicesToShow = () => {
  servicesToShow.value = restServices.value.filter(
    (s) => selectedServicesIDs.value.includes(s.parent || '') || s.selected
  );
};

const manageServicesID = (id, selected) => {
  if (selected) {
    selectedServicesIDs.value.push(id);
  } else {
    selectedServicesIDs.value = selectedServicesIDs.value.filter(
      (s) => s !== id
    );
  }
  setServicesToShow();
};
</script>
