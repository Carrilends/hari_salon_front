<template>
  <div class="q-gutter-sm">
    <q-dialog
      v-model="dialog"
      :position="maximized ? 'standard' : 'right'"
      :full-height="!maximized"
      :maximized="maximized"
      :transition-show="maximized ? 'slide-up' : 'slide-left'"
      :transition-hide="maximized ? 'slide-down' : 'slide-right'"
    >
      <q-card
        class="column full-height booking-dialog-card"
        :class="{ 'booking-dialog-card--maximized': maximized }"
      >
        <q-card-section
          class="col q-pa-none booking-dialog__body"
          :class="{ 'booking-dialog__body--maximized': maximized }"
          style="overflow-y: auto"
        >
          <div
            class="row booking-dialog__inner"
            :class="maximized ? 'q-pt-md q-pb-md q-px-sm' : 'q-pa-md'"
          >
            <div class="col-12 q-my-md badge-container row items-center no-wrap">
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
              <div
                class="title-text"
                :class="{ 'title-text--maximized': maximized }"
              >
                TUS RESERVAS
              </div>
              <!-- Badge con el número de reservas -->
              <div class="badge">
                {{ bookStore.totalBookingQuantity }}
              </div>
            </div>
            <!-- SERVICIOS DERIVADOS -->
            <div
              class="col-12 q-my-md q-pa-sm booking-dialog__hint"
              style="background: #f2f2f2; border-radius: 8px"
            >
              <div class="text-body2 text-dark">
                {{
                  bookStore.totalBookingQuantity
                    ? 'Aquí están tus reservas'
                    : 'No tienes reservas aún'
                }}
              </div>
            </div>
            <div
              class="col-12 q-my-md q-pa-sm booking-dialog__main-col"
              :class="{ 'booking-dialog__main-col--maximized': maximized }"
            >
              <q-scroll-area
                :thumb-style="thumbStyle"
                :bar-style="barStyle"
                class="q-py-sm booking-dialog__list-scroll"
                :class="{ 'booking-dialog__list-scroll--maximized': maximized }"
                :style="bookingListScrollStyle"
              >
                <q-list :class="maximized ? 'q-px-xs' : 'q-pr-md'">
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
                          <div class="row items-center flex-wrap">
                            <template v-if="serviceIsOnPromotion(line.service)">
                              <span
                                class="booking-price-original text-grey-6 q-mr-sm"
                              >
                                <PriceDisplayPill
                                  :amount="
                                    Number(line.service.price || 0) *
                                    line.quantity
                                  "
                                  dense
                                />
                              </span>
                            </template>
                            <PriceDisplayPill
                              :amount="lineSubtotal(line)"
                              dense
                            />
                            <span
                              v-if="line.quantity > 1"
                              class="booking-price-detail text-grey-7 q-ml-sm"
                            >
                              ({{
                                formatCopDisplay(
                                  effectiveServiceUnitPrice(line.service)
                                )
                              }}
                              × {{ line.quantity }})
                            </span>
                          </div>
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
                          class="booking-detail-btn"
                        >
                          <q-badge
                            v-if="serviceIsOnPromotion(line.service)"
                            floating
                            rounded
                            color="deep-orange-9"
                            class="booking-detail-btn__promo-badge"
                            :label="`-${promotionPercentDisplay(line.service)}%`"
                          />
                        </q-btn>
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
              <q-card-section class="q-pa-none" :class="maximized ? 'q-pt-sm' : 'q-pt-md'">
                <div
                  class="text-left"
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
                <div
                  v-if="bookStore.bookingsDuration > 0"
                  class="booking-duration-summary q-mt-sm"
                >
                  <q-icon name="schedule" size="18px" color="blue-grey-6" class="q-mr-xs" />
                  <span class="booking-duration-label">Tiempo aprox.:</span>
                  <span class="booking-duration-value">{{ formattedDuration }}</span>
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
        <q-separator :inset="!maximized" />
        <q-card-section
          class="booking-dialog__footer"
          :class="
            maximized
              ? 'row items-center q-px-sm'
              : 'flex justify-center items-center'
          "
          style="min-height: 120px"
        >
          <q-btn
            @click="sendBookingData"
            :disable="!bookStore.totalBookingQuantity || !date || !time"
            label="Reservar"
            color="blue"
            :class="{ 'full-width': maximized }"
          />
        </q-card-section>
      </q-card>
    </q-dialog>
    <q-dialog
      v-model="dateCard"
      :maximized="maximized"
      :transition-show="maximized ? 'slide-up' : 'scale'"
      :transition-hide="maximized ? 'slide-down' : 'scale'"
    >
      <q-card
        class="date-time-card"
        :class="{ 'date-time-card--maximized': maximized }"
      >
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
            <div class="date-picker-container relative-position">
              <q-inner-loading :showing="occupancyLoading" color="primary" />
              <q-date
                v-model="date"
                first-day-of-week="1"
                color="primary"
                class="date-picker"
                :default-year-month="defaultCalendarYearMonth"
                :options="bookingQDateOptions"
                :events="bookingQDateEvents"
                :event-color="bookingQDateEventColor"
                @navigation="onCalendarNavigation"
              />
            </div>
          </q-tab-panel>

          <q-tab-panel name="time" class="q-pa-lg">
            <p class="booking-schedule-hint text-body2 text-grey-8 q-mb-md">
              {{ scheduleHint }}
            </p>
            <div class="time-picker-container">
              <q-time
                v-model="time"
                mask="YYYY-MM-DD HH:mm"
                color="primary"
                class="time-picker"
                format24h
                now-btn
                :default-date="date || undefined"
                :options="bookingTimeOptions"
                :disable="!date"
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
import { useDialogMaximizedBelow } from 'src/composables/dialogs/useDialogMaximizedBelow';
import { useBookStore } from 'src/stores/book-store';
import type { BookingLine } from 'src/interfaces/booking';
import { computed, ref, watch, type CSSProperties } from 'vue';
import { useQuasar } from 'quasar';
import ServiceDialog from './serviceDialog.vue';
import Service from 'src/interfaces/service';
import { getService } from 'src/composables/services/useService';
import { formatCopDisplay } from 'src/helpers/price-display';
import {
  effectiveServiceUnitPrice,
  promotionPercentDisplay,
  serviceIsOnPromotion,
} from 'src/helpers/service-promotion';
import PriceDisplayPill from 'src/components/shared/PriceDisplayPill.vue';
import {
  buildWhatsAppUrl,
  generateBookingWhatsAppMessage,
} from 'src/helpers/whatsappBooking';
import {
  bookingSelectionToUtcIso,
  BUSINESS_SCHEDULE_COPY,
  createBookingTimeOptionsFn,
  isBookingDateTimeWithinHours,
  isQDateSelectable,
} from 'src/helpers/businessHours';
import {
  fetchReservationOccupancy,
  reservationsApi,
} from 'src/api/reservations-api';
import type { OccupancyByDateEntry } from 'src/helpers/booking-occupancy';
import {
  hasSlotForCart,
  occupancyEventColor,
  occupancyRatio,
  ymdRangeForCalendarMonth,
} from 'src/helpers/booking-occupancy';

const $q = useQuasar();
const bookStore = useBookStore();

const props = defineProps<{ dialog: boolean }>();
const emit = defineEmits<DialogEmits & FiltersEmits>();

const dateCard = ref(false);
const date = ref('' /* '2025/01/01' */);
const time = ref('');
const tab = ref('date');

const occupancyByDate = ref<Record<string, OccupancyByDateEntry>>({});
const occupancyLoading = ref(false);
const occupancyFetchFailed = ref(false);
const calendarYear = ref(new Date().getFullYear());
const calendarMonth = ref(new Date().getMonth() + 1);

const defaultCalendarYearMonth = computed(
  () =>
    `${calendarYear.value}/${String(calendarMonth.value).padStart(2, '0')}`,
);

async function loadOccupancyForMonth(year: number, month: number) {
  occupancyLoading.value = true;
  occupancyFetchFailed.value = false;
  try {
    const { from, to } = ymdRangeForCalendarMonth(year, month);
    const data = await fetchReservationOccupancy(from, to);
    occupancyByDate.value = { ...data.byDate };
  } catch {
    occupancyFetchFailed.value = true;
    occupancyByDate.value = {};
    $q.notify({
      type: 'warning',
      message: 'No se pudo cargar la ocupación del calendario.',
      position: 'top',
    });
  } finally {
    occupancyLoading.value = false;
  }
}

function onCalendarNavigation(ctx: { year: number; month: number }) {
  calendarYear.value = ctx.year;
  calendarMonth.value = ctx.month;
  void loadOccupancyForMonth(ctx.year, ctx.month);
}

function bookingQDateOptions(dateStr: string): boolean {
  if (!dateStr || !isQDateSelectable(dateStr)) return false;
  if (occupancyFetchFailed.value) return true;
  if (occupancyLoading.value) return true;
  const o = occupancyByDate.value[dateStr];
  if (!o) return true;
  return hasSlotForCart(
    o.usedMinutes,
    o.capacityMinutes,
    bookStore.bookingsDuration,
  );
}

function bookingQDateEvents(dateStr: string): boolean {
  if (!dateStr || !isQDateSelectable(dateStr)) return false;
  if (occupancyLoading.value || occupancyFetchFailed.value) return false;
  return dateStr in occupancyByDate.value;
}

function bookingQDateEventColor(dateStr: string): string {
  if (!dateStr || occupancyFetchFailed.value || occupancyLoading.value)
    return 'grey-5';
  const o = occupancyByDate.value[dateStr];
  if (!o || o.capacityMinutes <= 0) return 'grey-7';
  const r = occupancyRatio(o.usedMinutes, o.capacityMinutes);
  return occupancyEventColor(r);
}

watch(dateCard, (open) => {
  if (!open) return;
  const now = new Date();
  calendarYear.value = now.getFullYear();
  calendarMonth.value = now.getMonth() + 1;
  void loadOccupancyForMonth(calendarYear.value, calendarMonth.value);
});

watch(
  () => bookStore.bookingsDuration,
  () => {
    if (!date.value) return;
    if (bookingQDateOptions(date.value)) return;
    date.value = '';
    time.value = '';
  },
);

const scheduleHint = `${BUSINESS_SCHEDULE_COPY.weekdayLabel}: ${BUSINESS_SCHEDULE_COPY.weekdayRange}. ${BUSINESS_SCHEDULE_COPY.weekendLabel}: ${BUSINESS_SCHEDULE_COPY.weekendRange}.`;

const bookingTimeOptions = createBookingTimeOptionsFn(
  () => date.value,
  () => bookStore.bookingsDuration,
);

/** q-date `YYYY/MM/DD` → prefijo `YYYY-MM-DD` del modelo de QTime (máscara con fecha). */
function qDateToTimeModelDatePrefix(qDateStr: string): string {
  const m = /^(\d{4})\/(\d{2})\/(\d{2})$/.exec(qDateStr.trim());
  if (!m) return '';
  return `${m[1]}-${m[2]}-${m[3]}`;
}

/**
 * El botón "Ahora" de QTime rellena la fecha del modelo con el día actual; aquí
 * alineamos ese prefijo con la fecha elegida en el calendario (la hora sigue siendo "ahora").
 */
watch([time, date], () => {
  const d = date.value;
  const t = time.value;
  if (!d || !t) return;
  const expectedPrefix = qDateToTimeModelDatePrefix(d);
  if (!expectedPrefix) return;
  const match = /^(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2})$/.exec(t.trim());
  if (!match || match[1] === expectedPrefix) return;
  time.value = `${expectedPrefix} ${match[2]}`;
});

const principalImageUrl = (line: BookingLine) => {
  const img = line.service.images?.find((i) => i.isPrincipal);
  return img?.url ?? '';
};

const lineSubtotal = (line: BookingLine) =>
  effectiveServiceUnitPrice(line.service) * line.quantity;

const formattedDuration = computed(() => {
  const total = bookStore.bookingsDuration;
  if (total <= 0) return '';
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return hours === 1 ? '1 hora' : `${hours} horas`;
  return `${hours}h ${mins}min`;
});

const increaseBooking = (service: Service) => {
  bookStore.incrementBookingQuantity(service);
};

const decreaseBooking = (serviceId: string) => {
  bookStore.decrementBookingQuantity(serviceId);
};

const sendBookingData = async () => {
  if (!bookStore.totalBookingQuantity) {
    $q.notify({
      type: 'warning',
      message: 'No hay servicios reservados',
      position: 'top',
    });
    return;
  }

  if (!date.value || !time.value) {
    $q.notify({
      type: 'warning',
      message: 'Por favor selecciona una fecha y hora para la reserva',
      position: 'top',
    });
    return;
  }

  if (
    !isBookingDateTimeWithinHours(
      date.value,
      time.value,
      bookStore.bookingsDuration,
    )
  ) {
    $q.notify({
      type: 'warning',
      message:
        'La hora elegida no deja tiempo suficiente antes del cierre. Elige otra hora.',
      position: 'top',
    });
    return;
  }

  const scheduledAt = bookingSelectionToUtcIso(date.value, time.value);
  if (!scheduledAt) {
    $q.notify({
      type: 'negative',
      message: 'Fecha u hora no válida.',
      position: 'top',
    });
    return;
  }

  const totalDurationMinutes = bookStore.bookingsDuration;
  if (totalDurationMinutes < 1) {
    $q.notify({
      type: 'warning',
      message: 'La duración total de los servicios no es válida.',
      position: 'top',
    });
    return;
  }

  $q.loading.show({ message: 'Registrando reserva...' });
  try {
    await reservationsApi.post('/reservations', {
      scheduledAt,
      totalDurationMinutes,
    });
  } catch {
    $q.notify({
      type: 'negative',
      message: 'No se pudo registrar la reserva. Intenta de nuevo.',
      position: 'top',
    });
    return;
  } finally {
    $q.loading.hide();
  }

  const message = generateBookingWhatsAppMessage({
    bookings: bookStore.bookings,
    bookingsCost: bookStore.bookingsCost,
    bookingsDuration: bookStore.bookingsDuration,
    formattedDateTime: formattedDateTime.value,
  });
  openWhatsApp(message);
};

const manageVisualizationDialog = (val: boolean) => {
  dateCard.value = val;
};

const confirmDateTime = () => {
  if (!date.value || !time.value) return;
  if (
    !isBookingDateTimeWithinHours(
      date.value,
      time.value,
      bookStore.bookingsDuration,
    )
  ) {
    $q.notify({
      type: 'warning',
      message:
        'La hora seleccionada no deja tiempo suficiente antes del cierre.',
      position: 'top',
    });
    return;
  }
  dateCard.value = false;
};

watch(date, (newDate, oldDate) => {
  if (newDate !== oldDate) {
    tab.value = 'time';
    if (
      newDate &&
      time.value &&
      !isBookingDateTimeWithinHours(newDate, time.value, bookStore.bookingsDuration)
    ) {
      time.value = '';
    }
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

const openWhatsApp = (message: string) => {
  const phoneNumber = '573208977471';
  const whatsappUrl = buildWhatsAppUrl(phoneNumber, message);
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
const { maximized } = useDialogMaximizedBelow();

const bookingListScrollStyle = computed((): CSSProperties => {
  const base: CSSProperties = {
    backgroundColor: '#f2f2f2',
    borderRadius: '8px',
  };
  if (maximized.value) {
    return {
      ...base,
      height: 'auto',
      flex: '1 1 auto',
      minHeight: '140px',
    };
  }
  return {
    ...base,
    height: '400px',
  };
});
</script>

<style lang="scss" scoped>
.booking-dialog-card {
  width: 500px;
}

.booking-dialog-card--maximized {
  width: 100%;
  max-width: 100%;
  min-height: 100%;
  border-radius: 0;
  box-shadow: none;
  display: flex;
  flex-direction: column;

  .booking-dialog__body--maximized {
    flex: 1 1 auto;
    min-height: 0;
    overflow: hidden !important;
    display: flex;
    flex-direction: column;
  }

  .booking-dialog__inner {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .booking-dialog__main-col--maximized {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .booking-dialog__list-scroll--maximized {
    max-height: none !important;
  }

  .booking-dialog__footer {
    flex-shrink: 0;
  }
}

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
  flex: 1 1 auto;
  min-width: 0;
  text-align: center;
}

.title-text--maximized {
  text-align: left;
  padding-left: 12px;
  padding-right: 36px;
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

.date-time-card--maximized {
  width: 100%;
  max-width: 100%;
  min-width: 0 !important;
  min-height: 100%;
  border-radius: 0;
  box-shadow: none;
  display: flex;
  flex-direction: column;

  .date-time-header {
    border-radius: 0;
    flex-shrink: 0;
  }

  .date-time-panels {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }

  .date-time-footer {
    border-radius: 0;
    flex-shrink: 0;
  }
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

.booking-price-original :deep(.cop-price-pill) {
  text-decoration: line-through;
  opacity: 0.85;
}

.booking-detail-btn {
  position: relative;
}

.booking-detail-btn__promo-badge {
  font-size: 10px;
  font-weight: bold;
  min-width: 2rem;
  padding: 3px 6px;
}

.booking-price-detail {
  font-size: 13px;
}

.booking-duration-summary {
  display: flex;
  align-items: center;
  font-size: 15px;
  color: #546e7a;
  font-family: Georgia, 'Times New Roman', Times, serif;
}

.booking-duration-label {
  font-weight: 600;
  margin-right: 4px;
}

.booking-duration-value {
  font-weight: bold;
  color: #37474f;
}
</style>
