<template>
  <div class="assistant-launcher">
    <Transition name="assistant-panel">
      <AssistantPanel v-if="open" />
    </Transition>

    <Transition name="assistant-fab">
      <button
        v-if="!open && mostrarFlotante"
        type="button"
        class="assistant-launcher__fab"
        data-test="fab"
        aria-label="Abrir el asistente"
        @click="abrir"
      >
        <svg
          class="assistant-launcher__icono"
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path
            d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-2.8-.4L3 21l1.6-4.6A8.3 8.3 0 0 1 3.6 11.5 8.4 8.4 0 0 1 12 3.1a8.4 8.4 0 0 1 9 8.4z"
          />
        </svg>
        Asistente
      </button>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import AssistantPanel from './AssistantPanel.vue';
import { useAssistantPanel } from 'src/composables/assistant/useAssistantPanel';

/**
 * `mostrarFlotante` lo decide el armazón por ruta: en el inicio no sale, porque
 * la banda de reseñas ya ofrece el asistente con sus chips. Es un prop y no una
 * consulta al router a propósito — el lanzador no tiene por qué saber de rutas,
 * y así se puede montar en una prueba sin media aplicación detrás.
 *
 * Ojo: solo se oculta el BOTÓN. El panel sigue montado en el inicio; si no, el
 * chip de la banda no tendría nada que abrir.
 */
withDefaults(defineProps<{ mostrarFlotante?: boolean }>(), {
  mostrarFlotante: true,
});

defineOptions({ name: 'AssistantLauncher' });

const { abierto: open, abrir } = useAssistantPanel();
</script>

<style scoped lang="scss">
/**
 * Una píldora con rótulo, no un círculo con un icono.
 *
 * Fuera del inicio nadie ha visto la tarjeta del asistente, así que el botón
 * tiene que decir qué es sin que haya que tocarlo; y de paso habla el mismo
 * idioma que los chips y «Reservar». Dentro, el globo va en oro sobre tinta
 * (5,7:1) y el rótulo en hueso (16,3:1).
 *
 * El flotante solo existe mientras el panel está cerrado: con el panel abierto
 * no puede quedar nada flotando encima —en móvil el panel ES la pantalla, y en
 * escritorio una burbuja sobre el velo competiría con su botón de cerrar—.
 */
.assistant-launcher__fab {
  position: fixed;
  right: 18px;
  bottom: 18px;
  z-index: 2600;
  display: inline-flex;
  align-items: center;
  gap: 9px;
  height: 48px;
  padding: 0 18px;
  border: 0;
  border-radius: var(--m-radio-pildora);
  background: var(--m-tinta);
  color: var(--m-hueso);
  font-family: var(--m-font-sans);
  font-size: 12px;
  letter-spacing: var(--m-tracking-nav);
  text-transform: uppercase;
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(11, 9, 7, 0.28);
}

.assistant-launcher__icono {
  color: var(--m-oro);
}

.assistant-launcher__fab:focus-visible {
  outline: 2px solid var(--m-oro);
  outline-offset: 3px;
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
