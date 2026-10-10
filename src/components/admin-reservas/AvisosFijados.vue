<template>
  <section
    class="avisos"
    :class="{ 'avisos--vacio': avisos.length === 0 }"
    role="status"
    aria-live="polite"
    aria-label="Avisos en tiempo real"
    data-test="avisos-fijados"
  >
    <div
      v-for="(aviso, i) in avisos"
      :key="aviso.id"
      class="aviso"
      :class="{ 'aviso--reciente': i === 0 }"
      data-test="aviso"
      :data-evento="aviso.evento"
    >
      <StrokeIcon class="aviso__icono" :nombre="ICONO[aviso.evento]" :tamano="20" />
      <span class="aviso__texto">
        <span class="aviso__mensaje" data-test="aviso-mensaje">{{
          aviso.mensaje
        }}</span>
        <span class="aviso__detalle" data-test="aviso-detalle">{{
          aviso.detalle
        }}</span>
      </span>
      <button
        v-if="idsEnLista.includes(aviso.reservationId)"
        type="button"
        class="aviso__ver m-boton-plano"
        data-test="ver-aviso"
        :aria-label="`Ver la reserva: ${aviso.mensaje}`"
        @click="emit('ver', aviso)"
      >
        Ver
      </button>
      <button
        type="button"
        class="aviso__descartar m-boton-plano"
        data-test="descartar-aviso"
        aria-label="Descartar el aviso"
        @click="emit('descartar', aviso.id)"
      >
        <StrokeIcon nombre="cerrar" :tamano="16" />
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import StrokeIcon from 'src/components/shared/StrokeIcon.vue';
import type { AvisoEnVivo } from 'src/composables/notifications/avisosEnVivo';

/**
 * Los avisos en tiempo real de la bandeja (spec §3, A5; tablero «Llegan
 * avisos»): fijados sobre la lista, no flotantes. La región existe siempre —
 * vacía, sin alto— porque un lector de pantalla solo anuncia lo que entra en
 * una región viva que ya estaba en la página.
 */
defineProps<{ avisos: AvisoEnVivo[]; idsEnLista: string[] }>();

const emit = defineEmits<{
  (e: 'ver', aviso: AvisoEnVivo): void;
  (e: 'descartar', id: number): void;
}>();

const ICONO: Record<AvisoEnVivo['evento'], string> = {
  'reservation.created': 'reservas',
  'reservation.cancelled': 'cita-cancelada',
  'reservation.rescheduled': 'mover-cita',
  'reservation.confirmed': 'check',
};

defineOptions({ name: 'AvisosFijados' });
</script>

<style lang="scss" scoped>
/* Tablero «Llegan avisos»: caja con filete de oro al 35 %, el más reciente
   sobre carbón con el icono en oro; los demás con el icono en piedra clara. */
.avisos {
  margin-top: 14px;
  overflow: hidden;
  border: var(--m-filete-grosor) solid var(--m-filete-oscuro);
  border-radius: var(--m-radio-tarjeta);
  font-family: var(--m-font-sans);
}

.avisos--vacio {
  height: 0;
  margin-top: 0;
  border: 0;
}

.aviso {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 8px 12px 14px;
  color: var(--m-hueso);
}

.aviso + .aviso {
  border-top: var(--m-filete-grosor) solid var(--m-filete-oscuro);
}

.aviso--reciente {
  background: var(--m-carbon);
}

.aviso__icono {
  flex-shrink: 0;
  color: var(--m-piedra-clara);
}

.aviso--reciente .aviso__icono {
  color: var(--m-oro);
}

.aviso__texto {
  flex: 1 1 auto;
  min-width: 0;
}

.aviso__mensaje {
  display: block;
  font-size: 13.5px;
}

.aviso__detalle {
  display: block;
  margin-top: 2px;
  color: var(--m-piedra-clara);
  font-size: 11.5px;
}

.aviso__ver {
  min-height: var(--m-tactil-min);
  padding: 0 10px;
  border: 0;
  background: transparent;
  color: var(--m-oro);
  font-family: var(--m-font-sans);
  font-size: 10.5px;
  letter-spacing: var(--m-tracking-nav);
  text-transform: uppercase;
  cursor: pointer;
}

.aviso__descartar {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: var(--m-tactil-min);
  height: var(--m-tactil-min);
  border: 0;
  background: transparent;
  color: var(--m-piedra-clara);
  cursor: pointer;
}

.aviso__ver:focus-visible,
.aviso__descartar:focus-visible {
  outline: 2px solid var(--m-hueso);
  outline-offset: 2px;
}

/**
 * Realce al pasar (solo puntero fino): el COLOR. El movimiento es global, en
 * `app.scss` («Realce y hundido»).
 */
@media (hover: hover) and (pointer: fine) {
  .aviso__ver:hover,
  .aviso__descartar:hover {
    color: var(--m-hueso);
  }
}
</style>
