<template>
  <q-dialog v-model="open" persistent>
    <q-card style="min-width: 320px; max-width: 420px">
      <q-card-section>
        <div class="text-h6">Cambiar fecha</div>
        <div class="text-caption text-grey-7">
          {{ serviceNames }} · {{ reservation?.totalDurationMinutes ?? 0 }} min
        </div>
      </q-card-section>

      <q-card-section class="q-gutter-md">
        <q-date
          v-model="date"
          minimal
          :options="isSelectable"
          mask="YYYY/MM/DD"
        />
        <q-time v-model="time" :options="timeOptions" format24h mask="HH:mm" />
        <q-banner v-if="errorMsg" dense class="bg-orange-1 text-orange-9">
          {{ errorMsg }}
        </q-banner>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Volver" no-caps @click="open = false" />
        <q-btn
          color="primary"
          label="Mover la cita"
          no-caps
          :disable="!date || !time"
          :loading="loading"
          @click="confirm"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  bookingSelectionToUtcIso,
  createBookingTimeOptionsFn,
  getSalonNowParts,
  isBookingDateTimeWithinHours,
  isQDateSelectable,
} from 'src/helpers/businessHours';
import type { ReservationDto } from 'src/interfaces/booking';

defineOptions({ name: 'RescheduleDialog' });

const props = defineProps<{
  modelValue: boolean;
  reservation: ReservationDto | null;
  loading: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'confirm', scheduledAt: string): void;
}>();

const open = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v),
});

const date = ref<string | null>(null);
const time = ref<string>('');
const errorMsg = ref('');

// La duración manda: una cita de 90 minutos no cabe en el mismo hueco que una de
// 30, así que las horas ofrecidas dependen de ella. La autoridad sigue siendo el
// backend; esto solo evita ofrecer una hora que sabemos que va a fallar.
const durationMinutes = computed(
  () => props.reservation?.totalDurationMinutes ?? 0
);

const salonNow = computed(() => getSalonNowParts());

const serviceNames = computed(() => {
  const names = (props.reservation?.services ?? []).map((s) => s.name);
  return names.length ? names.join(', ') : 'Sin servicios';
});

function isSelectable(dateStr: string): boolean {
  return isQDateSelectable(dateStr, salonNow.value.qDate);
}

// `createBookingTimeOptionsFn` toma getters, no valores: así la función que
// recibe q-time sigue viendo la fecha y la duración actuales sin recrearse.
const timeOptions = createBookingTimeOptionsFn(
  () => date.value ?? '',
  () => durationMinutes.value,
  () => salonNow.value
);

// Al abrir se parte de la fecha actual de la cita: mover suele ser un ajuste
// pequeño, no empezar de cero.
watch(
  () => props.modelValue,
  (abierto) => {
    if (!abierto || !props.reservation) return;
    errorMsg.value = '';
    const actual = new Date(props.reservation.scheduledAt);
    const partes = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(actual);
    const get = (t: string) => partes.find((p) => p.type === t)?.value ?? '';
    date.value = `${get('year')}/${get('month')}/${get('day')}`;
    time.value = `${get('hour')}:${get('minute')}`;
  }
);

watch([date, time], () => {
  errorMsg.value = '';
});

function confirm() {
  if (!date.value || !time.value) return;
  if (
    !isBookingDateTimeWithinHours(
      date.value,
      time.value,
      durationMinutes.value,
      salonNow.value
    )
  ) {
    errorMsg.value =
      'Esa hora no deja tiempo suficiente antes del cierre. Elige otra.';
    return;
  }
  const iso = bookingSelectionToUtcIso(date.value, time.value);
  if (!iso) {
    errorMsg.value = 'No se pudo interpretar esa fecha y hora.';
    return;
  }
  emit('confirm', iso);
}
</script>
