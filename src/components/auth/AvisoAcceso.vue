<template>
  <div
    :id="id"
    class="aviso-acceso"
    :class="`aviso-acceso--${variante}`"
    data-test="aviso-acceso"
    :data-variante="variante"
    :role="variante === 'error' ? 'alert' : 'status'"
  >
    <svg
      v-if="variante === 'error'"
      class="aviso-acceso__icono"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M20.5 12a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0" />
      <path d="M12 7.5v5" />
      <path d="M11.95 16.2h.1" />
    </svg>
    <svg
      v-else
      class="aviso-acceso__icono"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
    <p class="aviso-acceso__texto"><slot /></p>
  </div>
</template>

<script setup lang="ts">
/**
 * Aviso en línea del acceso (decisiones A7 y A15). Sustituye a los avisos
 * flotantes de Quasar, que se iban solos y con sus colores. Va encima del
 * botón que envía. (Sin escribir aquí el nombre del objeto de Quasar: la
 * guarda de la Tarea 13 lo busca en la fuente, comentarios incluidos.)
 * - `error`: la respuesta del servidor (`role="alert"`, en peligro).
 * - `tranquilo`: una buena noticia que no exige nada (`role="status"`, filete
 *   de oro): «Tu contraseña quedó cambiada…».
 */
withDefaults(
  defineProps<{ variante?: 'error' | 'tranquilo'; id?: string }>(),
  { variante: 'error', id: undefined }
);
</script>

<style scoped lang="scss">
.aviso-acceso {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  border: var(--m-filete-grosor) solid;
  border-radius: var(--m-radio-tarjeta);
  background: var(--m-nieve);
  font-family: var(--m-font-sans);
  font-size: 13px;
  line-height: 1.45;
}

.aviso-acceso--error {
  border-color: var(--m-peligro);
  color: var(--m-peligro);
}

.aviso-acceso--tranquilo {
  border-color: var(--m-oro);
  color: var(--m-tinta);
}

.aviso-acceso__icono {
  flex: 0 0 auto;
  margin-top: 1px;
}

.aviso-acceso--tranquilo .aviso-acceso__icono {
  color: var(--m-oro-profundo);
}

.aviso-acceso__texto {
  margin: 0;
}
</style>
