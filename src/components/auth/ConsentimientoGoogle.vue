<template>
  <q-dialog
    class="consentimiento-dialogo"
    :model-value="abierto"
    @update:model-value="alCambiar"
  >
    <section
      class="consentimiento"
      data-test="consentimiento-google"
      aria-labelledby="consentimiento-titulo"
    >
      <h2 id="consentimiento-titulo" class="consentimiento__titulo">
        Antes de crear tu cuenta
      </h2>
      <p class="consentimiento__texto">
        Para crear tu cuenta con Google necesitamos que aceptes la
        <router-link
          :to="{ name: 'privacy-policy' }"
          target="_blank"
          rel="noopener"
          class="consentimiento__enlace"
          >política de tratamiento de datos personales</router-link
        >
        (Ley 1581 de 2012).
      </p>
      <div class="consentimiento__acciones">
        <button
          type="button"
          class="consentimiento__boton consentimiento__boton--macizo m-boton--ancho"
          data-test="aceptar-consentimiento"
          @click="emit('aceptar')"
        >
          Acepto
        </button>
        <button
          type="button"
          class="consentimiento__boton m-boton--ancho"
          data-test="cancelar-consentimiento"
          @click="emit('cancelar')"
        >
          Cancelar
        </button>
      </div>
    </section>
  </q-dialog>
</template>

<script setup lang="ts">
/**
 * Consentimiento para crear una cuenta con Google (decisión A11, S9). Sustituye
 * al diálogo de plugin de Quasar, que desentonaba con la paleta. Cerrarlo con
 * Escape o con el velo es cancelar: la credencial pendiente se descarta.
 */
defineProps<{ abierto: boolean }>();

const emit = defineEmits<{
  (e: 'aceptar'): void;
  (e: 'cancelar'): void;
}>();

function alCambiar(valor: boolean) {
  if (!valor) emit('cancelar');
}
</script>

<style scoped lang="scss">
.consentimiento {
  /* Quasar quita los clics a `.q-dialog__inner` y solo los devuelve a sus
     hijos `<div>`: sin esto, cada clic atraviesa la raíz y cae en el velo. */
  pointer-events: all;
  width: calc(100vw - 32px);
  max-width: 440px;
  box-sizing: border-box;
  padding: 28px 24px 24px;
  border-radius: var(--m-radio-panel);
  background: var(--m-hueso);
  color: var(--m-tinta);
  font-family: var(--m-font-sans);
}

.consentimiento__titulo {
  margin: 0 0 12px;
  font-family: var(--m-font-display);
  font-size: 22px;
  font-weight: 400;
  line-height: 1.2;
}

.consentimiento__texto {
  margin: 0 0 22px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--m-piedra);
}

.consentimiento__enlace {
  color: var(--m-rosa-profundo);
  text-decoration: none;
  border-bottom: var(--m-filete-grosor) solid var(--m-filete-rosa);
}

.consentimiento__acciones {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.consentimiento__boton {
  height: 48px;
  padding: 0 20px;
  border: var(--m-filete-grosor) solid var(--m-filete);
  border-radius: var(--m-radio-pildora);
  background: transparent;
  color: var(--m-tinta);
  font-family: var(--m-font-sans);
  font-size: 12.5px;
  letter-spacing: var(--m-tracking-nav);
  text-transform: uppercase;
  cursor: pointer;
}

.consentimiento__boton--macizo {
  border-color: var(--m-tinta);
  background: var(--m-tinta);
  color: var(--m-hueso);
}

.consentimiento__boton:focus-visible,
.consentimiento__enlace:focus-visible {
  outline: 2px solid var(--m-oro);
  outline-offset: 2px;
}

@media (hover: hover) and (pointer: fine) {
  .consentimiento__boton:hover {
    border-color: var(--m-oro);
  }

  /* Rótulo en oro sobre tinta: 5,8:1. */
  .consentimiento__boton--macizo:hover {
    color: var(--m-oro);
  }

  .consentimiento__enlace:hover {
    border-bottom-color: var(--m-rosa-profundo);
  }
}
</style>

<!--
  Sin `scoped` a propósito: el velo lo pinta QDialog, cuyos nodos no llevan el
  atributo de ámbito. La clase `consentimiento-dialogo` viaja al div raíz del
  diálogo (QDialog mete `attrs.class` en sus clases raíz), así que la regla no
  se escapa a otro diálogo. Mismo patrón que `MenuMasHoja.vue`.
-->
<style lang="scss">
.consentimiento-dialogo .q-dialog__backdrop {
  background: var(--m-velo);
}
</style>
