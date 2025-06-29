<template>
  <div>
    <q-layout container style="height: 100vh" class="shadow-2">
      <q-header style="background: #424242">
        <div class="row">
          <div class="col-3 flex flex-center">
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
          <div class="col-6">
            <q-tabs
              v-model="tab"
              class="text-grey-4"
              active-bg-color="grey-8"
              align="justify"
            >
              <!-- la-spa -->
              <!-- la-shopping-bag -->
              <q-tab name="services" icon="las la-cut" label="Servicios" />
              <q-tab
                name="schedule"
                icon="alarm"
                label="Horarios de atencion"
              />
              <q-tab name="who" icon="movie" label="¿Quiénes somos?" />
            </q-tabs>
          </div>
          <div class="col-3 flex flex-center">
            <q-btn
              class="color-bar"
              icon="local_mall"
              label="Tus servicios"
              rounded
              flat
            />
          </div>
        </div>
      </q-header>

      <q-page-container>
        <router-view />
        <whoWeAreDialog v-model:dialog="whoWeAreDialogComponent" />
        <ourContact v-model:dialog="ourContactDialog" />
      </q-page-container>
    </q-layout>
  </div>
</template>

<script setup lang="ts">
import { watch, ref } from 'vue';
import whoWeAreDialog from 'src/components/dialogs/whoWeAreDialog.vue';
import ourContact from 'src/components/dialogs/ourContact.vue';

defineOptions({
  name: 'MainLayout',
});

const tab = ref('');
const whoWeAreDialogComponent = ref(false);
const ourContactDialog = ref(false);

watch(
  () => tab.value,
  () => {
    // whoWeAreDialogComponent.value = !whoWeAreDialogComponent.value; // Cierra el diálogo al cambiar de pestaña
    ourContactDialog.value = !ourContactDialog.value; // Cierra el diálogo de contacto al cambiar de pestaña
  },
);

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

.color-bar {
  background: linear-gradient(100deg, #f8bbd0 0%, #bdc9d7 90%);
  color: black;
}
</style>
