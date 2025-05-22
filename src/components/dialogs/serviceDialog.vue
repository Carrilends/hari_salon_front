<template>
  <q-dialog
    ref="dialogRef"
    persistent
    transition-show="jump-right"
    transition-hide="jump-left"
  >
    <q-card class="my-card">
      <q-carousel
        animated
        v-model="slide"
        navigation
        infinite
        :autoplay="autoplay"
        arrows
        transition-prev="slide-right"
        transition-next="slide-left"
        @mouseenter="autoplay = false"
        @mouseleave="autoplay = true"
        style="height: 365px"
      >
        <q-carousel-slide
          v-for="(img, index) in props.service.images"
          :key="index"
          :name="index"
          :img-src="img.url && 'src/assets/examples/tupper.jpg'"
        />
      </q-carousel>

      <q-card-section>
        <q-chip
          class="absolute"
          style="top: 0; right: 12px; transform: translateY(-80%)"
          size="16px"
        >
          <q-avatar
            color="green"
            size="40px"
            icon="las la-dollar-sign"
            text-color="white"
          />
          <span>{{ props.service.price }} COP</span>
        </q-chip>
        <div class="row flex-center">
          <div
            class="col-12 text-subtitle1 q-pb-sm"
            style="
              font-size: 25px;
              font-family: Verdana, Geneva, Tahoma, sans-serif, serif;
              font-weight: bold;
            "
          >
            {{ props.service.name }}
          </div>
          <div
            class="col-12 q-pa-xs"
            style="background-color: #f0f0f0; border-radius: 7px"
          >
            <div
              class="q-pt-xs q-pl-sm"
              style="font-size: 15px; font-weight: bold"
            >
              Descripción:
            </div>
            <q-scroll-area
              :thumb-style="thumbStyle"
              class="q-pr-md q-pl-sm q-py-sm"
              style="
                height: 130px;
                line-height: 1.4;
                word-spacing: 0.1rem;
                font-size: 16px;
              "
            >
              {{ props.service.detail.description }}
            </q-scroll-area>
          </div>
        </div>
      </q-card-section>
      <q-card-section class="q-pt-none">
        <div class="row">
          <div
            class="col-12 q-px-sm"
            style="background-color: #f0f0f0; border-radius: 7px"
          >
            <div class="q-pt-xs" style="font-size: 15px; font-weight: bold">
              Tipos de rostro ideales:
            </div>
            <q-virtual-scroll
              class="custom-scrollbar q-py-sm"
              style="background-color: #f0f0f0"
              :items="heavyList"
              virtual-scroll-horizontal
              v-slot="{ item }"
            >
              <div class="">
                <q-chip size="16px">
                  <q-avatar color="red" text-color="white">{{
                    item.number
                  }}</q-avatar>
                  {{ item.class }}
                </q-chip>
              </div>
            </q-virtual-scroll>
          </div>
        </div>
      </q-card-section>

      <q-separator />

      <q-card-actions align="right">
        <q-btn @click="onDialogOK('cancel')" push color="red" label="Cancelar" />
        <q-btn @click="onDialogOK" outline color="green" label="Reservar" icon="event" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useDialogPluginComponent } from 'quasar';
import Service from 'src/interfaces/service';

// <!-- TAB PANELS -->
// <!-- LOADING - PLUGIN -->
// <!-- NOTIFY - PLUGIN -->

const maxSize = 5;
const heavyList: { number: number; class: string }[] = [];

for (let i = 0; i < maxSize; i++) {
  heavyList.push({
    number: i,
    class: 'Tipo de cara',
  });
}

const slide = ref(1);
const autoplay = ref(true);

const thumbStyle: Partial<CSSStyleDeclaration> = {
  right: '4px',
  borderRadius: '5px',
  backgroundColor: '#027be3',
  width: '5px',
};

const { dialogRef, onDialogOK } = useDialogPluginComponent();

const props = defineProps<{ modelValue: boolean; service: Service }>();

defineEmits([...useDialogPluginComponent.emits]);
defineOptions({
  name: 'serviceDialog',
});
</script>

<style lang="scss" scoped>
.my-card {
  width: 550px;
  height: 770px;
  max-width: 100%;
  min-width: 300px;
}
// Asegúrate de estilizar el div interno de scroll:
::v-deep(.custom-scrollbar .q-virtual-scroll__content) {
  display: flex;
}

::v-deep(.custom-scrollbar) {
  max-height: 100px; // asegúrate de ajustar el alto
  overflow-x: auto;

  // Scrollbar horizontal personalizada para navegadores modernos
  &::-webkit-scrollbar {
    height: 6px;
  }

  &::-webkit-scrollbar-track {
    background: #f0f0f0;
    border-radius: 15px;
  }

  &::-webkit-scrollbar-thumb {
    background-color: #abd7fa;
    border-radius: 5px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background-color: #6fb1e3;
  }

  scrollbar-color: #d1c4d4 #f0f0f0;
  scrollbar-width: thin;
}
</style>
