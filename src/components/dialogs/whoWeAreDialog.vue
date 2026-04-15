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
          {{ SALON_ADDRESS }}
        </div>
      </div>

      <q-separator class="about-dialog__sep" />

      <q-card-section class="about-map">
        <div class="about-map__frame-wrap">
          <iframe
            class="about-map__frame"
            :src="MAPS_EMBED_URL"
            title="Ubicación de Peluquería Pecas"
            loading="lazy"
            referrerpolicy="no-referrer-when-downgrade"
            allowfullscreen
          />
        </div>
        <div class="about-map__meta">
          <a
            class="about-map__attribution"
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
          >
            © OpenStreetMap contributors
          </a>
          <q-btn
            class="about-map__action"
            color="primary"
            label="Abrir en mapa"
            icon="place"
            no-caps
            outline
            :href="MAPS_EXTERNAL_URL"
            target="_blank"
            rel="noopener noreferrer"
          />
        </div>
      </q-card-section>

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
import {
  MAPS_EMBED_URL,
  MAPS_EXTERNAL_URL,
  SALON_ADDRESS,
} from 'src/constants/salon-location';

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

.about-map {
  padding: 1rem 1.5rem 1.1rem;
}

.about-map__frame-wrap {
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(61, 61, 61, 0.12);
  background: #fff;
}

.about-map__frame {
  width: 100%;
  min-height: 210px;
  height: 210px;
  border: 0;
  display: block;
}

.about-map__meta {
  margin-top: 0.625rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.about-map__attribution {
  font-size: 0.75rem;
  color: #7a736d;
  text-decoration: none;
}

.about-map__attribution:hover {
  text-decoration: underline;
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

@media (max-width: 600px) {
  .about-map {
    padding: 0.9rem 1rem 1rem;
  }

  .about-map__frame {
    min-height: 180px;
    height: 180px;
  }

  .about-map__meta {
    flex-direction: column;
    align-items: stretch;
  }

  .about-map__action {
    width: 100%;
  }
}
</style>
