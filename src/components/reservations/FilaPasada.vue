<template>
  <li
    class="fila-pasada"
    :class="{ 'fila-pasada--cancelada': meta.tachada }"
    data-test="fila-pasada"
  >
    <span
      class="fila-pasada__fecha"
      :class="{ 'fila-pasada__fecha--tachada': meta.tachada }"
      data-test="fila-fecha"
      >{{ fecha }}</span
    >
    <span class="fila-pasada__estilista" data-test="fila-estilista">{{
      estilista
    }}</span>
    <span class="fila-pasada__servicios" data-test="fila-servicios">{{
      servicios
    }}</span>
    <span class="fila-pasada__resena-celda">
      <button
        v-if="reserva.status === 'cumplida'"
        type="button"
        class="fila-pasada__resena m-boton-plano"
        data-test="deja-resena"
        @click="emit('resena', reserva)"
      >
        <span class="fila-pasada__resena-texto">Deja tu reseña</span>
      </button>
    </span>
    <EstadoReserva
      class="fila-pasada__estado"
      :estado="reserva.status"
      compacto
    />
  </li>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import EstadoReserva from 'src/components/reservations/EstadoReserva.vue';
import { reservationStatusMeta } from 'src/helpers/reservation-status';
import {
  fechaDeFila,
  nombreDeEstilista,
  nombresDeServicios,
} from 'src/helpers/my-reservations';
import type { ReservationDto } from 'src/interfaces/booking';

/**
 * Una pasada en fila fina (M1). Si fue cumplida, ofrece «Deja tu reseña» (M6):
 * la página decide qué pasa al pulsarlo.
 */
defineOptions({ name: 'FilaPasada' });

const props = defineProps<{ reserva: ReservationDto }>();

const emit = defineEmits<{
  (e: 'resena', reserva: ReservationDto): void;
}>();

const meta = computed(() => reservationStatusMeta(props.reserva.status));
const fecha = computed(() => fechaDeFila(props.reserva.scheduledAt));
const estilista = computed(() => {
  const nombre = nombreDeEstilista(props.reserva);
  return nombre.charAt(0).toUpperCase() + nombre.slice(1);
});
const servicios = computed(() => nombresDeServicios(props.reserva));
</script>

<style scoped lang="scss">
/**
 * Tablero MisReservasA: filas de 56 px con filete inferior, rejilla
 * `200px 140px 1fr 120px` (aquí con una columna más para la reseña), texto
 * en piedra y la fecha en tinta. En móvil, dos renglones.
 */
.fila-pasada {
  display: grid;
  grid-template-columns: 200px 140px minmax(0, 1fr) auto 120px;
  align-items: center;
  gap: 16px;
  min-height: 56px;
  border-bottom: var(--m-filete-grosor) solid var(--m-filete);
  font-family: var(--m-font-sans);
  font-size: 13.5px;
  color: var(--m-piedra);
}

.fila-pasada__fecha {
  color: var(--m-tinta);
}

.fila-pasada__fecha--tachada {
  color: var(--m-piedra);
  text-decoration: line-through;
}

.fila-pasada__servicios {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fila-pasada__estado {
  justify-self: end;
}

.fila-pasada__resena {
  display: inline-flex;
  align-items: center;
  min-height: var(--m-tactil-min);
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--m-rosa-profundo);
  font-family: var(--m-font-sans);
  font-size: 13px;
  cursor: pointer;
}

/* Enlace de contenido sobre claro: rosa profundo con su filete rosa debajo. */
.fila-pasada__resena-texto {
  border-bottom: var(--m-filete-grosor) solid var(--m-filete-rosa);
}

.fila-pasada__resena:focus-visible {
  outline: 2px solid var(--m-tinta);
  outline-offset: 2px;
}

@media (max-width: 699px) {
  .fila-pasada {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas:
      'fecha estado'
      'estilista servicios'
      'resena resena';
    gap: 2px 12px;
    padding: 10px 0;
    font-size: 13px;
  }

  .fila-pasada__fecha {
    grid-area: fecha;
  }

  .fila-pasada__estado {
    grid-area: estado;
  }

  .fila-pasada__estilista {
    grid-area: estilista;
  }

  .fila-pasada__servicios {
    grid-area: servicios;
    text-align: right;
  }

  .fila-pasada__resena-celda {
    grid-area: resena;
  }
}

/** Realce al pasar (solo puntero fino): el COLOR; el movimiento es el global. */
@media (hover: hover) and (pointer: fine) {
  .fila-pasada__resena:hover {
    color: var(--m-tinta);
  }
}
</style>
