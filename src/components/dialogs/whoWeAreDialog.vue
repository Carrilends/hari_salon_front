<template>
  <q-dialog v-model="dialog">
    <div class="row q-pa-lg" style="background: #1f1f1f; width: 1000px">
      <div class="col-12 image-container">
        <div class="hair-salon" />
        <div class="bottom-gradient" />
        <div class="address-tag">
          Carrera 3 #1-18, Sopó Cundinamarca
        </div>
      </div>

      <div class="col-12">
        <div class="title q-py-sm" style="color: white; font-size: 35px">
          ¿Quiénes somos?
        </div>
        <q-separator dark />
        <div class="q-pt-md" style="color: white; line-height: 1.5; font-size: 15px">
          Peluquería Marlene es un lugar donde te sentirás como en casa, con un
          ambiente agradable y un personal amable y profesional. Hemos trabajado
          por más de 20 años en el sector de la belleza y la estética,
          ofreciendo servicios de calidad y a precios accesibles.
        </div>
      </div>
    </div>
  </q-dialog>
</template>


<script setup lang="ts">
import {
  DialogEmits,
  useDialog,
} from 'src/composables/dialogs/useDialogService';

const props = defineProps<{ dialog: boolean }>();
const emit = defineEmits<DialogEmits>();

const { dialog /* , hide */ } = useDialog(props, emit);
</script>

<style lang="scss" scoped>
.image-container {
  position: relative;
  height: 360px;
  border-radius: 15px;
  overflow: hidden;
}

.hair-salon {
  background: url('src/assets/places/salon.jpg') no-repeat center center;
  background-size: cover;
  width: 100%;
  height: 100%;
  border-radius: 15px;
}

.bottom-gradient {
  position: absolute;
  bottom: 0;
  height: 100px;
  width: 100%;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.3), transparent);
  pointer-events: none;
}

.address-tag {
  position: absolute;
  bottom: 10px;
  right: 15px;
  background-color: rgba(0, 0, 0, 0.7);
  color: #fff;
  font-size: 15px;
  padding: 6px 10px;
  border-radius: 6px;
  font-weight: 500;
}
</style>
