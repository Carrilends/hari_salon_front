<template>
  <q-page class="q-pa-md admin-reservations">
    <div class="row items-center q-mb-md q-gutter-sm">
      <div class="text-h5">Reservas</div>
      <q-space />
      <q-select
        v-model="statusFilter"
        :options="filterOptions"
        emit-value
        map-options
        dense
        outlined
        options-dense
        style="min-width: 180px"
        label="Estado"
      />
      <q-btn
        flat
        round
        dense
        icon="refresh"
        :loading="query.isFetching.value"
        @click="() => query.refetch()"
      >
        <q-tooltip>Actualizar</q-tooltip>
      </q-btn>
    </div>

    <!-- Carga -->
    <div v-if="query.isLoading.value" class="flex flex-center q-pa-xl">
      <q-spinner color="primary" size="42px" />
    </div>

    <!-- Error -->
    <q-banner v-else-if="query.isError.value" class="bg-red-1 text-red-9">
      No se pudieron cargar las reservas. Reintenta en unos segundos.
      <template #action>
        <q-btn flat label="Reintentar" @click="() => query.refetch()" />
      </template>
    </q-banner>

    <!-- Vacío -->
    <div
      v-else-if="filtered.length === 0"
      class="flex flex-center column q-pa-xl text-grey-6"
    >
      <q-icon name="event_busy" size="42px" class="q-mb-sm" />
      <div>No hay reservas {{ emptyLabel }}.</div>
    </div>

    <!-- Lista -->
    <div v-else class="q-gutter-md">
      <q-card v-for="res in filtered" :key="res.id" flat bordered>
        <q-card-section class="row items-center q-col-gutter-md">
          <div class="col-12 col-sm">
            <div class="text-subtitle1 text-weight-medium">
              {{ formatSalonDateTime(res.scheduledAt) }}
            </div>
            <div class="text-caption text-grey-7">
              {{ res.worker?.name || 'Sin estilista' }} ·
              {{ res.totalDurationMinutes }} min
            </div>
            <div class="q-mt-xs">
              <q-icon name="person" size="16px" class="q-mr-xs" />
              <span>{{ res.contact?.name || 'Cliente registrado' }}</span>
              <span v-if="res.contact?.phone" class="text-grey-7">
                · {{ res.contact.phone }}</span
              >
            </div>
            <div class="q-mt-xs text-grey-8">
              <q-icon name="content_cut" size="16px" class="q-mr-xs" />
              <span>{{ serviceNames(res) }}</span>
            </div>
          </div>

          <div
            class="col-12 col-sm-auto row items-center justify-end q-gutter-sm"
          >
            <q-badge
              :color="statusMeta(res).color"
              :label="statusMeta(res).label"
            />
            <q-btn
              v-if="res.status === 'pendiente'"
              color="positive"
              icon="check"
              label="Confirmar"
              dense
              no-caps
              :loading="confirm.isPending.value && pendingId === res.id"
              @click="onConfirm(res)"
            />
            <q-btn
              v-if="res.status === 'pendiente' || res.status === 'confirmada'"
              color="negative"
              icon="close"
              label="Cancelar"
              dense
              no-caps
              outline
              :loading="cancel.isPending.value && pendingId === res.id"
              @click="onCancel(res)"
            />
          </div>
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useQuasar } from 'quasar';
import { useAdminReservations } from 'src/composables/reservations/useAdminReservations';
import { reservationStatusMeta } from 'src/helpers/reservation-status';
import type { ReservationDto } from 'src/interfaces/booking';

defineOptions({ name: 'AdminReservationsPage' });

const $q = useQuasar();
const { query, confirm, cancel } = useAdminReservations();

// El botón que se muestra "cargando" es el de la fila en curso.
const pendingId = ref<string | null>(null);

type Filter = ReservationDto['status'] | 'todas';
const statusFilter = ref<Filter>('pendiente');
const filterOptions = [
  { label: 'Pendientes', value: 'pendiente' },
  { label: 'Confirmadas', value: 'confirmada' },
  { label: 'Cumplidas', value: 'cumplida' },
  { label: 'Canceladas', value: 'cancelada' },
  { label: 'Todas', value: 'todas' },
];

const filtered = computed<ReservationDto[]>(() => {
  const list = query.data.value ?? [];
  if (statusFilter.value === 'todas') return list;
  return list.filter((r) => r.status === statusFilter.value);
});

const emptyLabel = computed(() =>
  statusFilter.value === 'todas'
    ? 'para mostrar'
    : `en estado «${statusFilter.value}»`
);

function statusMeta(res: ReservationDto) {
  return reservationStatusMeta(res.status);
}

function serviceNames(res: ReservationDto): string {
  const names = (res.services ?? []).map((s) => s.name);
  return names.length ? names.join(', ') : 'Sin servicios';
}

function formatSalonDateTime(iso: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Bogota',
  }).format(new Date(iso));
}

async function onConfirm(res: ReservationDto) {
  pendingId.value = res.id;
  try {
    await confirm.mutateAsync(res.id);
    $q.notify({ type: 'positive', message: 'Reserva confirmada.' });
  } catch {
    $q.notify({ type: 'negative', message: 'No se pudo confirmar.' });
  } finally {
    pendingId.value = null;
  }
}

function onCancel(res: ReservationDto) {
  $q.dialog({
    title: 'Cancelar reserva',
    message: `¿Seguro que quieres cancelar la reserva de ${
      res.contact?.name || 'este cliente'
    }?`,
    cancel: { label: 'Volver', flat: true },
    ok: { label: 'Cancelar reserva', color: 'negative' },
    persistent: true,
  }).onOk(async () => {
    pendingId.value = res.id;
    try {
      await cancel.mutateAsync(res.id);
      $q.notify({ type: 'positive', message: 'Reserva cancelada.' });
    } catch {
      $q.notify({ type: 'negative', message: 'No se pudo cancelar.' });
    } finally {
      pendingId.value = null;
    }
  });
}
</script>
