<template>
  <div class="ausencias" data-test="lista-ausencias">
    <ul v-if="filas.length" class="ausencias__lista">
      <li
        v-for="fila in filas"
        :key="fila.id"
        class="ausencias__fila"
        data-test="ausencia"
      >
        <span class="ausencias__texto">
          <span class="ausencias__fecha" data-test="fecha-ausencia">{{
            fila.fecha
          }}</span>
          <span class="ausencias__franja" data-test="franja-ausencia">{{
            fila.franja
          }}</span>
        </span>
        <button
          type="button"
          class="ausencias__quitar"
          data-test="quitar-ausencia"
          :aria-label="`Quitar la ausencia del ${fila.fecha.toLowerCase()}`"
          :disabled="quitando !== null"
          @click="quitarAusencia(fila.id)"
        >
          {{ quitando === fila.id ? 'Quitando…' : 'Quitar' }}
        </button>
      </li>
    </ul>
    <p v-else-if="!cargando" class="ausencias__nada" data-test="sin-ausencias">
      No tiene ausencias próximas.
    </p>
    <p
      v-if="filas.length"
      class="ausencias__nota"
      data-test="advertencia-quitar"
    >
      Quitar una ausencia vuelve a abrir esas horas, pero las citas movidas o
      canceladas no vuelven.
    </p>
    <p
      v-if="error"
      class="ausencias__error"
      role="alert"
      data-test="error-ausencias"
    >
      {{ error }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useAusencias } from 'src/composables/workers/useAusencias';
import {
  fechaDeAusencia,
  franjaDeAusencia,
  mensajeDeAusencia,
} from 'src/helpers/ausencias';

/**
 * Las ausencias en curso o próximas de una estilista, con «Quitar». La API ya
 * trae solo las que no han terminado; aquí se filtran por estilista y se
 * ordenan por fecha. Quitar no devuelve las citas que la ausencia movió o
 * canceló: se dice siempre, junto a la lista.
 */
const props = defineProps<{ workerId: string; workerName: string }>();

const { ausencias, cargando, quitar } = useAusencias(ref(true));

const quitando = ref<string | null>(null);
const error = ref<string | null>(null);

const filas = computed(() =>
  (ausencias.value ?? [])
    .filter((a) => a.workerId === props.workerId)
    .slice()
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .map((a) => ({
      id: a.id,
      fecha: fechaDeAusencia(a.startsAt),
      franja: franjaDeAusencia(a.startsAt, a.endsAt),
    }))
);

async function quitarAusencia(id: string) {
  if (quitando.value) return;
  quitando.value = id;
  error.value = null;
  try {
    await quitar(id);
  } catch (err) {
    error.value = mensajeDeAusencia(err, props.workerName, 'quitar');
  } finally {
    quitando.value = null;
  }
}

defineOptions({ name: 'ListaAusencias' });
</script>

<style lang="scss" scoped>
.ausencias__lista {
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
}

.ausencias__fila {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 0;
  border-bottom: var(--m-filete-grosor) solid var(--m-filete-oscuro);
}

.ausencias__texto {
  display: flex;
  flex-direction: column;
  min-width: 0;
  font-size: 0.84rem;
}

.ausencias__franja {
  color: var(--m-piedra-clara);
  font-size: 0.78rem;
}

.ausencias__quitar {
  flex-shrink: 0;
  min-height: var(--m-tactil-min);
  padding: 0 14px;
  border: var(--m-filete-grosor) solid var(--m-filete-oscuro);
  border-radius: var(--m-radio-pildora);
  background: transparent;
  color: var(--m-hueso);
  font-family: var(--m-font-sans);
  font-size: 0.68rem;
  letter-spacing: var(--m-tracking-nav);
  text-transform: uppercase;
  cursor: pointer;
}

.ausencias__quitar:disabled {
  opacity: 0.6;
  cursor: progress;
}

.ausencias__quitar:focus-visible {
  outline: 2px solid var(--m-hueso);
  outline-offset: 2px;
}

.ausencias__nada,
.ausencias__nota {
  margin: 8px 0 0;
  color: var(--m-piedra-clara);
  font-size: 0.78rem;
  line-height: 1.45;
}

.ausencias__error {
  margin: 8px 0 0;
  color: var(--m-hueso);
  font-size: 0.8rem;
}

@media (hover: hover) and (pointer: fine) {
  .ausencias__quitar:hover:not(:disabled) {
    border-color: var(--m-oro);
  }
}
</style>
