<template>
  <div
    class="row flex flex-center"
    style="background: #f5f5f5; width: fit-content; border-radius: 10px;"
  >
    <div class="col q-pb-xl q-pt-lg q-px-xl" style="width: 700px; max-width: 1200px">
      <div
        class="q-pb-md"
        style="
          font-size: 30px;
          font-family: 'Times New Roman', Times, serif;
          font-weight: bold;
        "
      >
        Algunos servicios:
      </div>
      <q-list bordered style="border-radius: 10px">
        <q-item
          v-for="card in menuCards"
          :key="card.title"
          class="q-py-md"
          clickable
          v-ripple
        >
          <!-- style="border: solid 1px #d1d9e6;" -->
          <q-avatar size="80px" class="q-mr-md" style="background: #e3e3e8">
            <img style="width: 80px;" :src="card.imgPath" />
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
              @click="goToService(card)"
              round
              size="md"
            />
          </q-item-section>
        </q-item>
      </q-list>
    </div>
  </div>
</template>

<script setup lang="ts">
import i18n from 'src/i18n';
import { useRouter } from 'vue-router';
import { useOptions } from 'src/composables/shared/useOptions';

// const { isLoading } = useOptions()
useOptions();

const router = useRouter();
function goToService(card: typeof menuCards[0]) {
  router.push({
    path: '/services',
    state: {
      service: card
    }
  });
}

export interface MenuCard {
  imgPath: string;
  title: string;
  description: string;
  filterFormat?: {
    genres?: string[]; // Assuming genres are strings, adjust if necessary
    services?: string[]; // Assuming services are strings, adjust if necessary
  };
}

const menuCards = [
  {
    imgPath: 'src/assets/people/man_hairdress.jpg',
    title: i18n['en-US'].indexPage.man_cut, // Servicios para caballero
    description: 'Redefine tu estilo con cortes modernos, clásicos y servicios de barbería profesional. Afeitado con navaja, arreglo de barba y cuidados especiales para el caballero actual.',
    filterFormat: {
      genres: ['559786d2-b1c1-4fb4-8b9c-8aa8f6eff063'], // Hombre
      services: ['8f22821a-8e2b-435f-87b8-c63a1b83c711']
    }
  },
  {
    imgPath: 'src/assets/people/women-hair-cut.jpg',
    title: i18n['en-US'].indexPage.woman_cut, // Eventos especiales
    description: 'Transforma tu look con cortes a la medida, alisados permanentes o temporales y tratamientos que cuidan tu cabello mientras realzan tu belleza natural.',
    filterFormat: {
      genres: ['41d1765c-108a-4ae4-aec2-c4316981026b'], // Mujer
      services: ['8f22821a-8e2b-435f-87b8-c63a1b83c711']
    }
  },
  {
    imgPath: 'src/assets/people/make-up-face-design.jpg',
    title: i18n['en-US'].indexPage.face_design, // Servicios para dama
    description: 'Desde maquillaje social hasta técnicas profesionales para eventos, novias o sesiones fotográficas. También ofrecemos limpieza facial, perfilado de cejas y más.',
    filterFormat: {
      services: ['5908787e-de56-4e6d-a840-c65d02781587']
    }
  },
  {
    imgPath: 'src/assets/people/nails-design.jpg',
    title: i18n['en-US'].indexPage.nail_design, // Cuidado de manos, pies y rostro (maquillajes, y depilaciones)
    description: 'Luce manos y pies impecables con nuestros servicios de cuidado y embellecimiento. Uñas acrílicas, semipermanentes, arte en uñas y tratamientos nutritivos.',
    filterFormat: {
      services: ['2c94799c-9a73-4a7a-b9a3-26e154b4f7a8']
    }
  },
];

defineOptions({
  name: 'IndexPage',
});
</script>
