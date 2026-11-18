<template>
  <q-dialog ref="dialogRef" persistent @hide="onDialogHide">
    <section
      class="confirmar"
      data-test="dialogo-confirmar"
      role="document"
      aria-labelledby="confirmar-titulo"
    >
      <h2 id="confirmar-titulo" class="confirmar__titulo">{{ titulo }}</h2>
      <p class="confirmar__texto" data-test="texto">{{ texto }}</p>

      <div class="confirmar__acciones">
        <button
          type="button"
          class="confirmar__boton"
          data-test="cancelar"
          @click="onDialogCancel"
        >
          {{ textoCancelar }}
        </button>
        <button
          type="button"
          class="confirmar__boton confirmar__boton--tinta m-boton--ancho"
          data-test="confirmar"
          @click="onDialogOK"
        >
          {{ textoConfirmar }}
        </button>
      </div>
    </section>
  </q-dialog>
</template>

<script setup lang="ts">
import { useDialogPluginComponent } from 'quasar';

/**
 * Confirmación genérica con la paleta del portal.
 *
 * Sustituye al `$q.dialog({ title, message, cancel })` de Quasar, que salía
 * en Roboto, blanco y con «CANCEL / OK» en el rosa de la plantilla. Se abre con
 * `$q.dialog({ component: ConfirmarDialog, componentProps: {...} })` y responde
 * con `onOk` / `onCancel` como el de Quasar.
 */
withDefaults(
  defineProps<{
    titulo: string;
    texto: string;
    textoCancelar?: string;
    textoConfirmar?: string;
  }>(),
  { textoCancelar: 'Cancelar', textoConfirmar: 'Aceptar' }
);

defineEmits([...useDialogPluginComponent.emits]);

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } =
  useDialogPluginComponent();

defineOptions({ name: 'ConfirmarDialog' });
</script>

<style lang="scss" scoped>
.confirmar {
  /* Quasar quita los clics a `.q-dialog__inner` y solo los devuelve a sus
     hijos `<div>`: sin esto, cada clic atraviesa la raíz y cae en el velo. */
  pointer-events: all;
  width: min(420px, calc(100vw - 32px));
  padding: 26px 24px 20px;
  border: var(--m-filete-grosor) solid var(--m-filete);
  border-radius: var(--m-radio-panel);
  background: var(--m-hueso);
  color: var(--m-tinta);
  font-family: var(--m-font-sans);
}

.confirmar__titulo {
  margin: 0 0 12px;
  font-family: var(--m-font-display);
  font-size: 1.35rem;
  font-weight: 400;
  line-height: 1.2;
}

.confirmar__texto {
  margin: 0 0 22px;
  color: var(--m-piedra);
  font-size: 0.95rem;
}

.confirmar__acciones {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.confirmar__boton {
  min-height: var(--m-tactil-min);
  padding: 0 18px;
  border: var(--m-filete-grosor) solid var(--m-filete);
  border-radius: var(--m-radio-pildora);
  background: transparent;
  color: var(--m-tinta);
  font-family: var(--m-font-sans);
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: var(--m-tracking-nav);
  cursor: pointer;
}

.confirmar__boton:focus-visible {
  outline: 2px solid var(--m-oro);
  outline-offset: 2px;
}

/* Tinta sobre hueso (16,3:1 el rótulo en hueso): la acción, sin el rojo del
   borrado, porque descartar un formulario no toca nada guardado. */
.confirmar__boton--tinta {
  border-color: var(--m-tinta);
  background: var(--m-tinta);
  color: var(--m-hueso);
}

/**
 * Realce al pasar (solo puntero fino): el COLOR. El movimiento es global, en
 * `app.scss` («Realce y hundido»).
 */
@media (hover: hover) and (pointer: fine) {
  .confirmar__boton:hover {
    border-color: var(--m-oro);
  }
}
</style>
