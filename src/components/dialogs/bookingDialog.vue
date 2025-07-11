<template>
  <div class="q-gutter-sm">
    <q-dialog v-model="dialog" position="right" full-height>
      <q-card class="column full-height" style="width: 500px">
        <q-card-section class="col q-pa-none" style="overflow-y: auto">
          <div class="col-row items-center q-pa-md">
            <div class="col-12 q-my-md badge-container row items-center">
              <!-- Botón a la izquierda -->
              <q-btn
                icon="arrow_back"
                round
                outline
                color="blue"
                @click="hide"
                class="q-mr-sm glass"
              />

              <!-- Título -->
              <div class="title-text">
                HOLA titulo
              </div>
              <q-btn
                icon="cleaning_services"
                round
                color="blue"
                @click="() => console.log('hola')"
                class="q-ml-sm"
              />
            </div>
            <!-- GENEROS -->
            <div class="col-12 q-py-md" style="min-width: 250px">
              HOLA
            </div>
            <!-- SERVICIOS DERIVADOS -->
            <div
              class="col-12 q-my-md q-pa-sm"
              style="
                background: #f2f2f2;
                border-radius: 8px
              "
            >
              <div class="row">
                <div class="col-11 flex flex-center">
                  Listado de servicios:
                </div>
                <div
                  class="col-1"
                >
                  <q-btn
                    color="red"
                    icon="close"
                    size="sm"
                    round
                    flat
                  />
                </div>
              </div>
            </div>
            <div
              class="col-12 q-my-md q-pa-sm"
              style="background: #f2f2f2"
            >
              HOLA
            </div>
          </div>
        </q-card-section>
        <q-separator inset />
        <q-card-section
          class="flex justify-center items-center"
          style="min-height: 120px"
        >
          <q-btn
            label="Aplicar filtro"
            color="blue"
          />
        </q-card-section>
      </q-card>
    </q-dialog>
    <!-- The display value -->
    <!-- Customizing menu options -->
  </div>
</template>
<script setup lang="ts">
import { FiltersEmits } from 'src/composables/dialogs/useServiceFilter';
import {
  useDialog,
  type DialogEmits,
} from 'src/composables/dialogs/useDialogService';

const props = defineProps<{ dialog: boolean }>();
const emit = defineEmits<DialogEmits & FiltersEmits>();


const { dialog, hide } = useDialog(props, emit);


</script>

<style lang="scss" scoped>
.title {
  padding: 6px 0;
  font-size: 22px;
  font-weight: bold;
  text-align: center;
  border-radius: 10px;
  font-family: Georgia, 'Times New Roman', Times, serif;
  background: linear-gradient(90deg, #f8bbd0 0%, #bdc9d7 90%);
}
.badge-container {
  position: relative;
  display: flex;
  align-items: center;
}

.title-text {
  position: relative;
  font-size: 22px;
  font-weight: bold;
  font-family: Georgia, 'Times New Roman', Times, serif;
  background: linear-gradient(90deg, #f8bbd0 0%, #bdc9d7 90%);
  padding: 10px 16px;
  border-radius: 10px;
  flex-grow: 1;
  text-align: center;
}

.badge {
  position: absolute;
  top: -12px;
  right: -12px;
  background-color: #e53935; // rojo más fuerte
  color: white;
  font-weight: bold;
  border-radius: 50%;
  padding: 6px 10px;
  font-size: 16px;
  min-width: 28px;
  min-height: 28px;
  line-height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
  z-index: 10;
}
</style>
