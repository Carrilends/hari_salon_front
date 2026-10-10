<template>
  <div class="tarjetas-semana" data-test="tarjetas-semana">
    <button
      v-for="fila in filas"
      :key="fila.id"
      type="button"
      class="tarjetas-semana__tarjeta m-tarjeta-pulsable"
      :class="{ 'tarjetas-semana__tarjeta--elegida': fila.id === seleccionada }"
      data-test="tarjeta-estilista"
      :aria-label="`Editar a ${fila.name} · ${formatearDuracion(
        fila.resumen.usados
      )} en la semana`"
      @click="emit('elegir', fila.id)"
    >
      <span class="tarjetas-semana__cabeza">
        <span class="tarjetas-semana__inicial" aria-hidden="true">{{
          inicialDe(fila.name)
        }}</span>
        <span class="tarjetas-semana__nombre">{{ fila.name }}</span>
        <span class="tarjetas-semana__total" data-test="total-tarjeta"
          ><span class="tarjetas-semana__cifra">{{
            formatearDuracion(fila.resumen.usados)
          }}</span>
          en la semana</span
        >
      </span>
      <span class="tarjetas-semana__dias">
        <span
          v-for="(dia, i) in fila.days"
          :key="dia.date"
          class="tarjetas-semana__dia"
          data-test="mini-dia"
        >
          <BarraCarga
            :usados="dia.usedMinutes"
            :capacidad="dia.capacityMinutes"
            variante="mini"
            sobre-carbon
          />
          <span
            class="tarjetas-semana__letra"
            :class="{ 'tarjetas-semana__letra--hoy': cabeceras[i]?.esHoy }"
            :data-test="cabeceras[i]?.esHoy ? 'letra-hoy' : 'letra-dia'"
            >{{ cabeceras[i]?.inicial }}{{ cabeceras[i]?.numero }}</span
          >
        </span>
      </span>
    </button>

    <div
      v-if="porDefecto"
      class="tarjetas-semana__defecto"
      data-test="tarjeta-sin-preferencia"
    >
      <span
        class="tarjetas-semana__inicial tarjetas-semana__inicial--defecto"
        aria-hidden="true"
      >
        <StrokeIcon nombre="sin-preferencia" />
      </span>
      <span class="tarjetas-semana__texto-defecto">
        <span class="tarjetas-semana__nombre-defecto">{{
          porDefecto.name
        }}</span>
        · predeterminada
        <span
          v-if="porDefecto.resumen.usados > 0"
          class="tarjetas-semana__aviso-defecto"
          data-test="carga-sin-preferencia"
          >{{ formatearDuracion(porDefecto.resumen.usados) }} de citas a su
          nombre esta semana: revísalas en Reservas.</span
        >
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import BarraCarga from './BarraCarga.vue';
import StrokeIcon from 'src/components/shared/StrokeIcon.vue';
import type { WorkersWeekResponse } from 'src/api/workers-api';
import {
  cabecerasDeDias,
  formatearDuracion,
  inicialDe,
  resumenDeSemana,
} from 'src/helpers/semana-estilistas';

/**
 * La semana en tarjetas (móvil, < 900 px): cada estilista es un botón entero
 * con su total y siete mini-barras. Las mini-barras se esconden del lector de
 * pantalla: la tarjeta se nombra con su total («Editar a Alejandro · 22 h en
 * la semana») y el detalle día a día está en el panel.
 */
const props = defineProps<{
  semana: WorkersWeekResponse;
  hoy: string;
  seleccionada: string | null;
}>();

const emit = defineEmits<{ (e: 'elegir', id: string): void }>();

const cabeceras = computed(() => cabecerasDeDias(props.semana.days, props.hoy));
const conResumen = computed(() =>
  props.semana.workers.map((w) => ({ ...w, resumen: resumenDeSemana(w.days) }))
);
const filas = computed(() => conResumen.value.filter((w) => !w.isDefault));
const porDefecto = computed(
  () => conResumen.value.find((w) => w.isDefault) ?? null
);

defineOptions({ name: 'TarjetasSemana' });
</script>

<style lang="scss" scoped>
.tarjetas-semana {
  display: flex;
  flex-direction: column;
  gap: var(--m-rejilla-gap-movil);
}

.tarjetas-semana__tarjeta {
  display: block;
  box-sizing: border-box;
  width: 100%;
  padding: 14px;
  border: var(--m-filete-grosor) solid var(--m-filete-oscuro);
  border-radius: var(--m-radio-tarjeta);
  background: var(--m-carbon);
  color: var(--m-hueso);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.tarjetas-semana__tarjeta--elegida {
  border-color: var(--m-oro);
}

.tarjetas-semana__tarjeta:focus-visible {
  outline: 2px solid var(--m-hueso);
  outline-offset: 2px;
}

.tarjetas-semana__cabeza {
  display: flex;
  align-items: center;
  gap: 12px;
}

.tarjetas-semana__inicial {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: var(--m-filete-grosor) solid var(--m-oro);
  border-radius: 50%;
  background: var(--m-tinta);
  color: var(--m-hueso);
  font-family: var(--m-font-display);
  font-size: 0.9375rem;
}

.tarjetas-semana__inicial--defecto {
  width: 32px;
  height: 32px;
  border-style: dashed;
  background: transparent;
  color: var(--m-oro);
}

.tarjetas-semana__nombre {
  flex-grow: 1;
  min-width: 0;
  font-family: var(--m-font-display);
  font-size: 1.0625rem;
  overflow-wrap: anywhere;
}

.tarjetas-semana__total {
  flex-shrink: 0;
  color: var(--m-piedra-clara);
  font-size: 0.75rem;
}

.tarjetas-semana__cifra {
  color: var(--m-hueso);
}

.tarjetas-semana__dias {
  display: flex;
  gap: 6px;
  margin-top: 12px;
}

.tarjetas-semana__dia {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.tarjetas-semana__letra {
  color: var(--m-piedra-clara);
  font-size: 0.6rem;
  letter-spacing: 0.1em;
}

/* Hoy: el único acento, y además tiene su número (no solo color). */
.tarjetas-semana__letra--hoy {
  color: var(--m-rosa);
}

.tarjetas-semana__defecto {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: var(--m-filete-grosor) dashed var(--m-filete-oscuro);
  border-radius: var(--m-radio-tarjeta);
}

.tarjetas-semana__texto-defecto {
  color: var(--m-piedra-clara);
  font-size: 0.78rem;
}

.tarjetas-semana__nombre-defecto {
  color: var(--m-hueso);
  font-family: var(--m-font-display);
  font-size: 0.9375rem;
}

.tarjetas-semana__aviso-defecto {
  display: block;
  margin-top: 4px;
  color: var(--m-hueso);
}

/** Realce al pasar: el borde a oro. El hundido (0,99) es de `.m-tarjeta-pulsable`. */
@media (hover: hover) and (pointer: fine) {
  .tarjetas-semana__tarjeta:hover {
    border-color: var(--m-oro);
  }
}
</style>
