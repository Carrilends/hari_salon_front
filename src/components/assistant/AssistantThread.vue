<template>
  <div
    ref="caja"
    class="assistant-thread"
    data-test="hilo"
    aria-live="polite"
  >
    <p
      v-if="!mensajes.length && !cargando"
      class="assistant-thread__saludo"
      data-test="saludo"
    >
      Pregúntame por servicios, precios o disponibilidad, y te armo la cita.
    </p>

    <template v-for="(m, i) in mensajes" :key="i">
      <p
        v-if="m.role === 'user'"
        class="assistant-thread__burbuja assistant-thread__burbuja--clienta"
        data-test="burbuja-clienta"
      >
        {{ m.content }}
      </p>
      <p
        v-else
        class="assistant-thread__burbuja assistant-thread__burbuja--asistente"
        data-test="burbuja-asistente"
      >
        {{ m.content }}
      </p>

      <template v-for="(p, j) in m.presentaciones ?? []" :key="`${i}-${j}`">
        <ServiceListCard
          v-if="p.tipo === 'servicios'"
          :servicios="p.servicios"
        />
        <PackageProposalCard v-else-if="p.tipo === 'paquete'" :propuesta="p" />
      </template>
    </template>

    <div
      v-if="cargando"
      class="assistant-thread__escribiendo"
      data-test="escribiendo"
      aria-label="El asistente está escribiendo"
    >
      <span /><span /><span />
    </div>

    <p v-if="error" class="assistant-thread__error" role="alert">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import type { ChatMessage } from 'src/composables/assistant/useAssistant';
import PackageProposalCard from 'src/components/assistant/PackageProposalCard.vue';
import ServiceListCard from 'src/components/assistant/ServiceListCard.vue';

defineOptions({ name: 'AssistantThread' });

const props = defineProps<{
  mensajes: ChatMessage[];
  cargando: boolean;
  error: string | null;
}>();

const caja = ref<HTMLElement | null>(null);

/**
 * El hilo se baja solo al mensaje nuevo. Sin esto, la respuesta aparece fuera
 * de la vista y hay que arrastrar para leerla — en móvil, con el teclado
 * levantado, es la mitad de la pantalla. Se toca el DOM dentro de `nextTick` y
 * con la `ref` comprobada: este componente también se compila en Node durante
 * `quasar ssg generate`.
 */
watch(
  () => [props.mensajes.length, props.cargando],
  () => {
    void nextTick(() => {
      const el = caja.value;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }
);
</script>

<style scoped lang="scss">
.assistant-thread {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px;
  overflow-y: auto;
  // Al llegar al final del hilo, el gesto no se lo pasa a la página de detrás.
  overscroll-behavior: contain;
  flex: 1 1 auto;
  min-height: 0;
  font-family: var(--m-font-sans);
}

.assistant-thread__saludo {
  margin: auto 0;
  text-align: center;
  font-size: 13.5px;
  line-height: 1.6;
  color: var(--m-piedra);
}

.assistant-thread__burbuja {
  margin: 0;
  max-width: 300px;
  padding: 12px 15px;
  font-size: 14px;
  line-height: 1.55;
  white-space: pre-wrap;
  // El freno del punto 4: lo escribe la clienta y puede no traer un espacio.
  overflow-wrap: anywhere;
}

.assistant-thread__burbuja--asistente {
  align-self: flex-start;
  background: var(--m-nieve);
  border: var(--m-filete-grosor) solid var(--m-filete);
  border-radius: 3px 14px 14px 14px;
  color: var(--m-tinta);
}

.assistant-thread__burbuja--clienta {
  align-self: flex-end;
  background: var(--m-tinta);
  border-radius: 14px 3px 14px 14px;
  color: var(--m-hueso);
}

.assistant-thread__escribiendo {
  align-self: flex-start;
  display: inline-flex;
  gap: 4px;
  align-items: center;
  padding: 14px 15px;
  background: var(--m-nieve);
  border: var(--m-filete-grosor) solid var(--m-filete);
  border-radius: 3px 14px 14px 14px;
}

.assistant-thread__escribiendo span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--m-piedra);
  animation: assistant-blink 1.2s infinite ease-in-out both;
}

.assistant-thread__escribiendo span:nth-child(2) {
  animation-delay: 0.18s;
}

.assistant-thread__escribiendo span:nth-child(3) {
  animation-delay: 0.36s;
}

@keyframes assistant-blink {
  0%,
  80%,
  100% {
    opacity: 0.25;
  }
  40% {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .assistant-thread__escribiendo span {
    animation: none;
    opacity: 0.6;
  }
}

.assistant-thread__error {
  margin: 0;
  font-size: 13px;
  color: var(--m-rosa-profundo);
}
</style>
