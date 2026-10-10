<template>
  <q-dialog
    :model-value="abierta"
    :position="esMovil ? 'bottom' : 'standard'"
    :persistent="borrando"
    @update:model-value="alCambiarModelo"
  >
    <section
      class="borrar-pregunta"
      data-test="dialogo-borrar"
      role="document"
      aria-labelledby="borrar-pregunta-titulo"
      aria-describedby="borrar-pregunta-texto"
    >
      <span class="borrar-pregunta__agarre" aria-hidden="true" />
      <span class="borrar-pregunta__icono" aria-hidden="true">
        <StrokeIcon nombre="papelera" :tamano="22" />
      </span>
      <h2 id="borrar-pregunta-titulo" class="borrar-pregunta__titulo">
        ¿Borrar esta pregunta?
      </h2>
      <p class="borrar-pregunta__cita" data-test="pregunta-a-borrar">
        «{{ pregunta?.question }}»
      </p>
      <p id="borrar-pregunta-texto" class="borrar-pregunta__texto">
        Las clientas dejarán de verla. No se puede deshacer.
      </p>
      <p
        v-if="error"
        class="borrar-pregunta__fallo"
        role="alert"
        data-test="error-borrar"
      >
        {{ error }}
      </p>
      <div class="borrar-pregunta__acciones">
        <button
          type="button"
          class="borrar-pregunta__boton borrar-pregunta__boton--peligro m-boton--ancho"
          data-test="confirmar-borrado"
          :disabled="borrando"
          @click="confirmar"
        >
          Borrar pregunta
        </button>
        <button
          type="button"
          class="borrar-pregunta__boton m-boton--ancho"
          data-test="cancelar-borrado"
          :disabled="borrando"
          @click="cancelar"
        >
          Cancelar
        </button>
      </div>
    </section>
  </q-dialog>
</template>

<script setup lang="ts">
import StrokeIcon from 'src/components/shared/StrokeIcon.vue';
import type { FaqItem } from 'src/api/apiTypes';
import { useConsultaMedios } from 'src/composables/shared/useConsultaMedios';

/**
 * La confirmación de borrado (F2; tablero `PreguntasDuenaA`, «Móvil · 3»):
 * hoja inferior en móvil, diálogo pequeño en escritorio, y el único botón
 * en `--m-peligro` de la pantalla. Dice QUÉ pregunta se borra.
 *
 * No borra: emite `confirmar` y la página llama a la mutación.
 */
const props = defineProps<{
  abierta: boolean;
  pregunta: FaqItem | null;
  borrando: boolean;
  error: string | null;
}>();

const emit = defineEmits<{
  (e: 'update:abierta', valor: boolean): void;
  (e: 'confirmar'): void;
}>();

const esMovil = useConsultaMedios('(max-width: 699px)', false);

/** Mientras se borra no se cierra: si falla, el error se vería en un diálogo cerrado. */
function cancelar() {
  if (props.borrando) return;
  emit('update:abierta', false);
}

function alCambiarModelo(valor: boolean) {
  if (!valor && props.borrando) return;
  emit('update:abierta', valor);
}

function confirmar() {
  if (props.borrando) return;
  emit('confirmar');
}

defineOptions({ name: 'BorrarPreguntaDialog' });
</script>

<style scoped lang="scss">
.borrar-pregunta {
  /* Quasar quita los clics a `.q-dialog__inner` y solo los devuelve a sus
     hijos `<div>`: sin esto, cada clic atraviesa la raíz y cae en el velo. */
  pointer-events: all;
  width: min(420px, calc(100vw - 32px));
  box-sizing: border-box;
  padding: 26px 24px 22px;
  border-radius: var(--m-radio-panel);
  background: var(--m-hueso);
  color: var(--m-tinta);
  font-family: var(--m-font-sans);
}

.borrar-pregunta__agarre {
  display: none;
}

.borrar-pregunta__icono {
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  border: var(--m-filete-grosor) solid var(--m-peligro);
  border-radius: 50%;
  color: var(--m-peligro);
}

.borrar-pregunta__titulo {
  margin: 0 0 10px;
  font-family: var(--m-font-display);
  font-size: 23px;
  font-weight: 400;
  line-height: 1.2;
}

.borrar-pregunta__cita {
  margin: 0 0 6px;
  font-family: var(--m-font-display);
  font-size: 16px;
}

.borrar-pregunta__texto {
  margin: 0 0 22px;
  color: var(--m-piedra);
  font-size: 13.5px;
  line-height: 1.55;
}

.borrar-pregunta__fallo {
  margin: 0 0 16px;
  color: var(--m-peligro);
  font-size: 13.5px;
}

.borrar-pregunta__acciones {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.borrar-pregunta__boton {
  width: 100%;
  min-height: 48px;
  border: var(--m-filete-grosor) solid transparent;
  border-radius: var(--m-radio-pildora);
  background: none;
  color: var(--m-tinta);
  cursor: pointer;
  font-family: var(--m-font-sans);
  font-size: 12px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

/* El único botón de la pantalla que se lee como «esto no se deshace». */
.borrar-pregunta__boton--peligro {
  min-height: 50px;
  border-color: var(--m-peligro);
  background: var(--m-peligro);
  color: var(--m-peligro-texto);
}

.borrar-pregunta__boton--peligro:disabled {
  opacity: 0.6;
  cursor: progress;
}

.borrar-pregunta__boton:disabled {
  opacity: 0.6;
  cursor: progress;
}

.borrar-pregunta__boton:focus-visible {
  outline: 2px solid var(--m-tinta);
  outline-offset: 2px;
}

/* Hoja inferior en móvil, con su agarradera. */
@media (max-width: 699px) {
  .borrar-pregunta {
    width: 100vw;
    padding: 10px 20px 26px;
    border-radius: 18px 18px 0 0;
  }

  .borrar-pregunta__agarre {
    display: block;
    width: 40px;
    height: 4px;
    margin: 0 auto 20px;
    border-radius: 2px;
    background: var(--m-piedra-clara);
  }
}

/**
 * Realce al pasar (solo puntero fino): el COLOR. El borrado no se aclara (no
 * es una acción que invitar): se le enciende un filete de oro alrededor.
 */
@media (hover: hover) and (pointer: fine) {
  .borrar-pregunta__boton:hover:not(:disabled) {
    border-color: var(--m-oro);
  }

  .borrar-pregunta__boton--peligro:hover:not(:disabled) {
    border-color: var(--m-oro);
  }
}
</style>
