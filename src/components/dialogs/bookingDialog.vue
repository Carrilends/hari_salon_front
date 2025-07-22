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
              <div class="title-text">TUS RESERVAS</div>
              <!-- Badge con el número de reservas -->
              <div class="badge">
                {{ bookStore.bookings.length }}
              </div>
            </div>
            <!-- SERVICIOS DERIVADOS -->
            <div
              class="col-12 q-my-md q-pa-sm"
              style="background: #f2f2f2; border-radius: 8px"
            >
              <div class="row">
                <!-- TODO: Mostrar texto condicionado si no hay reservas -->
                <div class="col-11 flex flex-center">
                  {{
                    bookStore.bookings.length
                      ? 'Aquí están tus reservas'
                      : 'No tienes reservas aún'
                  }}
                </div>
              </div>
            </div>
            <div class="col-12 q-my-md q-pa-sm" style="">
              <q-scroll-area
                :thumb-style="thumbStyle"
                :bar-style="barStyle"
                class="q-py-sm"
                style="
                  height: 500px;
                  background-color: #f2f2f2;
                  border-radius: 8px;
                "
              >
                <q-list class="q-pr-md">
                  <q-item
                    v-for="card in bookStore.bookings"
                    class="q-py-md cursor-default hoverable"
                    :key="card.id"
                    v-ripple="false"
                  >
                    <!-- style="border: solid 1px #d1d9e6;" -->
                    <q-avatar
                      size="75px"
                      class="q-mr-md"
                      style="background: #e3e3e8"
                    >
                      <img
                        style="width: 80px"
                        :src="
                          card.images.filter((img) => img.isPrincipal)[0].url
                        "
                      />
                    </q-avatar>

                    <q-item-section>
                      <div class="col-12 q-pt-sm">
                        <q-item-label
                          style="
                            font-weight: bold;
                            font-size: 17px;
                            font-family: Georgia, 'Times New Roman', Times,
                              serif;
                            color: #333;
                          "
                        >
                          {{ card.name }}
                        </q-item-label>
                        <q-item-label style="font-size: 15px; color: #333">
                          <q-chip>
                            <q-avatar
                              icon="attach_money"
                              color="green"
                              text-color="white"
                            />
                            {{ card.price }}.000
                          </q-chip>
                        </q-item-label>
                      </div>
                    </q-item-section>

                    <q-item-section side>
                      <div class="side-btns">
                        <q-btn
                          @click="removeBooking(card.id)"
                          round
                          size="md"
                          color="red"
                          icon="delete"
                        />
                        <q-btn
                          @click="goToDetail(card)"
                          round
                          size="md"
                          color="primary"
                          icon="chevron_right"
                        />
                      </div>
                    </q-item-section>
                  </q-item>
                </q-list>
              </q-scroll-area>
            </div>
          </div>
        </q-card-section>
        <q-card-section>
          <div
            style="
              font-weight: bold;
              font-size: 17px;
              font-family: Georgia, 'Times New Roman', Times, serif;
              color: #424242;
            "
          >
            Total de reservas:
            <q-chip size="16px">
              <q-avatar icon="attach_money" color="green" text-color="white" />
              {{ totalCost }}.000
            </q-chip>
          </div>
        </q-card-section>
        <q-separator inset />
        <q-card-section
          class="flex justify-center items-center"
          style="min-height: 120px"
        >
          <q-btn
            :disable="!bookStore.bookings.length"
            label="Reservar"
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
import { useBookStore } from 'src/stores/book-store';
import { computed } from 'vue';
import { useQuasar } from 'quasar';
import ServiceDialog from './serviceDialog.vue';
import Service from 'src/interfaces/service';

const $q = useQuasar();
const bookStore = useBookStore();

const props = defineProps<{ dialog: boolean }>();
const emit = defineEmits<DialogEmits & FiltersEmits>();

const totalCost = computed(() => {
  return bookStore.bookings.reduce((acc, booking) => {
    return acc + Number(booking.price || 0);
  }, 0);
});

const removeBooking = (id: string) => {
  $q.dialog({
    title: 'Eliminar reserva',
    message: '¿Está seguro de que desea eliminar esta reserva?',
    cancel: true,
    persistent: true,
  }).onOk(() => {
    bookStore.removeBooking(id);
  });
};

const goToDetail = (card: Service) => {
  $q.dialog({
    component: ServiceDialog,
    componentProps: {
      service: card,
      isFromBooking: true,
    },
  }).onOk((e) => {
    console.log('Dialog OK:', e);
  });
};

const thumbStyle = {
  right: '4px',
  borderRadius: '5px',
  backgroundColor: '#027be3',
  width: '5px',
  opacity: '0.75',
};

const barStyle = {
  right: '2px',
  borderRadius: '9px',
  backgroundColor: '#027be3',
  width: '9px',
  opacity: '0.2',
};

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

/* estado inicial: botones ocultos y desplazados */
.hoverable {
  transition: background-color 0.25s ease;
}

.hoverable:hover {
  background-color: #a09b9d; /* cambia por el color que quieras */
}

.hoverable .side-btns {
  opacity: 0;
  transform: translateX(20px) scale(0.8);
  transition: opacity 0.25s ease, transform 0.25s ease;
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

/* al hacer hover en todo el q-item: botones entran con animación “chula” */
.hoverable:hover .side-btns {
  opacity: 1;
  transform: translateX(0) scale(1);
}
</style>
