<template>
  <span
    class="estado"
    :class="[meta.clase, { 'estado--compacto': compacto }]"
    data-test="estado-reserva"
    :data-estado="estado"
  >
    <StrokeIcon :nombre="meta.icono" :tamano="13" class="estado__icono" />
    <span class="estado__texto">{{ meta.label }}</span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import StrokeIcon from 'src/components/shared/StrokeIcon.vue';
import { reservationStatusMeta } from 'src/helpers/reservation-status';
import type { ReservationStatus } from 'src/interfaces/booking';

/**
 * El estado de una reserva con texto e icono (M2): nunca solo por color.
 *
 * Por defecto es una píldora (tarjetas de «Mis reservas», bandeja de la dueña);
 * `compacto` la deja en texto + icono sin caja, para las filas finas de las
 * pasadas. Los colores viven solo aquí.
 */
defineOptions({ name: 'EstadoReserva' });

const props = withDefaults(
  defineProps<{ estado: ReservationStatus; compacto?: boolean }>(),
  { compacto: false }
);

const meta = computed(() => reservationStatusMeta(props.estado));
</script>

<style scoped lang="scss">
/**
 * Tablero MisReservasA: píldora de 24 px, versalitas de 10 px. Contrastes
 * (anotados en `tokens.scss`): oro profundo sobre nieve ≥ 5,5:1; hueso sobre
 * tinta 16,3:1; piedra sobre nieve ≥ 5,2:1; peligro sobre nieve ≥ 6,4:1.
 */
.estado {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 24px;
  padding: 0 10px;
  border: var(--m-filete-grosor) solid transparent;
  border-radius: var(--m-radio-pildora);
  font-family: var(--m-font-sans);
  font-size: 10px;
  letter-spacing: var(--m-tracking-nav);
  text-transform: uppercase;
  white-space: nowrap;
}

.estado__icono {
  flex-shrink: 0;
}

.estado--pendiente {
  border-color: var(--m-oro-profundo);
  color: var(--m-oro-profundo);
}

.estado--confirmada {
  border-color: var(--m-tinta);
  background: var(--m-tinta);
  color: var(--m-hueso);
}

.estado--cumplida {
  border-color: var(--m-filete);
  color: var(--m-piedra);
}

.estado--cancelada {
  border-color: var(--m-peligro);
  color: var(--m-peligro);
}

/* Sin caja: va después de los estados para ganarles el borde y el fondo. */
.estado--compacto {
  height: auto;
  padding: 0;
  border-color: transparent;
  background: transparent;
  font-size: 10.5px;
}

/* La confirmada compacta no puede quedarse con el rótulo hueso sobre claro. */
.estado--compacto.estado--confirmada {
  color: var(--m-tinta);
}
</style>
