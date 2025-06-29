<template>
  <q-dialog v-model="dialog">
    <div class="row q-py-xl" style="background: #424242; width: 450px; border-radius: 15px">
      <div class="col-12">
        <q-card class="my-card">
          <q-card-section horizontal>
            <q-img class="col-6" src="src/assets/places/hair_salon.jpg" />

            <q-card-section style="width: 100%">
              <div class="row title" style="font-size: 16px">
                <div class="col-12 text-center q-pb-lg" style="font-size: 17px">
                  Horarios de atencion
                </div>
                <div class="col-12">Lunes - viernes :</div>
                <div class="col-12" style="color: brown">8:00 am - 9:00 pm</div>
                <div class="col-12 q-pt-md">Sabado, Domingo y Festivos :</div>
                <div class="col-12" style="color: brown">9:00 am - 7:00 pm</div>
              </div>
            </q-card-section>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 q-pt-md">
        <q-card dark bordered class="bg-grey-9 my-card" style="height: 180px">
          <q-card-section>
            <div class="text-h6">Contactanos</div>
            <div class="text-subtitle2">
              Peluqueria Marlene esta a tu servicio
            </div>
          </q-card-section>

          <q-separator dark inset />

          <q-card-section class="title text-center">
            <span class="q-pr-md">(57+) 320 897 74 71</span>
            <q-btn
              flat
              round
              size="18px"
              color="primary"
              icon="lab la-whatsapp"
            />
          </q-card-section>
        </q-card>
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

defineOptions({
  name: 'ourContact',
});
</script>

<style scoped lang="scss">
.my-card {
  width: 350px;
  height: 243px;
  margin: 0 auto;
}

.example {
  background: #e79e9e;
}
</style>
