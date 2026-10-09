<template>
  <div class="separador-acceso" data-test="separador-google">
    <span class="separador-acceso__linea" aria-hidden="true" />
    <span class="separador-acceso__texto">{{ texto }}</span>
    <span class="separador-acceso__linea" aria-hidden="true" />
  </div>
</template>

<script setup lang="ts">
/**
 * El «o» entre Google y el correo (decisión A9). La página solo lo pinta si
 * `GoogleSignInButton` avisó de que está disponible (A10): sin client id el
 * separador ya no se queda huérfano.
 */
defineProps<{ texto: string }>();
</script>

<style scoped lang="scss">
.separador-acceso {
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 22px 0;
  font-family: var(--m-font-sans);
  font-size: 11px;
  letter-spacing: var(--m-tracking-nav);
  text-transform: uppercase;
  color: var(--m-piedra);
}

.separador-acceso__linea {
  flex: 1 1 auto;
  height: var(--m-filete-grosor);
  background: var(--m-filete);
}
</style>
