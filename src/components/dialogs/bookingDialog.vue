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
                {{ bookStore.totalBookingQuantity }}
              </div>
            </div>
            <!-- SERVICIOS DERIVADOS -->
            <div
              class="col-12 q-my-md q-pa-sm"
              style="background: #f2f2f2; border-radius: 8px"
            >
              <div class="row">
                <div class="col-11 flex flex-center">
                  {{
                    bookStore.totalBookingQuantity
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
                  height: 400px;
                  background-color: #f2f2f2;
                  border-radius: 8px;
                "
              >
                <q-list class="q-pr-md">
                  <q-item
                    v-for="line in bookStore.bookings"
                    class="q-py-md cursor-default hoverable"
                    :key="line.service.id"
                    v-ripple="false"
                  >
                    <q-avatar
                      size="75px"
                      class="q-mr-md booking-avatar"
                      style="background: #e3e3e8"
                    >
                      <q-img
                        :src="principalImageUrl(line)"
                        fit="cover"
                        spinner-color="primary"
                        spinner-size="28px"
                        class="full-width full-height"
                      >
                        <template #loading>
                          <div
                            class="full-width full-height flex flex-center booking-avatar-loading"
                          >
                            <q-spinner-dots color="primary" size="28px" />
                          </div>
                        </template>
                      </q-img>
                    </q-avatar>

                    <q-item-section>
                      <div class="col-12 q-pt-sm">
                        <q-item-label
                          class="row items-center no-wrap"
                          style="
                            font-weight: bold;
                            font-size: 17px;
                            font-family: Georgia, 'Times New Roman', Times,
                              serif;
                            color: #333;
                          "
                        >
                          <span class="ellipsis">{{ line.service.name }}</span>
                          <q-badge color="primary" rounded class="q-ml-sm">
                            ×{{ line.quantity }}
                          </q-badge>
                        </q-item-label>
                        <q-item-label class="booking-line-price">
                          <PriceDisplayPill
                            :amount="lineSubtotal(line)"
                            dense
                          />
                          <span
                            v-if="line.quantity > 1"
                            class="booking-price-detail text-grey-7 q-ml-sm"
                          >
                            ({{
                              formatCopDisplay(line.service.price)
                            }}
                            × {{ line.quantity }})
                          </span>
                        </q-item-label>
                      </div>
                    </q-item-section>

                    <q-item-section side class="items-end">
                      <div class="side-btns">
                        <div class="booking-quantity-controls">
                          <q-btn
                            @click="increaseBooking(line.service)"
                            round
                            flat
                            dense
                            size="sm"
                            color="primary"
                            icon="add"
                          />
                          <div class="booking-quantity-value">
                            {{ line.quantity }}
                          </div>
                          <q-btn
                            @click="decreaseBooking(line.service.id)"
                            round
                            flat
                            dense
                            size="sm"
                            color="grey-8"
                            icon="remove"
                            :disable="line.quantity <= 1"
                          />
                        </div>
                        <q-btn
                          @click="removeBooking(line.service.id)"
                          round
                          size="md"
                          color="red"
                          icon="delete"
                        />
                        <q-btn
                          @click="goToDetail(line.service)"
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
              <q-btn
                @click="manageVisualizationDialog(true)"
                :disable="!bookStore.totalBookingQuantity"
                icon="event"
                label="Elegir Fecha y Hora"
                color="primary"
                class="full-width q-mt-sm"
                style="margin-bottom: 12px"
              />
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
                  <PriceDisplayPill
                    class="q-ml-sm"
                    :amount="bookStore.bookingsCost"
                  />
                </div>
                <!-- Recuadro de fecha y hora -->
                <div class="date-time-info-box q-mt-md">
                  <div class="row items-center q-gutter-sm">
                    <q-icon name="event" size="20px" color="primary" />
                    <div class="col">
                      <div class="date-time-label">Fecha y Hora de Reserva</div>
                      <div class="date-time-value">
                        {{ formattedDateTime }}
                      </div>
                    </div>
                  </div>
                </div>
              </q-card-section>
            </div>
          </div>
        </q-card-section>
        <q-separator inset />
        <q-card-section
          class="flex justify-center items-center"
          style="min-height: 120px"
        >
          <q-btn
            @click="sendBookingData"
            :disable="!bookStore.totalBookingQuantity || !date || !time"
            label="Reservar"
            color="blue"
          />
        </q-card-section>
      </q-card>
    </q-dialog>
    <q-dialog v-model="dateCard">
      <q-card class="date-time-card">
        <!-- Header con título y botón de cerrar -->
        <q-card-section
          class="date-time-header row items-center justify-between q-pa-md"
        >
          <div class="date-time-title">Selecciona Fecha y Hora</div>
          <q-btn
            icon="close"
            round
            flat
            dense
            color="grey-8"
            @click="manageVisualizationDialog(false)"
            class="close-btn"
          />
        </q-card-section>

        <q-separator />

        <!-- Tabs para fecha y hora -->
        <q-tabs
          v-model="tab"
          dense
          class="date-time-tabs"
          align="justify"
          narrow-indicator
          active-color="primary"
          indicator-color="primary"
        >
          <q-tab name="date" label="Fecha" icon="event" />
          <q-tab name="time" label="Hora" icon="schedule" />
        </q-tabs>

        <q-separator />

        <!-- Paneles de fecha y hora -->
        <q-tab-panels v-model="tab" animated class="date-time-panels">
          <q-tab-panel name="date" class="q-pa-lg">
            <div class="date-picker-container">
              <q-date
                v-model="date"
                first-day-of-week="1"
                color="primary"
                class="date-picker"
              />
            </div>
          </q-tab-panel>

          <q-tab-panel name="time" class="q-pa-lg">
            <div class="time-picker-container">
              <q-time
                v-model="time"
                mask="YYYY-MM-DD HH:mm"
                color="primary"
                class="time-picker"
              />
            </div>
          </q-tab-panel>
        </q-tab-panels>

        <q-separator />

        <!-- Footer con botones -->
        <q-card-section
          class="date-time-footer row justify-end q-pa-md q-gutter-sm"
        >
          <q-btn
            flat
            label="Cancelar"
            color="grey-8"
            @click="manageVisualizationDialog(false)"
          />
          <q-btn
            label="Confirmar"
            color="primary"
            @click="confirmDateTime"
            :disable="!date || !time"
          />
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>
<script setup lang="ts">
import { FiltersEmits } from 'src/composables/dialogs/useServiceFilter';
import {
  useDialog,
  type DialogEmits,
} from 'src/composables/dialogs/useDialogService';
import { useBookStore } from 'src/stores/book-store';
import type { BookingLine } from 'src/interfaces/booking';
import { computed, ref, watch } from 'vue';
import { useQuasar } from 'quasar';
import ServiceDialog from './serviceDialog.vue';
import Service from 'src/interfaces/service';
import { getService } from 'src/composables/services/useService';
import { formatCopDisplay } from 'src/helpers/price-display';
import PriceDisplayPill from 'src/components/shared/PriceDisplayPill.vue';

const $q = useQuasar();
const bookStore = useBookStore();

const props = defineProps<{ dialog: boolean }>();
const emit = defineEmits<DialogEmits & FiltersEmits>();

const dateCard = ref(false);
const date = ref('' /* '2025/01/01' */);
const time = ref('');
const tab = ref('date');

const principalImageUrl = (line: BookingLine) => {
  const img = line.service.images?.find((i) => i.isPrincipal);
  return img?.url ?? '';
};

const lineSubtotal = (line: BookingLine) =>
  Number(line.service.price || 0) * line.quantity;

const increaseBooking = (service: Service) => {
  bookStore.incrementBookingQuantity(service);
};

const decreaseBooking = (serviceId: string) => {
  bookStore.decrementBookingQuantity(serviceId);
};

const sendBookingData = () => {
  // Validar que haya reservas
  if (!bookStore.totalBookingQuantity) {
    $q.notify({
      type: 'warning',
      message: 'No hay servicios reservados',
      position: 'top',
    });
    return;
  }

  // Validar que haya fecha y hora seleccionada
  if (!date.value || !time.value) {
    $q.notify({
      type: 'warning',
      message: 'Por favor selecciona una fecha y hora para la reserva',
      position: 'top',
    });
    return;
  }

  // Generar mensaje y abrir WhatsApp
  const message = generateWhatsAppMessage();
  openWhatsApp(message);

  // Mantener console.log para debugging
  console.log('Enviando datos de reserva:', bookStore.bookings);
};

const manageVisualizationDialog = (val: boolean) => {
  dateCard.value = val;
};

const confirmDateTime = () => {
  if (date.value && time.value) {
    dateCard.value = false;
  }
};

watch(date, (newDate, oldDate) => {
  if (newDate !== oldDate) {
    tab.value = 'time';
  }
});

const formattedDateTime = computed(() => {
  if (!date.value || !time.value) {
    return 'No se ha seleccionado fecha y hora';
  }

  try {
    // Formatear la fecha
    const dateParts = date.value.split('/');
    if (dateParts.length === 3) {
      const year = dateParts[0];
      const month = dateParts[1];
      const day = dateParts[2];

      // Nombres de los meses en español
      const monthNames = [
        'Enero',
        'Feb',
        'Marzo',
        'Abril',
        'Mayo',
        'Jun',
        'Jul',
        'Ago',
        'Sep',
        'Oct',
        'Nov',
        'Dic',
      ];

      const monthName = monthNames[parseInt(month) - 1];
      const formattedDate = `${day} de ${monthName} de ${year}`;

      // Formatear la hora
      const timeParts = time.value.split(' ')[1].split(':');
      if (timeParts.length >= 2) {
        const hours = timeParts[0];
        const minutes = timeParts[1];
        const formattedTime = `${hours}:${minutes}`;

        return `${formattedDate} a las ${formattedTime}`;
      }

      return formattedDate;
    }

    return `${date.value} - ${time.value}`;
  } catch (error) {
    return `${date.value} - ${time.value}`;
  }
});

const generateWhatsAppMessage = (): string => {
  const servicesList = bookStore.bookings
    .map((line) => {
      const principalImage = line.service.images?.find(
        (img) => img.isPrincipal
      );
      const imageUrl = principalImage?.url || '';
      const qty = line.quantity > 1 ? ` (×${line.quantity})` : '';

      if (imageUrl) {
        return `• ${line.service.name}${qty}: ${imageUrl}`;
      }
      return `• ${line.service.name}${qty}`;
    })
    .join('\n');

  const message = `*Reserva - Hari Salon*

*Servicios reservados:*
${servicesList}

*Costo Total:* ${formatCopDisplay(bookStore.bookingsCost)} COP

*Fecha y Hora:* ${formattedDateTime.value}`;

  return message;
};

const openWhatsApp = (message: string) => {
  const phoneNumber = '573208977471';
  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
  window.open(whatsappUrl, '_blank');
};

const removeBooking = (id: string) => {
  $q.dialog({
    title: 'Eliminar reserva',
    message: '¿Está seguro de que desea eliminar esta reserva?',
    cancel: true,
    persistent: true,
  }).onOk(() => {
    $q.loading.show({
      message: 'Eliminando reserva...',
      spinnerColor: 'primary',
    });
    try {
      bookStore.removeBooking(id);
    } finally {
      $q.loading.hide();
    }
  });
};

const goToDetail = async (card: Service) => {
  $q.loading.show({ message: 'Cargando servicio...' });
  try {
    const fresh = await getService(card.id);
    bookStore.syncBookingWithService(fresh);
    $q.dialog({
      component: ServiceDialog,
      componentProps: {
        service: fresh,
        isFromBooking: true,
      },
    }).onOk((e) => {
      console.log('Dialog OK:', e);
    });
  } catch {
    $q.notify({
      type: 'negative',
      message: 'No se pudo cargar el detalle del servicio',
      position: 'top',
    });
  } finally {
    $q.loading.hide();
  }
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

.hoverable:hover .side-btns {
  opacity: 1;
  transform: translateX(0) scale(1);
}

.booking-quantity-controls {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.1rem;
  min-width: 42px;
  padding: 0.2rem 0.15rem;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(66, 66, 66, 0.12);
}

.booking-quantity-value {
  min-width: 24px;
  text-align: center;
  font-weight: bold;
  color: #333;
  font-size: 14px;
  line-height: 1;
}

.booking-avatar {
  overflow: hidden;
}

.booking-avatar-loading {
  background: #e3e3e8;
}

/* Estilos para el diálogo de fecha y hora */
.date-time-card {
  min-width: 400px;
  max-width: 500px;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.date-time-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px 12px 0 0;
  min-height: 60px;
}

.date-time-title {
  font-size: 18px;
  font-weight: bold;
  color: white;
  font-family: Georgia, 'Times New Roman', Times, serif;
}

.close-btn {
  transition: transform 0.2s ease, background-color 0.2s ease;
}

.close-btn:hover {
  transform: rotate(90deg);
  background-color: rgba(255, 255, 255, 0.2);
}

.date-time-tabs {
  background-color: #f5f5f5;
  padding: 4px 0;
}

.date-time-tabs .q-tab {
  font-weight: 500;
  text-transform: none;
  font-size: 14px;
}

.date-time-panels {
  min-height: 350px;
  background-color: #fafafa;
}

.date-picker-container,
.time-picker-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px 0;
}

.date-picker,
.time-picker {
  border-radius: 8px;
  background-color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.date-time-footer {
  background-color: #f9f9f9;
  border-radius: 0 0 12px 12px;
  min-height: 70px;
}

.date-time-footer .q-btn {
  min-width: 100px;
  font-weight: 500;
  text-transform: none;
  border-radius: 6px;
}

/* Estilos para el recuadro de fecha y hora */
.date-time-info-box {
  background-color: #f5f5f5;
  border-radius: 8px;
  padding: 16px;
  transition: background-color 0.2s ease;
}

.date-time-label {
  font-size: 12px;
  color: #757575;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.date-time-value {
  font-size: 15px;
  color: #424242;
  font-weight: 500;
  font-family: Georgia, 'Times New Roman', Times, serif;
  line-height: 1.4;
}

.booking-line-price {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 0;
  font-size: 15px;
  color: #333;
}

.booking-price-detail {
  font-size: 13px;
}
</style>
