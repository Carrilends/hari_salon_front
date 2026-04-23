<template>
  <q-page
    :padding="false"
    class="index-page full-width"
    :style-fn="isCompact ? pageStyleFnCompact : pageStyleFnDefault"
  >
    <div
      class="index-page__inner"
      :class="{ 'index-page__inner--compact': isCompact }"
    >
      <h1
        class="index-page__title"
        :class="{ 'index-page__title--compact': isCompact }"
      >
        Peluquería Marlene — Cortes, color, barbería y estética
      </h1>
      <p class="index-page__lede">
        Reserva online tus servicios de peluquería con profesionales y promociones exclusivas.
      </p>

      <q-scroll-area
        v-if="isCompact"
        class="index-page__scroll fit"
      >
        <q-list class="index-page__list index-page__list--compact full-width">
          <q-item
            v-for="card in menuCards"
            :key="card.title"
            class="index-page__item--compact q-py-sm"
            clickable
            v-ripple
            @click="goToService(card)"
          >
            <q-avatar
              :size="compactAvatarSize"
              class="q-mr-sm"
              style="background: #e3e3e8"
            >
              <img
                :style="{ width: compactAvatarSize, height: compactAvatarSize }"
                :src="card.imgPath"
                :alt="card.title"
                loading="lazy"
                decoding="async"
              />
            </q-avatar>

            <q-item-section class="index-page__item-text">
              <q-item-label class="text-subtitle1 text-weight-bold">
                {{ card.title }}
              </q-item-label>
              <q-item-label caption class="text-body2">
                {{ card.description }}
              </q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-scroll-area>

      <q-list
        v-else
        bordered
        class="index-page__list index-page__list--desktop"
        style="border-radius: 10px"
      >
        <q-item
          v-for="card in menuCards"
          :key="card.title"
          class="q-py-md"
          clickable
          v-ripple
        >
          <q-avatar size="80px" class="q-mr-md" style="background: #e3e3e8">
            <img
              style="width: 80px"
              :src="card.imgPath"
              :alt="card.title"
              loading="lazy"
              decoding="async"
            />
          </q-avatar>

          <q-item-section>
            <q-item-label class="text-h6">
              {{ card.title }}
            </q-item-label>
            <q-item-label caption>
              {{ card.description }}
            </q-item-label>
          </q-item-section>

          <q-item-section side>
            <q-btn
              color="black"
              class="q-mt-md"
              icon="arrow_forward_ios"
              round
              size="md"
              @click="goToService(card)"
            />
          </q-item-section>
        </q-item>
      </q-list>
    </div>

    <q-page-sticky
      v-if="!authStore.isLoggedIn"
      position="bottom-right"
      :offset="[18, 18]"
      style="z-index: 1000"
    >
      <div
        class="flex flex-center q-pa-md"
        style="background: #e3e3e8; border-radius: 20px"
      >
        <div style="font-weight: bold">¿Eres administrador? Ingresa aquí</div>
        <q-btn
          color="primary q-ml-md"
          icon="arrow_forward_ios"
          unelevated
          round
          size="md"
          @click="goToAdmin"
        />
      </div>
    </q-page-sticky>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import i18n from 'src/i18n';
import { useRouter, type HistoryState } from 'vue-router';
import { useOptions } from 'src/composables/shared/useOptions';
import { useAuthStore } from 'src/stores/auth-store';
import { useSeo } from 'src/composables/seo/useSeo';
import { hairSalonSchema } from 'src/composables/seo/structuredData';

useOptions();

useSeo({
  title: 'Peluquería Marlene | Cortes, color, barbería y estética',
  description:
    'Reserva cortes de cabello, coloración, barbería, maquillaje y manicura en Peluquería Marlene. Profesionales, promociones y atención personalizada.',
  path: '/',
  jsonLd: hairSalonSchema(),
});

/** Viewport width strictly below this uses compact layout (scroll area, full-width shell). */
const COMPACT_BREAKPOINT_PX = 700;

const authStore = useAuthStore();
const router = useRouter();

const compactAvatarSize = '52px';

const isCompact = ref(
  typeof window !== 'undefined'
    ? window.matchMedia(`(max-width: ${COMPACT_BREAKPOINT_PX - 1}px)`).matches
    : false,
);

let compactMqCleanup: (() => void) | null = null;

onMounted(() => {
  const mq = window.matchMedia(
    `(max-width: ${COMPACT_BREAKPOINT_PX - 1}px)`,
  );
  const sync = () => {
    isCompact.value = mq.matches;
  };
  sync();
  mq.addEventListener('change', sync);
  compactMqCleanup = () => mq.removeEventListener('change', sync);
});

onUnmounted(() => {
  compactMqCleanup?.();
});

function pageStyleFnDefault(offset: number, height: number) {
  return {
    minHeight: `${height - offset}px`,
    width: '100%',
    maxWidth: '100%',
    boxSizing: 'border-box',
  };
}

function pageStyleFnCompact(offset: number, height: number) {
  const px = `${height - offset}px`;
  return {
    minHeight: px,
    height: px,
    maxHeight: px,
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
  };
}

export interface MenuCard {
  imgPath: string;
  title: string;
  description: string;
  filterFormat?: {
    genres?: string[];
    services?: string[];
  };
}

const menuCards: MenuCard[] = [
  {
    imgPath: 'src/assets/people/man_hairdress.jpg',
    title: i18n['en-US'].indexPage.man_cut,
    description:
      'Redefine tu estilo con cortes modernos, clásicos y servicios de barbería profesional. Afeitado con navaja, arreglo de barba y cuidados especiales para el caballero actual.',
    filterFormat: {
      genres: ['559786d2-b1c1-4fb4-8b9c-8aa8f6eff063'],
      services: ['8f22821a-8e2b-435f-87b8-c63a1b83c711'],
    },
  },
  {
    imgPath: 'src/assets/people/women-hair-cut.jpg',
    title: i18n['en-US'].indexPage.woman_cut,
    description:
      'Transforma tu look con cortes a la medida, alisados permanentes o temporales y tratamientos que cuidan tu cabello mientras realzan tu belleza natural.',
    filterFormat: {
      genres: ['41d1765c-108a-4ae4-aec2-c4316981026b'],
      services: ['8f22821a-8e2b-435f-87b8-c63a1b83c711'],
    },
  },
  {
    imgPath: 'src/assets/people/make-up-face-design.jpg',
    title: i18n['en-US'].indexPage.face_design,
    description:
      'Desde maquillaje social hasta técnicas profesionales para eventos, novias o sesiones fotográficas. También ofrecemos limpieza facial, perfilado de cejas y más.',
    filterFormat: {
      services: ['5908787e-de56-4e6d-a840-c65d02781587'],
    },
  },
  {
    imgPath: 'src/assets/people/nails-design.jpg',
    title: i18n['en-US'].indexPage.nail_design,
    description:
      'Luce manos y pies impecables con nuestros servicios de cuidado y embellecimiento. Uñas acrílicas, semipermanentes, arte en uñas y tratamientos nutritivos.',
    filterFormat: {
      services: ['2c94799c-9a73-4a7a-b9a3-26e154b4f7a8'],
    },
  },
];

function goToService(card: MenuCard) {
  router.push({
    path: '/services',
    state: { service: card } as unknown as HistoryState,
  });
}

function goToAdmin() {
  router.push({ name: 'login' });
}

defineOptions({
  name: 'IndexPage',
});
</script>

<style scoped lang="scss">
.index-page {
  box-sizing: border-box;
  /* Deja ver el fondo del layout sin taparlo por completo */
  background: linear-gradient(
    160deg,
    rgba(255, 255, 255, 0.5) 0%,
    rgba(245, 245, 245, 0.45) 45%,
    rgba(250, 248, 250, 0.55) 100%
  );
}

.index-page__inner {
  width: 700px;
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px 40px 48px;
  box-sizing: border-box;
}

.index-page__inner--compact {
  width: 100%;
  max-width: none;
  min-width: 0;
  margin: 0;
  padding: 12px 16px 8px;
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: stretch;
}

.index-page__title {
  padding-bottom: 16px;
  font-size: 30px;
  font-family: 'Times New Roman', Times, serif;
  font-weight: bold;
  color: #1a1a1a;
  text-shadow: 0 0 20px rgba(255, 255, 255, 0.85), 0 1px 2px rgba(255, 255, 255, 0.9);
}

.index-page__title--compact {
  text-align: center;
  flex: 0 0 auto;
  padding-bottom: 10px;
  font-size: 1.35rem;
  line-height: 1.25;
  text-shadow: 0 0 16px rgba(255, 255, 255, 0.9), 0 1px 2px rgba(255, 255, 255, 0.95);
}

.index-page__lede {
  margin: 0 0 16px;
  font-size: 1rem;
  color: #2a2a2a;
  text-shadow: 0 0 12px rgba(255, 255, 255, 0.85);
}

.index-page__scroll {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  width: 100% !important;
  max-width: 100%;
}

.index-page__scroll :deep(.q-scrollarea__container) {
  width: 100% !important;
}

.index-page__item-text {
  min-width: 0;
}

.index-page__list--compact {
  background: transparent;
  padding-bottom: 8px;
}

.index-page__list--desktop {
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(6px);
}

.index-page__item--compact {
  margin-bottom: 4px;
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(4px);
  border-radius: 10px;
}
</style>
