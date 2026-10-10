<template>
  <q-dialog
    :model-value="modelValue"
    :position="hoja ? 'bottom' : 'standard'"
    :persistent="ocupada"
    @update:model-value="alCambiar"
  >
    <section
      class="cancelar"
      :class="{ 'cancelar--hoja': hoja }"
      role="document"
      aria-labelledby="cancelar-titulo"
      data-test="cancelar-reserva"
    >
      <h2 id="cancelar-titulo" class="cancelar__titulo">
        ¿Cancelar esta cita?
      </h2>
      <p class="cancelar__resumen" data-test="cancelar-resumen">
        {{ resumen }}
      </p>
      <p class="cancelar__texto">
        Sale de la lista y la clienta recibe el aviso por WhatsApp si dejó su
        teléfono. No se puede deshacer.
      </p>
      <p
        v-if="error"
        class="cancelar__error"
        role="alert"
        data-test="error-cancelar"
      >
        {{ error }}
      </p>
      <div class="cancelar__acciones">
        <button
          type="button"
          class="cancelar__boton m-boton--ancho"
          data-test="volver-cancelar"
          :disabled="ocupada"
          @click="cerrar"
        >
          Volver
        </button>
        <button
          type="button"
          class="cancelar__boton cancelar__boton--peligro m-boton--ancho"
          data-test="confirmar-cancelacion"
          :disabled="ocupada || bloqueada"
          @click="emit('confirmar')"
        >
          {{ ocupada ? 'Cancelando…' : 'Cancelar la cita' }}
        </button>
      </div>
    </section>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  diaDelSalon,
  fechaLargaCapitalizada,
  horaDelSalon,
  nombreDeClienta,
} from 'src/helpers/admin-reservation-filter';
import type { ReservationDto } from 'src/interfaces/booking';

/**
 * La confirmación de cancelar desde la bandeja (spec §3, A3). Sustituye al
 * diálogo de plugin de Quasar de la página vieja, que preguntaba por «este
 * cliente» sin decir qué cita. Quien cancela de verdad es la página; aquí solo
 * se confirma. (Los comentarios tampoco nombran el objeto de Quasar con punto:
 * la guarda de la Tarea 10 lee la fuente entera.)
 */
const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    reserva: ReservationDto | null;
    hoja?: boolean;
    ocupada?: boolean;
    /**
     * Otra acción de la página está en vuelo (un solo cerrojo): solo se apaga
     * «Cancelar la cita». No dice «Cancelando…» ni se vuelve persistente, y
     * «Volver» sigue vivo: la dueña no queda atrapada esperando a otra reserva.
     */
    bloqueada?: boolean;
    error?: string | null;
  }>(),
  { hoja: false, ocupada: false, bloqueada: false, error: null }
);

const emit = defineEmits<{
  (e: 'update:modelValue', abierto: boolean): void;
  (e: 'confirmar'): void;
}>();

const resumen = computed(() => {
  const r = props.reserva;
  if (!r) return '';
  return `${nombreDeClienta(r)} · ${fechaLargaCapitalizada(
    diaDelSalon(r.scheduledAt)
  )} · ${horaDelSalon(r.scheduledAt)}`;
});

function cerrar() {
  if (props.ocupada) return;
  emit('update:modelValue', false);
}

function alCambiar(abierto: boolean) {
  if (!abierto && props.ocupada) return;
  emit('update:modelValue', abierto);
}

defineOptions({ name: 'CancelarReservaBandeja' });
</script>

<style lang="scss" scoped>
.cancelar {
  /* Quasar quita los clics a `.q-dialog__inner` y solo los devuelve a sus
     hijos `<div>`: sin esto, cada clic atraviesa la raíz y cae en el velo. */
  pointer-events: all;
  width: min(420px, calc(100vw - 32px));
  box-sizing: border-box;
  padding: 26px 24px 20px;
  border: var(--m-filete-grosor) solid var(--m-filete);
  border-radius: var(--m-radio-panel);
  background: var(--m-hueso);
  color: var(--m-tinta);
  font-family: var(--m-font-sans);
}

.cancelar--hoja {
  width: 100vw;
  padding: 22px 20px calc(20px + env(safe-area-inset-bottom, 0px));
  border-radius: var(--m-radio-panel) var(--m-radio-panel) 0 0;
}

.cancelar__titulo {
  margin: 0 0 10px;
  font-family: var(--m-font-display);
  font-size: 1.35rem;
  font-weight: 400;
  line-height: 1.2;
}

.cancelar__resumen {
  margin: 0 0 8px;
  font-size: 0.95rem;
}

.cancelar__texto {
  margin: 0 0 18px;
  color: var(--m-piedra);
  font-size: 0.9rem;
  line-height: 1.5;
}

.cancelar__error {
  margin: -8px 0 14px;
  color: var(--m-peligro);
  font-size: 0.85rem;
}

.cancelar__acciones {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.cancelar--hoja .cancelar__acciones {
  flex-direction: column-reverse;
}

.cancelar__boton {
  min-height: var(--m-tactil-min);
  padding: 0 18px;
  border: var(--m-filete-grosor) solid transparent;
  border-radius: var(--m-radio-pildora);
  background: transparent;
  color: var(--m-tinta);
  font-family: var(--m-font-sans);
  font-size: 0.72rem;
  letter-spacing: var(--m-tracking-nav);
  text-transform: uppercase;
  cursor: pointer;
}

.cancelar--hoja .cancelar__boton {
  width: 100%;
}

.cancelar__boton--peligro {
  border-color: var(--m-peligro);
  background: var(--m-peligro);
  color: var(--m-peligro-texto);
}

.cancelar__boton:disabled {
  opacity: 0.6;
  cursor: progress;
}

.cancelar__boton:focus-visible {
  outline: 2px solid var(--m-tinta);
  outline-offset: 2px;
}

/**
 * Realce al pasar (solo puntero fino): el COLOR. Como en el borrado de
 * servicios, la acción sin vuelta no se aclara: se le enciende un filete de oro.
 */
@media (hover: hover) and (pointer: fine) {
  .cancelar__boton:hover:not(:disabled) {
    border-color: var(--m-oro);
  }
}
</style>
