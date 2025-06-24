<template>
  <q-page class="row items-start q-px-xl q-pt-xl">
    <div class="col-12">
      <div class="row flex flex-center" style="justify-content: space-between">
        <div v-for="card in menuCards" :key="card.title" class="q-px-xs">
          <card :imgPath="card.imgPath" :title="card.title" />
        </div>
      </div>
    </div>
    <div class="row full-width">
      <schedule class="col-3"/>
      <principal-banner class="col-9"/>
    </div>
  </q-page>
</template>

<!-- Horarios de atencion -->
<!-- Banner de contacto -->

<script setup lang="ts">
import PrincipalBanner from 'src/components/banners/PrincipalBanner.vue';
import Schedule from 'src/components/banners/Schedule.vue';
import Card from 'src/components/cards/Card.vue';
import { useOptions } from 'src/composables/shared/useOptions';
import i18n from 'src/i18n';

// const { isLoading } = useOptions()
useOptions()

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
