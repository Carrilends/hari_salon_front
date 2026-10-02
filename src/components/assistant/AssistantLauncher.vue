<template>
  <div class="assistant-launcher">
    <Transition name="assistant-panel">
      <AssistantPanel v-if="open" />
    </Transition>

    <Transition name="assistant-fab">
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
    </Transition>
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
 * anclada abajo a la derecha): el panel nuevo se coloca solo, porque es quien
 * sabe dónde va en cada ancho —arriba a la derecha en escritorio, a pantalla
 * completa en móvil—. Lo que SÍ vive aquí es cuándo entra y cuándo sale: lo
 * manda quien monta y desmonta. El aspecto de esa entrada y esa salida lo
 * describe `AssistantPanel.vue`, dueño de sus propias piezas.
 *
 * El flotante se desvanece a la par. Vuelve mientras el panel todavía se está
 * yendo, y un botón que salta al lado de algo que se desvanece delata la
 * costura.
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

.assistant-fab-enter-active,
.assistant-fab-leave-active {
  transition: opacity 0.2s ease;
}

.assistant-fab-enter-from,
.assistant-fab-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .assistant-fab-enter-active,
  .assistant-fab-leave-active {
    transition: none;
  }
}
</style>
