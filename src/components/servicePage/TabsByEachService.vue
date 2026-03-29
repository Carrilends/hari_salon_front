<template>
  <div
    class="my-card"
    @mouseenter="isHovering = true"
    @mouseleave="isHovering = false"
  >
    <div class="card-content">
      <div :class="['img-container flex flex-center', { hovered: isHovering }]">
        <q-img
          :src="props.props.url || 'src/assets/examples/tupper.jpg'"
          fit="cover"
          spinner-color="primary"
          spinner-size="36px"
          class="service-card-img"
        >
          <template #loading>
            <div class="service-card-img-loading flex flex-center">
              <q-spinner-dots color="primary" size="36px" />
            </div>
          </template>
        </q-img>
        <div class="chip-overlay">
          <PriceDisplayPill :amount="props.props.precio" dense />
        </div>

        <q-btn
          v-if="authStore.isLoggedIn"
          @click="$emit('editService', props.props.id)"
          fab
          icon="edit"
          class="btn-overlay-edit"
          :class="{ visible: isHovering }"
        />
        <!-- BOTÓN DE ELIMINACIÓN -->
        <DeleteBtn
          @delete="deleteServiceFn"
          :element="props.props.id"
          :class="{ visible: isHovering }"
          class="btn-overlay-delete"
        />
        <!-- BOTÓN EN ESQUINA INFERIOR DERECHA -->
        <q-btn
          fab
          color="primary"
          icon="open_in_new"
          class="btn-overlay"
          @click="emit('detailService', props.props.id)"
          :class="{ visible: isHovering }"
        />
      </div>

      <div class="q-pa-sm color-bar col-12">
        {{ props.props.name }}
      </div>
    </div>
    <div class="overlay" :class="{ 'overlay-visible': isHovering }" />
  </div>
</template>

<script setup lang="ts">
import { useQuasar } from 'quasar';
import { deleteService } from 'src/composables/services/useService';
import { useAuthStore } from 'src/stores/auth-store';
import { ref } from 'vue';
import DeleteBtn from 'src/components/shared/btns/DeleteBtn.vue';
import PriceDisplayPill from 'src/components/shared/PriceDisplayPill.vue';

const authStore = useAuthStore();

const $q = useQuasar();
const isHovering = ref(false);
const props = defineProps<{
  props: {
    id: string;
    name: string;
    precio: number;
    url: string;
  };
  selected: boolean;
}>();

const emit = defineEmits(['detailService', 'deleteService', 'editService']);
const deleteServiceFn = (id: string) => {
  $q.dialog({
    title: 'Eliminar servicio',
    message: '¿Está seguro de que desea eliminar este servicio?',
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      await deleteService(id);
      $q.notify({
        type: 'positive',
        message: 'Servicio eliminado correctamente',
      });
    } catch (error) {
      $q.notify({
        type: 'negative',
        message: 'Error al eliminar el servicio',
      });
    }
    emit('deleteService', 'delete_service');
  });
};

defineOptions({
  name: 'TabsByEachService',
});
</script>

<style lang="scss" scoped>
.my-card {
  position: relative;
  overflow: hidden;
  width: 100%;
  height: 300px;
  max-width: 350px; // Puedes cambiar esto sin que se rompa el layout
  border-radius: 15px 15px 7px 7px;
}

.card-content {
  position: relative;
  z-index: 1;
}

.overlay {
  position: absolute;
  inset: 0; // equivale a top: 0; left: 0; right: 0; bottom: 0
  background-color: rgba(16, 47, 93, 0.119); // negro translúcido
  z-index: 2;
  border-radius: 15px 15px 7px 7px;
  pointer-events: none; // para que los elementos debajo sigan siendo interactivos
  opacity: 0;
  transition: opacity 0.3s ease;
}
.overlay-visible {
  opacity: 1;
}

.img-container {
  position: relative;
  width: 350px;
  height: 257px;
  overflow: hidden; // Muy importante para que la imagen no se salga
  cursor: pointer; // Cambia el cursor al pasar por encima
}
.service-card-img {
  border-radius: 20px 20px 0 0;
  width: 100%;
  height: 100%;
  transition: transform 0.3s ease-in-out;
}

.service-card-img-loading {
  width: 100%;
  height: 100%;
  min-height: 200px;
  background: linear-gradient(135deg, #eceff1 0%, #f5f5f5 100%);
}

.img-container.hovered .service-card-img {
  transform: scale(1.05);
}

.chip-overlay {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 10;
  max-width: calc(100% - 16px);
}

.btn-overlay-edit {
  position: absolute;
  bottom: 8px;
  left: 8px;
  z-index: 8;
  color: white;
  background-color: #5c6bc0;
  opacity: 0;
  transform: translateY(10px);
  transition: opacity 0.3s ease, transform 0.3s ease;
  pointer-events: none;
}

.btn-overlay-edit.visible {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

.btn-overlay-edit.visible:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.btn-overlay-delete {
  position: absolute;
  bottom: 8px;
  left: 70px;
  z-index: 8;
  color: white;
  background-color: #f87379;
  opacity: 0;
  transform: translateY(10px);
  transition: opacity 0.3s ease, transform 0.3s ease;
  pointer-events: none;
}

.btn-overlay-delete.visible {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

.btn-overlay-delete.visible:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.btn-overlay {
  position: absolute;
  bottom: 8px;
  right: 8px;
  z-index: 10;
  opacity: 0;
  transform: translateY(10px);
  transition: opacity 0.3s ease, transform 0.3s ease;
  pointer-events: none;
}

.btn-overlay.visible {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

/* Efecto pop al pasar el mouse sobre el botón */
.btn-overlay.visible:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.color-bar {
  background: linear-gradient(90deg, #f8bbd0 0%, #bdc9d7 90%);
  font-size: 18px;
  font-family: Cambria, Cochin, Georgia, Times, 'Times New Roman', serif;
  font-weight: bold;
  letter-spacing: 0.05em;
}
</style>
