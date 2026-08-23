<template>
  <div class="assistant-launcher">
    <transition name="assistant-pop">
      <AssistantChat
        v-if="open"
        class="assistant-launcher__panel"
        @close="open = false"
      />
    </transition>

    <q-btn
      class="assistant-launcher__fab"
      round
      size="lg"
      color="pink-4"
      :icon="open ? 'close' : 'smart_toy'"
      :aria-label="open ? 'Cerrar asistente' : 'Abrir asistente'"
      @click="open = !open"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import AssistantChat from './AssistantChat.vue';

const open = ref(false);
</script>

<style scoped lang="scss">
.assistant-launcher__fab {
  position: fixed;
  right: 18px;
  bottom: 18px;
  z-index: 2600;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25);
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
