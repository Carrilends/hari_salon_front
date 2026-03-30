<template>
  <q-dialog
    v-model="dialog"
    :maximized="maximized"
    :transition-show="maximized ? 'slide-up' : 'scale'"
    :transition-hide="maximized ? 'slide-down' : 'scale'"
  >
    <q-card
      class="about-dialog relative-position"
      :class="{ 'about-dialog--maximized': maximized }"
      flat
      bordered
    >
      <q-btn
        v-close-popup
        class="about-dialog__close"
        icon="close"
        flat
        round
        dense
        color="white"
        aria-label="Cerrar"
      />

      <div class="about-hero">
        <q-img
          src="src/assets/places/salon.jpg"
          :ratio="16 / 9"
          fit="cover"
          class="about-hero__img"
          spinner-color="primary"
          spinner-size="28px"
        />
        <div class="about-hero__fade" />
        <div class="about-address">
          Carrera 3 #1-18, Sopó, Cundinamarca
        </div>
      </div>

      <q-separator class="about-dialog__sep" />

      <q-card-section class="about-body">
        <h2 class="about-title">¿Quiénes somos?</h2>
        <p class="about-text">
          Peluquería Pecas es un lugar donde te sentirás como en casa, con un
          ambiente agradable y un personal amable y profesional. Llevamos más
          de 20 años en el sector de la belleza y la estética, ofreciendo
          servicios de calidad a precios accesibles.
        </p>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import {
  DialogEmits,
  useDialog,
} from 'src/composables/dialogs/useDialogService';
import { useDialogMaximizedBelow } from 'src/composables/dialogs/useDialogMaximizedBelow';

const props = defineProps<{ dialog: boolean }>();
const emit = defineEmits<DialogEmits>();

const { dialog } = useDialog(props, emit);
const { maximized } = useDialogMaximizedBelow();

defineOptions({
  name: 'WhoWeAreDialog',
});
</script>

<style scoped lang="scss">
.about-dialog {
  width: min(100%, 560px);
  max-height: min(92vh, 720px);
  overflow: auto;
  border-radius: 20px;
  background: #fdfaf8;
  border-color: rgba(61, 61, 61, 0.08);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
}

.about-dialog__close {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 3;
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(6px);
}

.about-hero {
  position: relative;
  line-height: 0;
  overflow: hidden;
  border-radius: 20px 20px 0 0;
}

.about-hero__img {
  display: block;
}

.about-hero__fade {
  position: absolute;
  inset: 0;
  top: 40%;
  background: linear-gradient(
    to top,
    rgba(45, 40, 42, 0.5) 0%,
    rgba(45, 40, 42, 0.08) 60%,
    transparent 100%
  );
  pointer-events: none;
}

.about-address {
  position: absolute;
  bottom: 12px;
  left: 12px;
  right: 12px;
  max-width: calc(100% - 24px);
  padding: 0.5rem 0.75rem;
  font-size: 0.8125rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: #fff;
  background: rgba(255, 255, 255, 0.14);
  backdrop-filter: blur(10px);
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  line-height: 1.4;
}

.about-dialog__sep {
  background: rgba(61, 61, 61, 0.08);
}

.about-body {
  padding: 1.35rem 1.5rem 1.6rem;
}

.about-title {
  margin: 0 0 0.75rem;
  font-size: 1.25rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: #3d3d3d;
  line-height: 1.3;
}

.about-text {
  margin: 0;
  font-size: 0.9375rem;
  line-height: 1.65;
  color: #5c5652;
}

.about-dialog--maximized {
  width: 100%;
  max-width: 100%;
  height: 100%;
  min-height: 100%;
  max-height: none;
  border-radius: 0;
  display: flex;
  flex-direction: column;
  box-shadow: none;
  overflow: hidden;

  .about-hero {
    border-radius: 0;
    flex-shrink: 0;
  }

  .about-body {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
}
</style>
