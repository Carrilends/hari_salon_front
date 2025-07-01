<template>
  <div class="row flex flex-center" style="justify-content: space-between">
    <div class="col-8">
      <q-list bordered>
        <q-item
          v-for="card in menuCards"
          :key="card.title"
          class="q-py-md"
          clickable
          v-ripple
        >
          <!-- style="border: solid 1px #d1d9e6;" -->
          <q-avatar size="80px" class="q-mr-md">
            <img :src="card.imgPath" />
          </q-avatar>

          <q-item-section style="">
            <q-item-label class="text-h6">
              {{ card.title }}
            </q-item-label>
            <q-item-label caption>
              Hola esta es una descripcion de la tarjeta
            </q-item-label>
          </q-item-section>

          <q-item-section side>
            <q-btn
              color="black"
              class="q-mt-md"
              icon="arrow_forward_ios"
              to="/services"
              round
              size="md"
            />
          </q-item-section>
        </q-item>
      </q-list>
    </div>
  </div>
</template>

<!-- Horarios de atencion -->
<!-- Banner de contacto -->

<script setup lang="ts">
import { useOptions } from 'src/composables/shared/useOptions';
import i18n from 'src/i18n';

// const { isLoading } = useOptions()
useOptions();

const menuCards = [
  {
    imgPath: 'src/assets/people/man_hairdress.jpg',
    title: i18n['en-US'].indexPage.man_cut, // Servicios para caballero
  },
  {
    imgPath: 'src/assets/people/man_hairdress.jpg',
    title: i18n['en-US'].indexPage.man_cut, // Servicios para dama
  },
  {
    imgPath: 'src/assets/people/man_hairdress.jpg',
    title: i18n['en-US'].indexPage.man_cut, // Cuidado de manos, pies y rostro (maquillajes, y depilaciones)
  },
  {
    imgPath: 'src/assets/people/man_hairdress.jpg',
    title: i18n['en-US'].indexPage.man_cut, // Eventos especiales
  },
];

defineOptions({
  name: 'IndexPage',
});
</script>
