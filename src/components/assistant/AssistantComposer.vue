<template>
  <div class="assistant-composer">
    <div
      v-if="chips.length"
      class="assistant-composer__chips"
      data-test="fila-chips"
    >
      <button
        v-for="chip in chips"
        :key="chip.tool"
        type="button"
        class="assistant-composer__chip"
        data-test="chip"
        :disabled="cargando"
        @click="emit('chip', chip)"
      >
        {{ chip.label }}
      </button>
    </div>

    <form class="assistant-composer__campo" @submit.prevent="enviar">
      <label class="assistant-composer__etiqueta" :for="idCampo">
        Escribe tu mensaje
      </label>
      <input
        :id="idCampo"
        v-model="texto"
        type="text"
        maxlength="500"
        placeholder="Escribe tu mensaje…"
        :disabled="cargando"
      />
      <button
        type="submit"
        class="assistant-composer__enviar"
        aria-label="Enviar mensaje"
        :disabled="cargando || !texto.trim()"
      >
        <svg
          width="19"
          height="19"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.7"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M5 12h13M12 5l7 7-7 7" />
        </svg>
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { IntentChip } from 'src/composables/assistant/intentChips';

defineOptions({ name: 'AssistantComposer' });

const props = defineProps<{ chips: IntentChip[]; cargando: boolean }>();
const emit = defineEmits<{
  (e: 'enviar', texto: string): void;
  (e: 'chip', chip: IntentChip): void;
}>();

const idCampo = 'assistant-composer-campo';
const texto = ref('');

function enviar() {
  const valor = texto.value.trim();
  if (!valor || props.cargando) return;
  texto.value = '';
  emit('enviar', valor);
}
</script>

<style scoped lang="scss">
.assistant-composer {
  flex: 0 0 auto;
  font-family: var(--m-font-sans);
}

/**
 * Los chips viven aquí y no dentro del hilo: en una fila fija sobre el campo se
 * ven siempre, sin depender de que el último mensaje siga siendo el último. No
 * se parte en dos líneas — con scroll horizontal cabe lo que haya.
 */
.assistant-composer__chips {
  display: flex;
  gap: 7px;
  padding: 10px 14px;
  overflow-x: auto;
  background: var(--m-hueso);
  // Una fila que no se parte, como pide el tablero de móvil.
  scrollbar-width: none;
}

.assistant-composer__chips::-webkit-scrollbar {
  display: none;
}

.assistant-composer__chip {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  min-height: var(--m-tactil-min);
  padding: 0 14px;
  background: var(--m-nieve);
  border: var(--m-filete-grosor) solid var(--m-filete);
  border-radius: var(--m-radio-pildora);
  color: var(--m-tinta);
  font-family: var(--m-font-sans);
  font-size: 12px;
  white-space: nowrap;
  cursor: pointer;
}

.assistant-composer__chip:disabled {
  opacity: 0.55;
  cursor: default;
}

.assistant-composer__enviar:focus-visible,
.assistant-composer__campo input:focus-visible {
  outline: 2px solid var(--m-oro);
  outline-offset: 2px;
}

/// Los chips se posan sobre `--m-hueso`, y el oro claro da 2,84:1 ahí: por
/// debajo del 3:1 que WCAG pide a un indicador de foco, que no es texto pero
/// tampoco es decoración. Sobre hueso, el dorado es el profundo.
.assistant-composer__chip:focus-visible {
  outline: 2px solid var(--m-oro-profundo);
  outline-offset: 2px;
}

.assistant-composer__campo {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 10px 14px;
  background: var(--m-nieve);
  border-top: var(--m-filete-grosor) solid var(--m-filete);
}

/// Se oculta a la vista, no al lector de pantalla: un campo sin etiqueta solo
/// se entiende mientras el marcador de posición esté a la vista, y desaparece
/// con la primera letra.
.assistant-composer__etiqueta {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.assistant-composer__campo input {
  flex: 1 1 auto;
  min-width: 0;
  min-height: var(--m-tactil-min);
  padding: 0 14px;
  background: var(--m-hueso);
  border: var(--m-filete-grosor) solid var(--m-filete);
  border-radius: var(--m-radio-pildora);
  color: var(--m-tinta);
  font-family: var(--m-font-sans);
  font-size: 14px;
}

.assistant-composer__campo input::placeholder {
  color: var(--m-piedra);
}

.assistant-composer__enviar {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 50%;
  background: var(--m-tinta);
  color: var(--m-hueso);
  cursor: pointer;
}

.assistant-composer__enviar:disabled {
  opacity: 0.45;
  cursor: default;
}

@media (max-width: 699px) {
  .assistant-composer__enviar {
    width: 46px;
    height: 46px;
  }
}

/**
 * Realce al pasar (solo puntero fino): el COLOR. El movimiento —subir 1 px con
 * sombra suave, hundirse a 0,96 al pulsar— es global, en `app.scss`
 * («Realce y hundido»).
 */
@media (hover: hover) and (pointer: fine) {
  .assistant-composer__chip:hover:not(:disabled) {
    border-color: var(--m-oro);
  }

  .assistant-composer__enviar:hover:not(:disabled) {
    color: var(--m-oro);
  }
}
</style>
