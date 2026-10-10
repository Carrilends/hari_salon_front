<template>
  <div
    class="acciones-cuenta"
    :class="{ 'acciones-cuenta--ancho': ancho }"
    data-test="acciones-cuenta"
  >
    <!-- type="button": dentro del <form>, sin él «Descartar» lo enviaría. -->
    <button
      v-if="conDescartar"
      type="button"
      class="acciones-cuenta__descartar m-boton-plano"
      data-test="descartar"
      :disabled="enviando"
      @click="emit('descartar')"
    >
      Descartar
    </button>
    <button
      type="submit"
      class="acciones-cuenta__guardar"
      :class="{ 'm-boton--ancho': ancho }"
      data-test="guardar"
      :disabled="enviando || sinCambios"
      :aria-busy="enviando ? 'true' : undefined"
    >
      {{ enviando ? textoGuardando : textoGuardar }}
    </button>
  </div>
</template>

<script setup lang="ts">
/**
 * La fila de acciones de los formularios de Mi cuenta (tablero, escritorio):
 * «Descartar» en texto y «Guardar…» en píldora tinta, a la derecha. En móvil
 * (tablero, móvil 2) el botón va a lo ancho y «Descartar» sobra: «← Mi cuenta»
 * ya es la salida.
 */
withDefaults(
  defineProps<{
    textoGuardar: string;
    textoGuardando?: string;
    enviando?: boolean;
    sinCambios?: boolean;
    conDescartar?: boolean;
    ancho?: boolean;
  }>(),
  {
    textoGuardando: 'Guardando…',
    enviando: false,
    sinCambios: false,
    conDescartar: true,
    ancho: false,
  }
);

const emit = defineEmits<{ (e: 'descartar'): void }>();
</script>

<style scoped lang="scss">
.acciones-cuenta {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 26px;
}

.acciones-cuenta--ancho {
  margin-top: 24px;
}

.acciones-cuenta__descartar {
  min-height: 48px;
  padding: 0 22px;
  border: 0;
  background: transparent;
  color: var(--m-piedra);
  font-family: var(--m-font-sans);
  font-size: 12px;
  letter-spacing: var(--m-tracking-nav);
  text-transform: uppercase;
  cursor: pointer;
}

.acciones-cuenta__guardar {
  min-height: 48px;
  padding: 0 28px;
  border: 0;
  border-radius: var(--m-radio-pildora);
  background: var(--m-tinta);
  color: var(--m-hueso);
  font-family: var(--m-font-sans);
  font-size: 12px;
  letter-spacing: var(--m-tracking-nav);
  text-transform: uppercase;
  cursor: pointer;
}

.acciones-cuenta__guardar.m-boton--ancho {
  width: 100%;
  min-height: 50px;
}

.acciones-cuenta__descartar:focus-visible,
.acciones-cuenta__guardar:focus-visible {
  outline: 2px solid var(--m-tinta);
  outline-offset: 2px;
}

.acciones-cuenta__descartar:disabled,
.acciones-cuenta__guardar:disabled {
  opacity: 0.55;
  cursor: default;
}

@media (hover: hover) and (pointer: fine) {
  .acciones-cuenta__descartar:not(:disabled):hover {
    color: var(--m-oro-profundo);
  }

  .acciones-cuenta__guardar:not(:disabled):hover {
    color: var(--m-oro);
  }
}
</style>
