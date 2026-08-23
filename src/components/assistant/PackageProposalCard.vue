<template>
  <q-card flat bordered class="package-proposal">
    <q-card-section class="q-pb-xs">
      <div class="text-subtitle2 text-weight-bold">
        Paquete para {{ eventoLabel }}
      </div>
      <div v-if="propuesta.fecha" class="text-caption text-grey-7">
        {{ propuesta.fecha }}
      </div>
    </q-card-section>

    <q-list dense>
      <q-item v-for="l in propuesta.lineas" :key="l.serviceId" class="q-px-md">
        <q-item-section>{{ l.nombre }}</q-item-section>
        <q-item-section side>{{ formatCop(l.precio) }}</q-item-section>
      </q-item>
    </q-list>

    <q-card-section class="q-pt-sm q-pb-xs">
      <div class="row items-center justify-between text-weight-medium">
        <span>Total</span>
        <span>{{ formatCop(propuesta.total) }}</span>
      </div>
      <div class="row items-center justify-between text-caption text-grey-7">
        <span>Duración estimada</span>
        <span>{{ formatDuration(propuesta.minutos) }}</span>
      </div>
    </q-card-section>

    <q-card-section v-if="propuesta.omitidas.length" class="q-pt-none">
      <div class="text-caption text-grey-6">
        No incluido: {{ omitidasLabel }}
      </div>
    </q-card-section>

    <q-card-section v-if="!propuesta.completa" class="q-pt-none">
      <div class="text-caption text-orange-9">
        Faltó alguna parte principal; podemos ajustar el presupuesto o la fecha.
      </div>
    </q-card-section>

    <q-card-actions v-if="propuesta.lineas.length > 0" align="right">
      <q-btn
        color="pink-5"
        icon="event_available"
        label="Reservar este paquete"
        no-caps
        dense
        @click="emit('confirm', propuesta)"
      />
    </q-card-actions>
  </q-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { PackageProposal } from 'src/api/assistant-api';

defineOptions({ name: 'PackageProposalCard' });

const props = defineProps<{ propuesta: PackageProposal }>();
const emit = defineEmits<{
  (e: 'confirm', propuesta: PackageProposal): void;
}>();

const EVENT_LABELS: Record<string, string> = {
  boda: 'una boda',
  quinceanera: 'unos quince',
  grado: 'un grado',
};

const eventoLabel = computed(
  () => EVENT_LABELS[props.propuesta.evento] ?? props.propuesta.evento
);

const omitidasLabel = computed(() =>
  props.propuesta.omitidas.map((o) => o.categoria).join(', ')
);

function formatCop(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}

// Duración con honestidad: se muestra ANTES de confirmar (un paquete de boda
// puede pasar de tres horas).
function formatDuration(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h && m) return `${h} h ${m} min`;
  if (h) return `${h} h`;
  return `${m} min`;
}
</script>

<style scoped lang="scss">
.package-proposal {
  align-self: flex-start;
  max-width: 90%;
  border-radius: 12px;
}
</style>
