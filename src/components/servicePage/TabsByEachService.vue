<template>
  <div
    class="my-card"
    @mouseenter="isHovering = true"
    @mouseleave="isHovering = false"
  >
    <div class="card-content">
      <div :class="['img-container flex flex-center', { hovered: isHovering }]">
        <img
          style="border-radius: 20px 20px 0px 0px; width: 100%; height: 100%"
          :src="props.props.principalImg && 'src/assets/examples/tupper.jpg'"
        />

        <!-- CHIP EN ESQUINA SUPERIOR DERECHA -->
        <q-chip class="chip-overlay">
          <q-avatar
            color="green"
            size="35px"
            icon="las la-dollar-sign"
            text-color="white"
          />
          {{ props.props.precio }}.000 COP
        </q-chip>

        <q-btn
          fab
          icon="edit"
          class="btn-overlay-edit"
          :class="{ visible: isHovering }"
        />
        <q-btn
          fab
          icon="delete"
          class="btn-overlay-delete"
          @click="deleteServiceFn(props.props.id)"
          :class="{ visible: isHovering }"
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
import { ref } from 'vue';

const $q = useQuasar();
const isHovering = ref(false);
const props = defineProps<{
  props: {
    id: string;
    name: string;
    precio: number;
    principalImg: string;
  };
  selected: boolean;
}>();

const emit = defineEmits(['detailService', 'deleteService']);
const deleteServiceFn = (id: string) => {
  $q.dialog({
    title: 'Eliminar servicio',
    message: '¿Está seguro de que desea eliminar este servicio?',
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    await deleteService(id);
    emit('deleteService', id);
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
.img-container img {
  transition: transform 0.3s ease-in-out;
}
.img-container.hovered img {
  transform: scale(1.05); // Efecto de zoom hacia adentro
}

.chip-overlay {
  position: absolute;
  top: 8px;
  right: 8px;
  border-radius: 10px;
  z-index: 10;
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
