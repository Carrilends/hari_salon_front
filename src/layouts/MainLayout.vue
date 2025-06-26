<template>
  <div>
    <q-layout container style="height: 100vh" class="shadow-2">
      <q-header style="background: #525252">
        <div class="row">
          <div class="col-3 flex flex-center" style="border: solid red 1px">
            <div
              style="
                font-size: 1.4rem;
                font-weight: 700;
                color: white;
                font-family: system-ui, -apple-system, BlinkMacSystemFont,
                  'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans',
                  'Helvetica Neue', sans-serif;
              "
            >
              💈 Peluqueria pecas 💈
            </div>
          </div>
          <div class="col-6" style="border: solid red 1px">
            <q-tabs
              v-model="tab"
              class="text-grey-5 shadow-2"
              indicator-color="transparent"
              active-color="white"
              align="justify"
            >
            <!-- la-spa -->
             <!-- la-shopping-bag -->
              <q-tab name="mails" icon="self_care" label="Mails" />
              <q-tab name="mails" icon="mail" label="Mails" />
              <q-tab name="alarms" icon="alarm" label="Alarms" />
              <q-tab name="movies" icon="movie" label="Movies" />
            </q-tabs>
          </div>
          <div class="col-3" style="border: solid red 1px">
            Dialog de reserva
          </div>
        </div>
      </q-header>

      <!-- <q-drawer v-model="drawer" show-if-above :width="240" :breakpoint="400">
        <q-item-section> Servicios </q-item-section>
        <q-item-section> Planes </q-item-section>
        <q-item-section> Promosiones y bonos </q-item-section>
        <q-item-section> Contactanos </q-item-section>
        <q-img
          class="absolute-top"
          :src="'src/assets/people/rainbow_hair.jpg'"
          style="height: 150px"
        />
      </q-drawer> -->

      <q-page-container>
        <router-view />
      </q-page-container>
    </q-layout>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

defineOptions({
  name: 'MainLayout',
});

const tab = ref('');
</script>

<style scoped lang="scss">
.item {
  transition: all 0.3s ease;
  transform-origin: right;
}
.item:hover {
  background-color: #f8bbd0;
  transform: translateX(-3px) scaleY(1.05); // Desplaza hacia la derecha y expande verticalmente
  box-shadow: 4px 4px 8px rgba(209, 122, 156, 0.3);
  border-top-right-radius: 15px; // Borde redondeado en la esquina superior derecha
  border-bottom-right-radius: 15px; // Borde redondeado en la esquina inferior derecha
}
</style>
