<template>
  <div class="assistant-launcher">
    <transition name="assistant-pop">
      <AssistantPanel v-if="open" />
    </transition>

    <q-btn
      class="assistant-launcher__fab"
      round
      size="lg"
      color="pink-4"
      :icon="open ? 'close' : 'smart_toy'"
      :aria-label="open ? 'Cerrar asistente' : 'Abrir asistente'"
      @click="alternar"
    />
  </div>
</template>

<script setup lang="ts">
import AssistantPanel from './AssistantPanel.vue';
import { useAssistantPanel } from 'src/composables/assistant/useAssistantPanel';

const { abierto: open, alternar } = useAssistantPanel();
</script>

<style scoped lang="scss">
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

  body.m-con-barra-movil .assistant-launcher__panel {
    bottom: calc(var(--m-barra-movil-alto) + 78px);
  }
}

.assistant-launcher__panel {
  position: fixed;
  right: 18px;
  bottom: 84px;
  z-index: 2600;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.28);
}

.assistant-pop-enter-active,
.assistant-pop-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
  transform-origin: bottom right;
}

.assistant-pop-enter-from,
.assistant-pop-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.98);
}

@media (prefers-reduced-motion: reduce) {
  .assistant-pop-enter-active,
  .assistant-pop-leave-active {
    transition: none;
  }
}
</style>
