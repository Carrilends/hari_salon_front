<template>
  <section class="package-card">
    <h3 class="package-card__titulo">Paquete para {{ eventoLabel }}</h3>
    <p v-if="propuesta.fecha" class="package-card__fecha">
      {{ propuesta.fecha }}
    </p>

    <ul class="package-card__lineas">
      <li
        v-for="l in propuesta.lineas"
        :key="l.serviceId"
        class="package-card__linea"
      >
        <span class="package-card__nombre">{{ l.nombre }}</span>
        <span class="package-card__precio">${{ formatCopDisplay(l.precio) }}</span>
      </li>
    </ul>

    <p class="package-card__total">
      <span>Total</span>
      <span>${{ formatCopDisplay(propuesta.total) }}</span>
    </p>
    <p class="package-card__duracion">
      <span>Duración estimada</span>
      <span>{{ formatDurationMinutes(propuesta.minutos) }}</span>
    </p>

    <p v-if="propuesta.omitidas.length" class="package-card__omitidas">
      No incluido: {{ omitidasLabel }}
    </p>

    <p v-if="!propuesta.completa" class="package-card__incompleto">
      Faltó alguna parte principal; podemos ajustar el presupuesto o la fecha.
    </p>

    <button
      v-if="propuesta.lineas.length > 0"
      type="button"
      class="package-card__anadir"
      data-test="anadir-paquete"
      :disabled="ocupado"
      @click="anadir()"
    >
      Añadir los {{ propuesta.lineas.length }}
    </button>
    <p v-if="hecho" class="package-card__nota" role="status">
      Añadido a tu reserva. Recuerda: elige el día al confirmar.
    </p>
    <p v-if="motivoFallo" class="package-card__fallo" role="status">
      {{ motivoFallo }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { PackageProposal } from 'src/api/assistant-api';
import { useAddToBag } from 'src/composables/booking/useAddToBag';
import { formatCopDisplay } from 'src/helpers/price-display';
import { formatDurationMinutes } from 'src/helpers/duration';

defineOptions({ name: 'PackageProposalCard' });

const props = defineProps<{ propuesta: PackageProposal }>();
const { añadirVarios } = useAddToBag();

const ocupado = ref(false);
const hecho = ref(false);
const motivoFallo = ref<string | null>(null);

/**
 * «Añadir los N» mete en la bolsa los servicios de la propuesta. La fecha que
 * propuso el asistente NO viaja: la bolsa no guarda fechas y el flujo del portal
 * la pide. No se pierde tanto como parece — cuando el asistente dice «cabe el
 * sábado» está consultando, no apartando, así que el flujo tiene que volver a
 * comprobarlo de todos modos. La nota de abajo lo dice en voz alta.
 */
async function anadir() {
  if (ocupado.value) return;
  ocupado.value = true;
  motivoFallo.value = null;

  const resultado = await añadirVarios(
    props.propuesta.lineas.map((l) => l.serviceId)
  );
  ocupado.value = false;

  if (resultado.ok) hecho.value = true;
  else motivoFallo.value = resultado.motivo;
}

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
</script>

<style scoped lang="scss">
.package-card {
  align-self: stretch;
  // Igual que la lista de servicios: el hilo es un flex en columna con scroll y
  // sin esto la tarjeta se aplasta cuando la conversación desborda.
  flex: 0 0 auto;
  background: var(--m-nieve);
  border: var(--m-filete-grosor) solid var(--m-filete);
  border-radius: var(--m-radio-tarjeta);
  padding: 12px 14px;
  font-family: var(--m-font-sans);
}

.package-card__titulo {
  margin: 0;
  font-family: var(--m-font-display);
  font-size: 15.5px;
  font-weight: 400;
  line-height: 1.25;
  color: var(--m-tinta);
}

.package-card__fecha {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--m-piedra);
}

.package-card__lineas {
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.package-card__linea {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  font-size: 13px;
  color: var(--m-tinta);
}

.package-card__nombre {
  min-width: 0;
  overflow-wrap: anywhere;
}

/// El dorado claro no es color de texto sobre nieve (2,8:1): aquí va el profundo.
.package-card__precio {
  flex: 0 0 auto;
  color: var(--m-oro-profundo);
  white-space: nowrap;
}

.package-card__total {
  display: flex;
  justify-content: space-between;
  margin: 10px 0 0;
  padding-top: 8px;
  border-top: var(--m-filete-grosor) solid var(--m-filete);
  font-size: 13.5px;
  font-weight: 500;
  color: var(--m-tinta);
}

.package-card__duracion {
  display: flex;
  justify-content: space-between;
  margin: 3px 0 0;
  font-size: 12px;
  color: var(--m-piedra);
}

.package-card__omitidas,
.package-card__incompleto {
  margin: 8px 0 0;
  font-size: 11.5px;
  color: var(--m-piedra);
}

.package-card__incompleto {
  color: var(--m-rosa-profundo);
}

.package-card__anadir {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: var(--m-tactil-min);
  margin-top: 12px;
  padding: 0 18px;
  border: 0;
  border-radius: var(--m-radio-pildora);
  background: var(--m-tinta);
  color: var(--m-hueso);
  font-family: var(--m-font-sans);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: var(--m-tracking-nav);
  cursor: pointer;
}

.package-card__anadir:disabled {
  opacity: 0.55;
  cursor: default;
}

.package-card__anadir:focus-visible {
  outline: 2px solid var(--m-oro);
  outline-offset: 2px;
}

.package-card__nota {
  margin: 8px 0 0;
  font-size: 11.5px;
  color: var(--m-oro-profundo);
}

.package-card__fallo {
  margin: 8px 0 0;
  font-size: 11.5px;
  color: var(--m-rosa-profundo);
}
</style>
