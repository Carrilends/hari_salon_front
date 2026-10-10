<template>
  <p class="error-campo">
    <svg
      class="error-campo__icono"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linecap="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M20.5 12a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0" />
      <path d="M12 7.5v5" />
      <path d="M11.95 16.2h.1" />
    </svg>
    <span><slot /></span>
  </p>
</template>

<script setup lang="ts">
/**
 * La línea de error bajo un campo de la reseña (tablero ResenaA, móvil): icono
 * y texto en el rosa de peligro, nunca solo color. `id` y `data-test` los pone
 * quien la usa (el campo la enlaza con `aria-describedby`).
 *
 * Sin `role="alert"` a propósito: el error llega al lector de pantalla por el
 * foco que va al campo, `aria-invalid` y `aria-describedby`. Una región viva lo
 * anunciaría dos veces (varios errores a la vez) e interrumpiría al escribir,
 * porque el formulario revalida en vivo tras el primer intento.
 */
defineOptions({ name: 'ErrorCampo' });
</script>

<style scoped lang="scss">
.error-campo {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 7px 0 0;
  font-family: var(--m-font-sans);
  font-size: 13px;
  line-height: 1.4;
  color: var(--m-peligro);
}

.error-campo__icono {
  flex: 0 0 auto;
}
</style>
