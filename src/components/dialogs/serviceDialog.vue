<template>
  <q-dialog
    ref="dialogRef"
    :persistent="!props.isFromBooking"
    :maximized="maximized"
    :transition-show="maximized ? 'slide-up' : 'scale'"
    :transition-hide="maximized ? 'slide-down' : 'scale'"
  >
    <q-card
      class="service-detail-card"
      :class="{ 'service-detail-card--maximized': maximized }"
    >
      <div class="detail-media">
        <q-carousel
          v-model="slide"
          class="detail-carousel"
          animated
          :navigation="carouselImages.length > 1"
          :infinite="carouselImages.length > 1"
          :autoplay="carouselImages.length > 1 ? autoplay : false"
          :arrows="carouselImages.length > 1"
          transition-prev="slide-right"
          transition-next="slide-left"
          control-color="grey-8"
          control-type="regular"
          @mouseenter="autoplay = false"
          @mouseleave="autoplay = true"
        >
          <q-carousel-slide
            v-for="(img, index) in carouselImages"
            :key="img.id ?? index"
            :name="index"
            class="detail-slide q-pa-none"
          >
            <q-img
              :src="img.url"
              fit="cover"
              class="detail-img"
              spinner-color="primary"
              spinner-size="42px"
              loading="eager"
            >
              <template #loading>
                <div class="detail-img-loading flex flex-center">
                  <q-spinner-dots color="primary" size="42px" />
                </div>
              </template>
              <template #error>
                <div class="detail-img-error flex flex-center text-grey-6">
                  <q-icon name="broken_image" size="48px" />
                </div>
              </template>
            </q-img>
          </q-carousel-slide>
        </q-carousel>

        <div class="detail-price-wrap">
          <PriceDisplayPill :amount="props.service.price" />
        </div>
        <div v-if="formattedDuration" class="detail-duration-wrap">
          <q-chip
            dense
            icon="schedule"
            color="blue-grey-1"
            text-color="blue-grey-8"
            class="detail-duration-chip"
          >
            {{ formattedDuration }}
          </q-chip>
        </div>
      </div>

      <q-card-section class="detail-body">
        <h2 class="detail-title">{{ props.service.name }}</h2>

        <div class="detail-desc">
          <span class="detail-desc__label">Descripción</span>
          <q-scroll-area
            :thumb-style="thumbStyle"
            :bar-style="{ borderRadius: '4px' }"
            class="detail-desc__scroll"
            :class="{ 'detail-desc__scroll--maximized': maximized }"
          >
            <p class="detail-desc__text">
              {{ props.service.detail?.description || 'Sin descripción.' }}
            </p>
          </q-scroll-area>
        </div>
      </q-card-section>

      <q-separator class="detail-sep" />

      <q-card-actions
        v-if="!props.isFromBooking"
        class="detail-actions"
        align="stretch"
      >
        <q-btn
          class="col"
          flat
          no-caps
          color="grey-8"
          label="Cancelar"
          @click="onDialogOK('cancel')"
        />
        <q-btn
          class="col detail-btn-book"
          unelevated
          no-caps
          color="primary"
          text-color="white"
          label="Reservar"
          icon="event"
          @click="onDialogOK(props.service)"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useDialogPluginComponent } from 'quasar';
import { useDialogMaximizedBelow } from 'src/composables/dialogs/useDialogMaximizedBelow';
import Service, { faceTypes } from 'src/interfaces/service';
import PriceDisplayPill from 'src/components/shared/PriceDisplayPill.vue';

const PLACEHOLDER_IMG = 'src/assets/examples/tupper.jpg';

const props = defineProps<{
  service: Service;
  isFromBooking: boolean;
}>();

const { dialogRef, onDialogOK } = useDialogPluginComponent();
const { maximized } = useDialogMaximizedBelow(500);
const heavyList: { class: string; icon: string }[] = [];

const convertFaceType: { [key in faceTypes]: string[] } = {
  Oval: ['Ovalado', 'exposure_zero'],
  Round: ['Redondo', 'radio_button_unchecked'],
  Diamond: ['Diamante', 'hov'],
  Square: ['Cuadrado', 'check_box_outline_blank'],
  Heart: ['Corazón', 'favorite'],
  Long: ['Largo', 'exposure_zero'],
};

if (props.service.detail?.specifications?.faceTypes) {
  props.service.detail.specifications.faceTypes.forEach((faceType) => {
    heavyList.push({
      icon: convertFaceType[faceType][1],
      class: convertFaceType[faceType][0] || faceType,
    });
  });
}

const carouselImages = computed(() => {
  const imgs = props.service.images;
  if (imgs?.length) return imgs;
  return [
    {
      id: 'placeholder',
      url: PLACEHOLDER_IMG,
      isPrincipal: true,
    },
  ];
});

const slide = ref(0);
const autoplay = ref(true);

const formattedDuration = computed(() => {
  const total = Number(props.service.duration || 0);
  if (!Number.isFinite(total) || total <= 0) return '';
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return hours === 1 ? '1 hora' : `${hours} horas`;
  return `${hours}h ${mins}min`;
});

const thumbStyle: Partial<CSSStyleDeclaration> = {
  right: '2px',
  borderRadius: '4px',
  backgroundColor: 'rgba(194, 24, 91, 0.45)',
  width: '6px',
};

defineEmits([...useDialogPluginComponent.emits]);
defineOptions({
  name: 'serviceDialog',
});
</script>

<style lang="scss" scoped>
.service-detail-card {
  width: min(100%, 520px);
  max-width: 96vw;
  max-height: min(92vh, 820px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 20px;
  background: #fdfaf8;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.14);
}

.detail-media {
  position: relative;
  flex-shrink: 0;
  width: 100%;
  aspect-ratio: 16 / 10;
  max-height: min(44vh, 320px);
  background: linear-gradient(145deg, #eceff1 0%, #e8e0e4 100%);
}

.detail-carousel {
  height: 100%;
  width: 100%;
}

.detail-carousel :deep(.q-carousel__slides-container) {
  height: 100%;
}

.detail-carousel :deep(.q-panel) {
  height: 100%;
}

.detail-slide {
  height: 100%;
  overflow: hidden;
}

.detail-img {
  width: 100%;
  height: 100%;
  min-height: 100%;
}

.detail-img :deep(.q-img__container) {
  padding-bottom: 0 !important;
  height: 100% !important;
  position: absolute !important;
  inset: 0;
}

.detail-img :deep(img) {
  object-fit: cover;
  object-position: center;
}

.detail-img-loading,
.detail-img-error {
  width: 100%;
  height: 100%;
  min-height: 120px;
  background: linear-gradient(135deg, #eceff1 0%, #f5f0f3 100%);
}

.detail-price-wrap {
  position: absolute;
  bottom: 12px;
  right: 12px;
  z-index: 2;
}

.detail-duration-wrap {
  position: absolute;
  bottom: 12px;
  left: 12px;
  z-index: 2;
}

.detail-duration-chip {
  font-weight: 600;
  background: rgba(236, 239, 241, 0.94);
  backdrop-filter: saturate(120%) blur(1px);
}

.detail-body {
  flex: 1;
  min-height: 0;
  padding: 1.25rem 1.35rem 1rem;
}

.detail-title {
  margin: 0 0 1rem;
  font-size: 1.35rem;
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: 0.01em;
  color: #2c2c2c;
}

.detail-desc {
  border-radius: 14px;
  background: #fff;
  border: 1px solid rgba(61, 61, 61, 0.08);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  padding: 0.75rem 0.85rem 0.65rem;
}

.detail-desc__label {
  display: block;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #8a8580;
  margin-bottom: 0.5rem;
  padding-left: 0.15rem;
}

.detail-desc__scroll {
  height: min(200px, 28vh);
}

.detail-desc__text {
  margin: 0;
  padding-right: 0.35rem;
  font-size: 0.9375rem;
  line-height: 1.6;
  color: #4a4542;
  white-space: pre-wrap;
}

.detail-sep {
  background: rgba(61, 61, 61, 0.08);
}

.detail-actions {
  padding: 0.85rem 1rem 1rem;
  gap: 0.5rem;
}

.detail-btn-book {
  border-radius: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
  box-shadow: 0 4px 14px rgba(25, 118, 210, 0.35);
}

.detail-carousel :deep(.q-carousel__navigation-inner) {
  padding: 4px 0;
}

/* El nodo .q-carousel__arrow es el wrapper ancho con top+bottom; no poner fondo ni radius ahí */
.detail-carousel :deep(.q-carousel__prev-arrow),
.detail-carousel :deep(.q-carousel__next-arrow) {
  top: 50%;
  bottom: auto;
  transform: translateY(-50%);
  background: transparent !important;
  border-radius: 0;
  box-shadow: none;
}

.detail-carousel :deep(.q-carousel__prev-arrow--horizontal) {
  left: 8px;
}

.detail-carousel :deep(.q-carousel__next-arrow--horizontal) {
  right: 8px;
}

.detail-carousel :deep(.q-carousel__arrow .q-btn) {
  width: 40px;
  height: 40px;
  min-width: 40px;
  min-height: 40px;
  padding: 0;
  color: #3d3d3d !important;
  background: rgba(255, 255, 255, 0.94) !important;
  border-radius: 50%;
  box-shadow: 0 2px 14px rgba(0, 0, 0, 0.14);
  border: 1px solid rgba(0, 0, 0, 0.06);
}

.detail-carousel :deep(.q-carousel__arrow .q-btn .q-icon) {
  font-size: 22px;
}

.detail-carousel :deep(.q-carousel__navigation .q-btn) {
  margin: 4px;
}

.detail-carousel :deep(.q-carousel__navigation-icon--inactive) {
  opacity: 0.45;
}

.service-detail-card--maximized {
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

  .detail-media {
    max-height: min(36vh, 260px);
    flex-shrink: 0;
  }

  .detail-body {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .detail-desc {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .detail-sep,
  .detail-actions {
    flex-shrink: 0;
  }
}

.detail-desc__scroll--maximized {
  flex: 1 1 0;
  min-height: 80px;
}
</style>
