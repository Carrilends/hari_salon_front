<template>
  <article
    class="fila"
    :class="{ 'fila--seleccionada': seleccionada, 'fila--compacta': compacta }"
    data-test="fila-reserva"
    :data-id="reserva.id"
  >
    <button
      type="button"
      class="fila__abrir m-boton--ancho m-boton-plano"
      data-test="abrir-reserva"
      :aria-current="seleccionada ? 'true' : undefined"
      @click="emit('abrir', reserva.id)"
    >
      <span class="fila__hora">
        <span class="fila__cifra" data-test="fila-hora">{{ hora }}</span>
        <span class="fila__duracion">{{ duracion }}</span>
      </span>
      <span class="fila__datos">
        <span class="fila__nombre" data-test="fila-nombre"
          >{{ nombre }}{{ ' '
          }}<span v-if="nueva" class="fila__nueva" data-test="etiqueta-nueva"
            >Nueva</span
          ></span
        >
        <span class="fila__servicios" data-test="fila-servicios">{{
          servicios
        }}</span>
        <span class="fila__estilista" data-test="fila-estilista">{{
          lineaEstilista
        }}</span>
      </span>
    </button>

    <span class="fila__estado" :class="meta.clase" data-test="estado-fila">
      <StrokeIcon :nombre="meta.icono" :tamano="13" />{{ meta.label }}
    </span>

    <button
      v-if="puedeConfirmar"
      type="button"
      class="fila__confirmar"
      data-test="confirmar-fila"
      :disabled="confirmando || bloqueada"
      :aria-label="
        confirmando ? 'Confirmando…' : `Confirmar la reserva de ${nombre}`
      "
      @click="emit('confirmar', reserva.id)"
    >
      <StrokeIcon class="fila__confirmar-icono" nombre="check" :tamano="15" />{{
        confirmando ? 'Confirmando…' : 'Confirmar'
      }}
    </button>

    <p v-if="error" class="fila__error" role="alert" data-test="error-fila">
      {{ error }}
    </p>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import StrokeIcon from 'src/components/shared/StrokeIcon.vue';
import {
  horaDelSalon,
  nombreDeClienta,
  nombreDeEstilista,
  serviciosEnUnaLinea,
} from 'src/helpers/admin-reservation-filter';
import { formatDurationMinutes } from 'src/helpers/duration';
import { reservationStatusMeta } from 'src/helpers/reservation-status';
import type { ReservationDto } from 'src/interfaces/booking';

/**
 * Una fila de la bandeja (spec §3, A2; tablero `AdminReservasB`). La fila
 * entera abre el detalle; «Confirmar» va aparte porque un botón no puede ir
 * dentro de otro. En compacta (móvil) no hay «Confirmar»: se confirma desde la
 * pantalla de la reserva, como en el tablero.
 *
 * El estado se pinta aquí y no con `EstadoReserva` (plan 2): esa pieza está
 * hecha para fondo claro, y sobre tinta el oro profundo no se lee. La forma
 * (icono + palabra, punteado si está pendiente) es la misma.
 */
const props = withDefaults(
  defineProps<{
    reserva: ReservationDto;
    seleccionada?: boolean;
    nueva?: boolean;
    compacta?: boolean;
    confirmando?: boolean;
    /** Otra reserva tiene una acción en vuelo: se apaga sin decir «Confirmando…». */
    bloqueada?: boolean;
    error?: string | null;
  }>(),
  {
    seleccionada: false,
    nueva: false,
    compacta: false,
    confirmando: false,
    bloqueada: false,
    error: null,
  }
);

const emit = defineEmits<{
  (e: 'abrir', id: string): void;
  (e: 'confirmar', id: string): void;
}>();

const hora = computed(() => horaDelSalon(props.reserva.scheduledAt));
const duracion = computed(() =>
  formatDurationMinutes(props.reserva.totalDurationMinutes)
);
const nombre = computed(() => nombreDeClienta(props.reserva));
const servicios = computed(() => serviciosEnUnaLinea(props.reserva));
const lineaEstilista = computed(() => {
  const base = `con ${nombreDeEstilista(props.reserva)}`;
  return props.compacta || props.reserva.workerPinned
    ? base
    : `${base} · la asignó el sistema`;
});
const meta = computed(() => reservationStatusMeta(props.reserva.status));
const puedeConfirmar = computed(
  () => !props.compacta && props.reserva.status === 'pendiente'
);

defineOptions({ name: 'FilaReserva' });
</script>

<style lang="scss" scoped>
/* Medidas del tablero `AdminReservasB` (escritorio): 86 px de alto, hora en
   Marcellus 23 px, filete de oro al 35 %. La columna de la hora es de 76 px y
   no de los 70 del tablero: «08:00» mide 73,4 px en Marcellus. */
.fila {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0 20px;
  min-height: 86px;
  box-sizing: border-box;
  margin-bottom: 10px;
  padding: 0 18px;
  border: var(--m-filete-grosor) solid var(--m-filete-oscuro);
  border-radius: var(--m-radio-tarjeta);
  background: var(--m-carbon);
  color: var(--m-hueso);
  font-family: var(--m-font-sans);
}

/* La elegida: filete hueso. El tablero aclaraba también el fondo, pero sobre
   ese tono el oro de «Pendiente» baja a 4,26:1. */
.fila--seleccionada {
  border-color: var(--m-hueso);
}

.fila__abrir {
  display: flex;
  flex: 1 1 0;
  align-items: center;
  gap: 20px;
  min-width: 0;
  min-height: var(--m-tactil-min);
  padding: 12px 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.fila__hora {
  width: 76px;
  flex-shrink: 0;
}

.fila__cifra {
  display: block;
  font-family: var(--m-font-display);
  font-size: 23px;
  line-height: 1.1;
}

.fila__duracion {
  display: block;
  margin-top: 2px;
  color: var(--m-piedra-clara);
  font-size: 11.5px;
}

.fila__datos {
  flex: 1 1 auto;
  min-width: 0;
}

.fila__nombre {
  display: flex;
  align-items: center;
  font-size: 15.5px;
}

.fila__nueva {
  display: inline-flex;
  align-items: center;
  height: 20px;
  margin-left: 8px;
  padding: 0 8px;
  border-radius: var(--m-radio-pildora);
  background: var(--m-rosa);
  color: var(--m-tinta);
  font-size: 9.5px;
  letter-spacing: var(--m-tracking-nav);
  text-transform: uppercase;
}

.fila__servicios,
.fila__estilista {
  display: block;
  margin-top: 3px;
  color: var(--m-piedra-clara);
  font-size: 12.5px;
}

.fila__estilista {
  margin-top: 2px;
}

.fila__estado {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 6px;
  height: 24px;
  padding: 0 10px;
  border: var(--m-filete-grosor) solid currentColor;
  border-radius: var(--m-radio-pildora);
  font-size: 10.5px;
  letter-spacing: var(--m-tracking-nav);
  text-transform: uppercase;
}

/* Sobre tinta cambia la pintura, no la forma: siempre icono + palabra. */
.fila__estado.estado--pendiente {
  border-style: dashed;
  color: var(--m-oro);
}

.fila__estado.estado--confirmada {
  color: var(--m-hueso);
}

.fila__estado.estado--cumplida {
  color: var(--m-piedra-clara);
}

.fila__estado.estado--cancelada {
  color: var(--m-piedra-clara);
  text-decoration: line-through;
}

.fila__confirmar {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 7px;
  min-height: var(--m-tactil-min);
  padding: 0 16px;
  border: var(--m-filete-grosor) solid var(--m-oro);
  border-radius: var(--m-radio-pildora);
  background: transparent;
  color: var(--m-hueso);
  font-family: var(--m-font-sans);
  font-size: 11px;
  letter-spacing: var(--m-tracking-nav);
  text-transform: uppercase;
  cursor: pointer;
}

.fila__confirmar-icono {
  color: var(--m-oro);
}

.fila__confirmar:disabled {
  opacity: 0.6;
  cursor: progress;
}

/* El error de la acción, a lo ancho bajo la fila. Rosa: es lo que reclama
   atención en esta pantalla (9,4:1 sobre carbón). */
.fila__error {
  flex-basis: 100%;
  /* Bajo los datos: la hora (76) más el hueco de `.fila__abrir` (20). */
  margin: -4px 0 12px 96px;
  color: var(--m-rosa);
  font-size: 12.5px;
}

.fila__abrir:focus-visible,
.fila__confirmar:focus-visible {
  outline: 2px solid var(--m-hueso);
  outline-offset: 2px;
}

/* Compacta (móvil, tablero «La bandeja»): hora de 62 px (el tablero dice 52,
   pero «08:00» mide 60,6 px a 19 px), servicios en una línea y el estado abajo
   a la derecha, sin robar el toque a la fila. */
.fila--compacta {
  gap: 0 14px;
  min-height: 0;
  margin-bottom: 8px;
  padding: 0 14px;
}

.fila--compacta .fila__abrir {
  align-items: flex-start;
  gap: 14px;
  padding: 12px 0 14px;
}

.fila--compacta .fila__hora {
  width: 62px;
}

.fila--compacta .fila__cifra {
  font-size: 19px;
}

.fila--compacta .fila__duracion {
  font-size: 11px;
}

.fila--compacta .fila__nombre {
  font-size: 14.5px;
}

.fila--compacta .fila__servicios {
  overflow: hidden;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fila--compacta .fila__estilista {
  margin-top: 8px;
  padding-right: 120px;
  font-size: 12px;
  line-height: 24px;
}

.fila--compacta .fila__estado {
  position: absolute;
  right: 14px;
  bottom: 14px;
  font-size: 10px;
  pointer-events: none;
}

.fila--compacta .fila__error {
  margin-left: 76px;
}

/**
 * Realce al pasar (solo puntero fino): el COLOR. El movimiento es global, en
 * `app.scss` («Realce y hundido»).
 */
@media (hover: hover) and (pointer: fine) {
  .fila__abrir:hover .fila__nombre {
    color: var(--m-oro);
  }

  .fila__confirmar:hover:not(:disabled) {
    background: var(--m-oro);
    color: var(--m-tinta);
  }

  .fila__confirmar:hover:not(:disabled) .fila__confirmar-icono {
    color: var(--m-tinta);
  }
}
</style>
