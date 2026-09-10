<template>
  <q-page class="q-pa-md my-reservations">
    <div class="row items-center q-mb-md q-gutter-sm">
      <div class="text-h5">Mis reservas</div>
      <q-space />
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
      No se pudieron cargar tus reservas. Reintenta en unos segundos.
      <template #action>
        <q-btn flat label="Reintentar" @click="() => query.refetch()" />
      </template>
    </q-banner>

    <!-- Vacío -->
    <div
      v-else-if="all.length === 0"
      class="flex flex-center column q-pa-xl text-grey-6"
    >
      <q-icon name="event_available" size="42px" class="q-mb-sm" />
      <div class="q-mb-md">Todavía no tienes reservas.</div>
      <q-btn
        color="primary"
        icon="event"
        label="Reservar una cita"
        no-caps
        @click="() => router.push('/services')"
      />
    </div>

    <!-- Listas -->
    <template v-else>
      <section v-if="upcoming.length" class="q-mb-lg">
        <div class="text-subtitle2 text-grey-7 q-mb-sm">Próximas</div>
        <div class="q-gutter-md">
          <ReservationCard
            v-for="res in upcoming"
            :key="res.id"
            :reservation="res"
            :cancelable="isCancelable(res, now)"
            :canceling="cancel.isPending.value && pendingId === res.id"
            :reschedulable="isReschedulable(res, now)"
            :rescheduling="reschedule.isPending.value && pendingId === res.id"
            @cancel="onCancel"
            @reschedule="onReschedule"
          />
        </div>
      </section>

      <section v-if="past.length">
        <div class="text-subtitle2 text-grey-7 q-mb-sm">Pasadas</div>
        <div class="q-gutter-md">
          <ReservationCard
            v-for="res in past"
            :key="res.id"
            :reservation="res"
            :cancelable="false"
            :canceling="false"
            :reschedulable="false"
            :rescheduling="false"
            @cancel="onCancel"
            @reschedule="onReschedule"
          />
        </div>
      </section>
    </template>

    <RescheduleDialog
      v-model="rescheduleOpen"
      :reservation="toReschedule"
      :loading="reschedule.isPending.value"
      @confirm="onRescheduleConfirm"
    />
  </q-page>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useMyReservations } from 'src/composables/reservations/useMyReservations';
import {
  isCancelable,
  isReschedulable,
  splitReservationsByTime,
} from 'src/helpers/my-reservations';
import ReservationCard from 'src/components/reservations/ReservationCard.vue';
import RescheduleDialog from 'src/components/reservations/RescheduleDialog.vue';
import type { ReservationDto } from 'src/interfaces/booking';

defineOptions({ name: 'MyReservationsPage' });

const router = useRouter();
const $q = useQuasar();
const { query, cancel, reschedule } = useMyReservations();

// Instante de referencia para separar próximas/pasadas y decidir la cortesía del
// botón «Cancelar». La regla real la aplica el backend. Se re-evalúa cada vez que
// llegan datos nuevos (al refrescar), para que una reserva cuya hora ya pasó salga
// de «Próximas» sin tener que recargar la página.
const now = ref(new Date());
watch(query.data, () => {
  now.value = new Date();
});

// El botón que se muestra "cargando" es el de la reserva en curso.
const pendingId = ref<string | null>(null);

// Estado del diálogo de «Cambiar fecha».
const rescheduleOpen = ref(false);
const toReschedule = ref<ReservationDto | null>(null);

const all = computed<ReservationDto[]>(() => query.data.value ?? []);
const split = computed(() => splitReservationsByTime(all.value, now.value));
const upcoming = computed(() => split.value.upcoming);
const past = computed(() => split.value.past);

function onCancel(res: ReservationDto) {
  $q.dialog({
    title: 'Cancelar reserva',
    message: '¿Seguro que quieres cancelar esta reserva?',
    cancel: { label: 'Volver', flat: true },
    ok: { label: 'Cancelar reserva', color: 'negative' },
    persistent: true,
  }).onOk(async () => {
    pendingId.value = res.id;
    try {
      await cancel.mutateAsync(res.id);
      $q.notify({ type: 'positive', message: 'Reserva cancelada.' });
    } catch {
      $q.notify({
        type: 'negative',
        message: 'No se pudo cancelar. Puede que ya haya pasado la hora.',
      });
    } finally {
      pendingId.value = null;
    }
  });
}

function onReschedule(res: ReservationDto) {
  toReschedule.value = res;
  rescheduleOpen.value = true;
}

async function onRescheduleConfirm(scheduledAt: string) {
  const res = toReschedule.value;
  if (!res) return;
  pendingId.value = res.id;
  try {
    await reschedule.mutateAsync({ id: res.id, scheduledAt });
    rescheduleOpen.value = false;
    $q.notify({ type: 'positive', message: 'Tu cita quedó movida.' });
  } catch (error) {
    // El backend es la autoridad: puede rechazar por solape con el estilista,
    // por horario o por plazo. Se distingue el solape porque es el caso que la
    // clienta puede resolver sola eligiendo otra hora.
    const status = (error as { response?: { status?: number } })?.response
      ?.status;
    $q.notify({
      type: 'negative',
      message:
        status === 409
          ? 'Esa hora ya está ocupada. Elige otra.'
          : 'No se pudo cambiar la fecha. Revisa el horario e intenta de nuevo.',
    });
  } finally {
    pendingId.value = null;
  }
}
</script>
