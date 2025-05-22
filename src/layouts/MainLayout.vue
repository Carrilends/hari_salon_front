<template>
  <div>
    <q-layout
      view="lHh Lpr lff"
      container
      style="height: 100vh"
      class="shadow-2 rounded-borders"
    >
      <q-header elevated class="bg-pink-2">
        <q-toolbar style="height: 60px; align-items: center">
          <q-toolbar-title
            style="
              color: #132727;
              padding-left: 30px;
              font-weight: bold;
              font-size: 20px;
              font-style: italic;
              font-family: 'Gill Sans', 'Gill Sans MT', Calibri, 'Trebuchet MS',
                sans-serif;
            "
          >
            Peluqueria Marlene ✨💈
          </q-toolbar-title>
        </q-toolbar>
      </q-header>

      <q-drawer v-model="drawer" show-if-above :width="240" :breakpoint="400">
        <q-scroll-area
          style="
            height: calc(100% - 150px);
            margin-top: 150px;
            border-right: 1px solid #ddd;
          "
        >
          <q-list padding class="q-pt-md">
            <q-item active clickable v-ripple class="item">
              <q-item-section avatar>
                <q-icon name="inbox" />
              </q-item-section>

              <q-item-section> Inicio </q-item-section>
            </q-item>

            <q-item clickable v-ripple class="item">
              <q-item-section avatar>
                <q-icon name="star" />
              </q-item-section>

              <q-item-section> Servicios </q-item-section>
            </q-item>

            <q-item clickable v-ripple class="item">
              <q-item-section avatar>
                <q-icon name="send" />
              </q-item-section>

              <q-item-section> Planes </q-item-section>
            </q-item>

            <q-item clickable v-ripple class="item">
              <q-item-section avatar>
                <q-icon name="send" />
              </q-item-section>

              <q-item-section> Promosiones y bonos </q-item-section>
            </q-item>

            <q-item clickable v-ripple class="item">
              <q-item-section avatar>
                <q-icon name="drafts" />
              </q-item-section>

              <q-item-section> Contactanos </q-item-section>
            </q-item>
          </q-list>
        </q-scroll-area>

        <q-img
          class="absolute-top"
          :src="'src/assets/people/rainbow_hair.jpg'"
          style="height: 150px"
        />
      </q-drawer>

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

const drawer = ref(false);
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
