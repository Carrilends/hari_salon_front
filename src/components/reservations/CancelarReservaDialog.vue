<template>
  <q-dialog
    :model-value="modelValue"
    class="cancelar-reserva-dialogo"
    :position="esMovil ? 'bottom' : 'standard'"
    @update:model-value="alCambiar"
  >
    <section
      v-if="reserva"
      class="cancelar-reserva"
      :class="{ 'cancelar-reserva--hoja': esMovil }"
      role="document"
      aria-labelledby="cancelar-reserva-titulo"
      data-test="cancelar-reserva"
    >
      <span
        v-if="esMovil"
        class="cancelar-reserva__tirador"
        aria-hidden="true"
      />
      <p class="cancelar-reserva__antetitulo">Cancelar</p>
      <h2
        id="cancelar-reserva-titulo"
        class="cancelar-reserva__titulo"
        data-test="cancelar-titulo"
      >
        ¿Cancelar tu cita del {{ dia }}?
      </h2>

      <div class="cancelar-reserva__ficha" data-test="cancelar-ficha">
        <p class="cancelar-reserva__horas">{{ horas }} · con {{ estilista }}</p>
        <p class="cancelar-reserva__servicios">{{ servicios }}</p>
      </div>

      <p class="cancelar-reserva__texto">
        El salón recibe el aviso al momento y ese hueco queda libre para otra
        persona. No se puede deshacer: si cambias de idea, tendrás que reservar
        de nuevo.
      </p>

      <p
        v-if="error"
        class="cancelar-reserva__error"
        role="alert"
        data-test="error-cancelacion"
      >
        {{ error }}
      </p>

      <button
        type="button"
        class="cancelar-reserva__confirmar m-boton--ancho"
        data-test="confirmar-cancelacion"
        :disabled="cancelando"
        :aria-busy="cancelando ? 'true' : 'false'"
        @click="confirmar"
      >
        {{ cancelando ? 'Cancelando…' : 'Sí, cancelar la cita' }}
      </button>
      <button
        type="button"
        class="cancelar-reserva__volver m-boton--ancho m-boton-plano"
        data-test="volver-cancelacion"
        @click="cerrar"
      >
        Volver
      </button>
    </section>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useConsultaMedios } from 'src/composables/shared/useConsultaMedios';
import {
  CONSULTA_MOVIL_RESERVAS,
  fechaDeCita,
  nombreDeEstilista,
  nombresDeServicios,
  rangoHorario,
} from 'src/helpers/my-reservations';
import type { ReservationDto } from 'src/interfaces/booking';

/**
 * La confirmación de «Cancelar» (M4). Sustituye al diálogo de plugin de
 * Quasar, que preguntaba por «esta reserva» sin decir cuál y avisaba del
 * resultado con un flotante. Aquí se ve la cita, se confirma en `--m-peligro`
 * y el error se queda en línea.
 *
 * Solo confirma: cancelar de verdad (y no hacerlo dos veces) es cosa de la
 * página, que le devuelve `cancelando` y `error`.
 */
defineOptions({ name: 'CancelarReservaDialog' });

const props = defineProps<{
  reserva: ReservationDto | null;
  modelValue: boolean;
  cancelando: boolean;
  error: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', valor: boolean): void;
  (e: 'confirmar', id: string): void;
}>();

/** Hoja inferior por debajo de 700 px; en el SSG y el primer render, escritorio. */
const esMovil = useConsultaMedios(CONSULTA_MOVIL_RESERVAS, false);

const dia = computed(() =>
  props.reserva ? fechaDeCita(props.reserva.scheduledAt) : ''
);
const horas = computed(() =>
  props.reserva ? rangoHorario(props.reserva) : ''
);
const estilista = computed(() =>
  props.reserva ? nombreDeEstilista(props.reserva) : ''
);
const servicios = computed(() =>
  props.reserva ? nombresDeServicios(props.reserva) : ''
);

function alCambiar(valor: boolean): void {
  emit('update:modelValue', valor);
}

function cerrar(): void {
  emit('update:modelValue', false);
}

function confirmar(): void {
  if (!props.reserva || props.cancelando) return;
  emit('confirmar', props.reserva.id);
}
</script>

<style scoped lang="scss">
/**
 * Tablero MisReservasA · Móvil 3: hoja hueso con tirador de 40×4, antetítulo
 * «Cancelar» en peligro (6,4:1 sobre hueso), título en Marcellus, ficha nieve
 * con la cita, texto en piedra, botón de peligro de 50 px y «Volver» de
 * contorno de 48 px. En escritorio, la misma pieza en un diálogo de 440 px.
 */
.cancelar-reserva {
  /* Quasar quita los clics a `.q-dialog__inner` y solo los devuelve a sus
     hijos `<div>`: sin esto, cada clic atraviesa la raíz y cae en el velo. */
  pointer-events: all;
  box-sizing: border-box;
  width: min(440px, calc(100vw - 32px));
  padding: 24px 24px 22px;
  border: var(--m-filete-grosor) solid var(--m-filete);
  border-radius: var(--m-radio-panel);
  background: var(--m-hueso);
  color: var(--m-tinta);
  font-family: var(--m-font-sans);
}

.cancelar-reserva--hoja {
  width: 100%;
  max-width: 100%;
  padding: 10px 20px calc(26px + env(safe-area-inset-bottom, 0px));
  border: 0;
  border-radius: var(--m-radio-panel) var(--m-radio-panel) 0 0;
}

.cancelar-reserva__tirador {
  display: block;
  width: 40px;
  height: 4px;
  margin: 0 auto 18px;
  border-radius: var(--m-radio-pildora);
  background: var(--m-piedra-clara);
}

.cancelar-reserva__antetitulo {
  margin: 0 0 8px;
  font-size: 10.5px;
  letter-spacing: var(--m-tracking-etiqueta);
  text-transform: uppercase;
  color: var(--m-peligro);
}

.cancelar-reserva__titulo {
  margin: 0 0 16px;
  font-family: var(--m-font-display);
  font-size: 26px;
  font-weight: 400;
  line-height: 1.15;
}

.cancelar-reserva__ficha {
  margin-bottom: 14px;
  padding: 14px 16px;
  border: var(--m-filete-grosor) solid var(--m-filete);
  border-radius: var(--m-radio-tarjeta);
  background: var(--m-nieve);
  font-size: 13.5px;
  line-height: 1.6;
}

.cancelar-reserva__horas {
  margin: 0;
  font-family: var(--m-font-display);
  font-size: 18px;
}

.cancelar-reserva__servicios {
  margin: 0;
  color: var(--m-piedra);
}

.cancelar-reserva__texto {
  margin: 0 0 22px;
  font-size: 13.5px;
  line-height: 1.6;
  color: var(--m-piedra);
}

.cancelar-reserva__error {
  margin: 0 0 14px;
  padding: 10px 12px;
  border: var(--m-filete-grosor) solid var(--m-peligro);
  border-radius: var(--m-radio-tarjeta);
  background: var(--m-nieve);
  color: var(--m-peligro);
  font-size: 13px;
  line-height: 1.45;
}

.cancelar-reserva__confirmar {
  width: 100%;
  min-height: 50px;
  border: var(--m-filete-grosor) solid var(--m-peligro);
  border-radius: var(--m-radio-pildora);
  background: var(--m-peligro);
  color: var(--m-peligro-texto);
  font-family: var(--m-font-sans);
  font-size: 12.5px;
  letter-spacing: var(--m-tracking-nav);
  text-transform: uppercase;
  cursor: pointer;
}

.cancelar-reserva__confirmar:disabled {
  opacity: 0.6;
  cursor: progress;
}

.cancelar-reserva__volver {
  width: 100%;
  min-height: 48px;
  margin-top: 8px;
  border: var(--m-filete-grosor) solid var(--m-tinta);
  border-radius: var(--m-radio-pildora);
  background: transparent;
  color: var(--m-tinta);
  font-family: var(--m-font-sans);
  font-size: 12.5px;
  letter-spacing: var(--m-tracking-nav);
  text-transform: uppercase;
  cursor: pointer;
}

.cancelar-reserva__confirmar:focus-visible,
.cancelar-reserva__volver:focus-visible {
  outline: 2px solid var(--m-tinta);
  outline-offset: 2px;
}

/**
 * Realce al pasar (solo puntero fino): el COLOR. El borrado no se aclara (no es
 * una acción que invitar): se le enciende un filete de oro, como al de borrar
 * un servicio.
 */
@media (hover: hover) and (pointer: fine) {
  .cancelar-reserva__confirmar:hover:not(:disabled) {
    border-color: var(--m-oro);
  }

  .cancelar-reserva__volver:hover {
    border-color: var(--m-oro);
  }
}
</style>

<!--
  Sin `scoped` a propósito: el velo lo pinta QDialog fuera del ámbito. La clase
  `cancelar-reserva-dialogo` viaja a la raíz del diálogo, así que la regla no se
  escapa a otro.
-->
<style lang="scss">
.cancelar-reserva-dialogo .q-dialog__backdrop {
  background: var(--m-velo);
}

.cancelar-reserva-dialogo .q-dialog__inner--bottom {
  padding-left: 0;
  padding-right: 0;
}
</style>
