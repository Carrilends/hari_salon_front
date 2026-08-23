<template>
  <q-card flat bordered>
    <q-card-section class="row items-center q-col-gutter-md">
      <div class="col-12 col-sm">
        <div class="text-subtitle1 text-weight-medium">
          {{ formatSalonDateTime(reservation.scheduledAt) }}
        </div>
        <div class="text-caption text-grey-7">
          {{ reservation.worker?.name || 'Sin estilista' }} ·
          {{ reservation.totalDurationMinutes }} min
        </div>
        <div class="q-mt-xs text-grey-8">
          <q-icon name="content_cut" size="16px" class="q-mr-xs" />
          <span>{{ serviceNames }}</span>
        </div>
      </div>

      <div class="col-12 col-sm-auto row items-center justify-end q-gutter-sm">
        <q-badge :color="statusMeta.color" :label="statusMeta.label" />
        <q-btn
          v-if="cancelable"
          color="negative"
          icon="close"
          label="Cancelar"
          dense
          no-caps
          outline
          :loading="canceling"
          @click="emit('cancel', reservation)"
        />
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { reservationStatusMeta } from 'src/helpers/reservation-status';
import type { ReservationDto } from 'src/interfaces/booking';

defineOptions({ name: 'ReservationCard' });

const props = defineProps<{
  reservation: ReservationDto;
  cancelable: boolean;
  canceling: boolean;
}>();

const emit = defineEmits<{
  (e: 'cancel', reservation: ReservationDto): void;
}>();

const statusMeta = computed(() =>
  reservationStatusMeta(props.reservation.status)
);

const serviceNames = computed(() => {
  const names = (props.reservation.services ?? []).map((s) => s.name);
  return names.length ? names.join(', ') : 'Sin servicios';
});

function formatSalonDateTime(iso: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Bogota',
  }).format(new Date(iso));
}
</script>
