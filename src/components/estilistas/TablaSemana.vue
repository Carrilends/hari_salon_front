<template>
  <table class="tabla-semana" data-test="tabla-semana">
    <caption class="sr">
      Horas reservadas por estilista y día de la semana
    </caption>
    <thead>
      <tr class="tabla-semana__fila-cabecera">
        <th
          scope="col"
          class="tabla-semana__cabecera tabla-semana__cabecera--nombre"
        >
          Estilista
        </th>
        <th
          v-for="dia in cabeceras"
          :key="dia.fecha"
          scope="col"
          class="tabla-semana__cabecera"
          :class="{ 'tabla-semana__cabecera--hoy': dia.esHoy }"
          :data-test="dia.esHoy ? 'cabecera-hoy' : 'cabecera-dia'"
          :aria-current="dia.esHoy ? 'date' : undefined"
        >
          {{ dia.corto }}
          <span class="tabla-semana__numero">{{ dia.numero }}</span>
          <span v-if="dia.esHoy" class="tabla-semana__hoy">hoy</span>
        </th>
        <th
          scope="col"
          class="tabla-semana__cabecera tabla-semana__cabecera--total"
        >
          Semana
        </th>
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="fila in filas"
        :key="fila.id"
        class="tabla-semana__fila"
        :class="{ 'tabla-semana__fila--elegida': fila.id === seleccionada }"
        data-test="fila-estilista"
      >
        <th scope="row" class="tabla-semana__nombre">
          <button
            type="button"
            class="tabla-semana__estilista m-boton-plano"
            data-test="elegir-estilista"
            :aria-label="`Editar a ${fila.name}`"
            :aria-expanded="fila.id === seleccionada ? 'true' : 'false'"
            @click="emit('elegir', fila.id)"
          >
            <span class="tabla-semana__inicial" aria-hidden="true">{{
              inicialDe(fila.name)
            }}</span>
            <span class="tabla-semana__texto-nombre">{{ fila.name }}</span>
          </button>
        </th>
        <td
          v-for="dia in fila.days"
          :key="dia.date"
          class="tabla-semana__celda"
          data-test="celda-dia"
        >
          <BarraCarga
            :usados="dia.usedMinutes"
            :capacidad="dia.capacityMinutes"
            :sobre-carbon="fila.id === seleccionada"
          />
          <span
            class="tabla-semana__horas"
            data-test="horas-dia"
            aria-hidden="true"
            >{{ formatearDuracion(dia.usedMinutes) }}</span
          >
        </td>
        <td class="tabla-semana__total" data-test="total-semana">
          <span class="tabla-semana__cifra">{{
            formatearDuracion(fila.resumen.usados)
          }}</span>
          <span class="tabla-semana__de"
            >de {{ formatearDuracion(fila.resumen.capacidad) }}</span
          >
        </td>
      </tr>
      <tr
        v-if="porDefecto"
        class="tabla-semana__fila-defecto"
        data-test="fila-sin-preferencia"
      >
        <th scope="row" class="tabla-semana__nombre">
          <span class="tabla-semana__defecto">
            <span
              class="tabla-semana__inicial tabla-semana__inicial--defecto"
              aria-hidden="true"
            >
              <StrokeIcon nombre="sin-preferencia" />
            </span>
            <span>
              <span
                class="tabla-semana__texto-nombre tabla-semana__texto-nombre--defecto"
                >{{ porDefecto.name }}</span
              >
              <span class="tabla-semana__predeterminada">Predeterminada</span>
            </span>
          </span>
        </th>
        <td colspan="8" class="tabla-semana__explicacion">
          No atiende: es la opción para la clienta a la que le da igual, y el
          portal asigna a quien tenga la primera hora libre.
          <strong
            v-if="porDefecto.resumen.usados > 0"
            class="tabla-semana__aviso-defecto"
            data-test="carga-sin-preferencia"
            >Esta semana tiene
            {{ formatearDuracion(porDefecto.resumen.usados) }} de citas a su
            nombre: revísalas en Reservas.</strong
          >
        </td>
      </tr>
    </tbody>
  </table>
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
 * La semana en tabla (escritorio, ≥ 900 px): una fila por estilista
 * asignable, sus siete barras y su total; «Sin preferencia» aparte, sin botón.
 * Solo pinta: elegir una fila lo decide la página.
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

defineOptions({ name: 'TablaSemana' });
</script>

<style lang="scss" scoped>
.tabla-semana {
  width: 100%;
  border-collapse: collapse;
  color: var(--m-hueso);
  font-family: var(--m-font-sans);
  font-size: 0.8125rem;
}

.tabla-semana__fila-cabecera,
.tabla-semana__fila {
  border-bottom: var(--m-filete-grosor) solid var(--m-filete-oscuro);
}

.tabla-semana__cabecera {
  padding: 0 0 12px;
  color: var(--m-piedra-clara);
  font-size: 0.625rem;
  font-weight: 400;
  letter-spacing: var(--m-tracking-etiqueta);
  text-align: center;
  text-transform: uppercase;
  vertical-align: bottom;
}

.tabla-semana__cabecera--nombre {
  width: 190px;
  padding-left: 14px;
  text-align: left;
}

.tabla-semana__cabecera--total {
  width: 110px;
  padding-right: 14px;
  text-align: right;
}

.tabla-semana__cabecera--hoy {
  color: var(--m-hueso);
}

.tabla-semana__numero {
  font-family: var(--m-font-display);
  font-size: 0.9375rem;
  letter-spacing: 0;
}

/* El único acento de la pantalla: hoy. Con texto («hoy»), no solo color. */
.tabla-semana__cabecera--hoy .tabla-semana__numero,
.tabla-semana__hoy {
  color: var(--m-rosa);
}

.tabla-semana__hoy {
  display: block;
  margin-top: 2px;
  font-size: 0.5625rem;
}

.tabla-semana__fila--elegida {
  background: var(--m-carbon);
}

.tabla-semana__nombre {
  padding: 14px;
  font-weight: 400;
  text-align: left;
}

.tabla-semana__estilista {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: var(--m-tactil-min);
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--m-hueso);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.tabla-semana__estilista:focus-visible {
  outline: 2px solid var(--m-hueso);
  outline-offset: 2px;
}

.tabla-semana__inicial {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border: var(--m-filete-grosor) solid var(--m-oro);
  border-radius: 50%;
  background: var(--m-tinta);
  color: var(--m-hueso);
  font-family: var(--m-font-display);
  font-size: 0.9375rem;
}

.tabla-semana__inicial--defecto {
  border-style: dashed;
  background: transparent;
  color: var(--m-oro);
}

.tabla-semana__texto-nombre {
  font-family: var(--m-font-display);
  font-size: 1.0625rem;
}

.tabla-semana__celda {
  padding: 10px 6px;
  text-align: center;
}

.tabla-semana__horas {
  display: block;
  margin-top: 6px;
  color: var(--m-piedra-clara);
  font-size: 0.72rem;
  font-variant-numeric: tabular-nums;
}

.tabla-semana__total {
  padding-right: 14px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.tabla-semana__cifra {
  display: block;
  font-family: var(--m-font-display);
  font-size: 1.125rem;
}

.tabla-semana__de {
  display: block;
  color: var(--m-piedra-clara);
  font-size: 0.6875rem;
}

.tabla-semana__defecto {
  display: flex;
  align-items: center;
  gap: 12px;
}

.tabla-semana__texto-nombre--defecto {
  display: block;
  font-size: 1rem;
}

.tabla-semana__predeterminada {
  display: block;
  color: var(--m-piedra-clara);
  font-size: 0.6875rem;
}

.tabla-semana__explicacion {
  padding: 14px 6px;
  color: var(--m-piedra-clara);
  font-size: 0.78rem;
}

.tabla-semana__aviso-defecto {
  display: block;
  margin-top: 4px;
  color: var(--m-hueso);
  font-weight: 400;
}

/** Realce al pasar: el COLOR. El movimiento es global (`app.scss`). */
@media (hover: hover) and (pointer: fine) {
  .tabla-semana__estilista:hover {
    color: var(--m-oro);
  }
}
</style>
