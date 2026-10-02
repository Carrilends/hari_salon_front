<template>
  <div class="assistant-launcher">
    <AssistantPanel v-if="open" />

    <q-btn
      v-if="!open"
      class="assistant-launcher__fab"
      data-test="fab"
      round
      size="lg"
      color="pink-4"
      icon="smart_toy"
      aria-label="Abrir asistente"
      @click="abrir"
    />
  </div>
</template>

<script setup lang="ts">
import AssistantPanel from './AssistantPanel.vue';
import { useAssistantPanel } from 'src/composables/assistant/useAssistantPanel';

const { abierto: open, abrir } = useAssistantPanel();
</script>

<style scoped lang="scss">
/**
 * El flotante solo existe mientras el panel está cerrado. Con el panel abierto
 * no puede quedar nada flotando encima: en móvil el panel ES la pantalla, y en
 * escritorio una burbuja sobre el velo competiría con el botón de cerrar del
 * propio panel.
 *
 * Se fue con él la posición de la burbuja vieja (`.assistant-launcher__panel`,
 * anclada abajo a la derecha) y su transición: el panel nuevo se coloca y se
 * anima por su cuenta, porque es quien sabe de dónde sale en cada ancho —arriba
 * a la derecha en escritorio, a pantalla completa en móvil.
 */
.assistant-launcher__fab {
  position: fixed;
  right: 18px;
  bottom: 18px;
  z-index: 2600;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25);
}

// La página que monta una barra de acción fija marca el `body`: el flotante
// sube por encima de ella en vez de taparle el botón de WhatsApp.
//
// Dentro del punto de corte a propósito: la barra solo se pinta por debajo de
// 700 px. Sin esta condición, en escritorio el flotante se apartaba de una
// barra que no está —89 px del borde en vez de 18— y el hueco que el pie le
// reserva en su esquina quedaba vacío.
@media (max-width: 699px) {
  body.m-con-barra-movil .assistant-launcher__fab {
    bottom: calc(var(--m-barra-movil-alto) + 12px);
  }
}
</style>
