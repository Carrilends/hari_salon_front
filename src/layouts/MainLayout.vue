<template>
  <div>
    <q-layout container style="height: 100vh" class="shadow-2">
      <q-header style="background: #424242">
        <div class="row">
          <div class="col-3 flex flex-center">
            <div
              @click="() => { router.push('/') }"
              style="
                cursor: pointer;
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
            <div class="row" style="padding: 20px 0;">
              <div
                v-for="button in buttons"
                :key="button.label"
                class="col flex flex-center"
              >
                <q-btn
                  @click="button.method"
                  :class="button.class"
                  :icon="button.icon"
                  :label="button.label"
                  rounded
                  flat
                />
              </div>
            </div>
          </div>
          <div class="col-3 flex flex-center">
            <q-btn
              class="color-bar"
              icon="local_mall"
              label="Tus reservas"
              rounded
              flat
            />
          </div>
        </div>
      </q-header>

      <q-page-container>
        <router-view />
        <whoWeAreDialog v-model:dialog="whoWeAreDialogComponent"/>
        <ourContact v-model:dialog="ourContactDialog"/>
      </q-page-container>
    </q-layout>
  </div>
</template>

<script setup lang="ts">
import { ref, onUpdated } from 'vue';
import { useRouter } from 'vue-router';
import ourContact from 'src/components/dialogs/ourContact.vue';
import whoWeAreDialog from 'src/components/dialogs/whoWeAreDialog.vue';

const router = useRouter();
const whoWeAreDialogComponent = ref(false);
const ourContactDialog = ref(false);

const buttons = ref([
  {
    icon: 'las la-cut',
    label: 'Servicios',
    class: 'color-bar q-pr-lg',
    method: () => router.push('/services')
  },
  {
    icon: 'schedule',
    label: 'Horarios',
    class: 'color-bar',
    method: () => ourContactDialog.value = !ourContactDialog.value,
  },
  {
    icon: 'las la-user-tie',
    label: '¿Quiénes somos?',
    class: 'color-bar',
    method: () => whoWeAreDialogComponent.value = !whoWeAreDialogComponent.value,
  }
]);

onUpdated(() => {
  if (router.currentRoute.value.path === '/') {
    buttons.value[0].icon = 'las la-cut';
    buttons.value[0].label = 'Servicios';
    buttons.value[0].method = () => router.push('/services');
  } else if (router.currentRoute.value.path === '/services') {
    buttons.value[0].icon = 'las la-arrow-left';
    buttons.value[0].label = 'Inicio';
    buttons.value[0].method = () => router.push('/');
  }
})

defineOptions({
  name: 'MainLayout',
});

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
