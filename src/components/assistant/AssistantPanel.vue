<template>
  <div class="assistant-panel">
    <div class="assistant-panel__velo" data-test="velo" @click="cerrar()" />

    <section
      ref="caja"
      class="assistant-panel__caja"
      role="dialog"
      aria-modal="true"
      aria-label="Asistente de la Peluquería Marlene"
      tabindex="-1"
    >
      <header class="assistant-panel__cabecera">
        <button
          type="button"
          class="assistant-panel__volver"
          data-test="cerrar"
          aria-label="Cerrar el asistente"
          @click="cerrar()"
        >
          <!--
            Dos trazos distintos, no uno conmutado: una flecha no se convierte
            en aspa cambiando CSS. Cada uno se oculta en el ancho que no le
            toca, y el botón conserva un único `aria-label`.
          -->
          <svg
            class="assistant-panel__icono-volver"
            width="21"
            height="21"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M15 5l-7 7 7 7" />
          </svg>
          <svg
            class="assistant-panel__icono-cerrar"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        <span class="assistant-panel__avatar" aria-hidden="true">M</span>
        <span class="assistant-panel__rotulos">
          <span class="assistant-panel__titulo">Asistente de Marlene</span>
          <span class="assistant-panel__sub">Te ayuda a elegir y a reservar</span>
        </span>
      </header>

      <p class="assistant-panel__aviso" data-test="aviso">
        {{ aviso || DEFAULT_NOTICE }}
      </p>

      <AssistantThread :mensajes="messages" :cargando="loading" :error="error" />

      <p
        v-if="!auth.isLoggedIn"
        class="assistant-panel__sesion"
        data-test="sesion"
      >
        Para reservar,
        <a href="#" @click.prevent="irALogin">inicia sesión</a>.
      </p>

      <AssistantComposer
        :chips="chips"
        :cargando="loading"
        @enviar="send"
        @chip="onChip"
      />
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from 'src/stores/auth-store';
import { useAssistant } from 'src/composables/assistant/useAssistant';
import { useAssistantPanel } from 'src/composables/assistant/useAssistantPanel';
import AssistantThread from 'src/components/assistant/AssistantThread.vue';
import AssistantComposer from 'src/components/assistant/AssistantComposer.vue';
import {
  INTENT_CHIPS,
  followUpChips,
  type IntentChip,
} from 'src/composables/assistant/intentChips';

defineOptions({ name: 'AssistantPanel' });

/**
 * Respaldo del aviso legal. **Se copia literalmente del panel anterior**: es
 * NF12 (marco legal de la IA) y lo manda el servidor en `aviso`. El tablero
 * manda en cómo se ve esta banda, no en lo que dice.
 */
const DEFAULT_NOTICE =
  'Asistente automático. Tus mensajes se procesan con un proveedor de inteligencia artificial fuera de Colombia.';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const { cerrar } = useAssistantPanel();
const { messages, loading, error, aviso, send } = useAssistant();

const caja = ref<HTMLElement | null>(null);

/**
 * Una sola fila de chips, la del redactor: `INTENT_CHIPS` mientras el hilo esté
 * vacío y `followUpChips` después. «Mis reservas» solo se ofrece con sesión —un
 * chip que lleva a un «para eso inicia sesión» es peor que no estar— y el
 * seguimiento se deduce del dato presentado, no del texto: adivinar la intención
 * leyendo lo que escribió el modelo sería inventar.
 */
const chips = computed<IntentChip[]>(() => {
  if (!messages.value.length) {
    return INTENT_CHIPS.filter((c) => !c.requiresAuth || auth.isLoggedIn);
  }
  const ultimo = messages.value[messages.value.length - 1];
  if (!ultimo || ultimo.role !== 'assistant') return [];
  return followUpChips(ultimo.presentaciones);
});

async function onChip(chip: IntentChip) {
  if (loading.value) return;
  await send(chip.prompt);
}

function irALogin() {
  cerrar();
  router.push({
    name: 'login',
    query: { redirect: route.fullPath || '/services' },
  });
}

/**
 * El foco, en el orden que importa: primero se apunta de dónde venía y solo
 * después se entra en el panel. Al revés, `document.activeElement` ya sería la
 * caja y al cerrar el foco «volvería» a un elemento desmontado, que en la
 * práctica es el `body` — y desde el body el tabulador recomienza arriba.
 */
let foco: HTMLElement | null = null;

onMounted(async () => {
  foco =
    typeof document !== 'undefined'
      ? (document.activeElement as HTMLElement | null)
      : null;
  caja.value?.focus();

  document.addEventListener('keydown', alPulsarTecla);

  const pendiente = useAssistantPanel().consumirPendiente();
  if (pendiente) await send(pendiente);
});

onUnmounted(() => {
  if (typeof document !== 'undefined') {
    document.removeEventListener('keydown', alPulsarTecla);
  }
  foco?.focus();
});

const FOCABLES =
  'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * El teclado se escucha en `document`, no en la `<section>`.
 *
 * Parece un detalle y no lo es: al enviar el primer mensaje la fila de chips se
 * rehace —los de arranque dejan su sitio a los de seguimiento—, así que el botón
 * que tenía el foco desaparece del DOM y el navegador devuelve el foco al
 * `body`. Con los manejadores colgando de la sección, desde el `body` no llega
 * nada: `Escape` dejaba de cerrar y el cerrojo del tabulador dejaba de cerrar,
 * precisamente después de la primera interacción. Visto conduciendo el flujo de
 * verdad, no en las pruebas.
 *
 * Se registra en `onMounted` y se quita en `onUnmounted`: nunca en el cuerpo
 * del módulo, que corre en Node durante `quasar ssg generate`.
 */
function alPulsarTecla(evento: KeyboardEvent) {
  if (evento.key === 'Escape') {
    cerrar();
    return;
  }
  if (evento.key === 'Tab') atraparFoco(evento);
}

/**
 * El cerrojo del foco (spec §5.2). En escritorio el velo atenúa la página de
 * detrás: si el tabulador se escapa a ella, la clienta termina escribiendo en
 * un formulario que no ve, en una página que parece bloqueada y no lo está.
 *
 * Tres casos, no dos: además de envolver en los extremos, devuelve el foco al
 * panel cuando ya se había ido (el del `body` de arriba).
 */
function atraparFoco(evento: KeyboardEvent) {
  const panel = caja.value;
  if (!panel) return;

  const focables = Array.from(panel.querySelectorAll<HTMLElement>(FOCABLES));
  if (!focables.length) return;

  const primero = focables[0];
  const ultimo = focables[focables.length - 1];
  const activo = document.activeElement;

  if (!activo || !panel.contains(activo)) {
    evento.preventDefault();
    (evento.shiftKey ? ultimo : primero).focus();
    return;
  }
  if (evento.shiftKey && (activo === primero || activo === panel)) {
    evento.preventDefault();
    ultimo.focus();
    return;
  }
  if (!evento.shiftKey && activo === ultimo) {
    evento.preventDefault();
    primero.focus();
  }
}
</script>

<style scoped lang="scss">
.assistant-panel__velo {
  position: fixed;
  inset: 0;
  z-index: 2650;
  background: var(--m-velo);
}

/**
 * 424 × 848 anclado arriba a la derecha, como el tablero. El alto se recorta
 * con `100dvh` —nunca `100vh`—: el alto visible es lo único que un teclado
 * virtual respeta.
 */
.assistant-panel__caja {
  position: fixed;
  top: 26px;
  right: 26px;
  z-index: 2700;
  display: flex;
  flex-direction: column;
  width: 424px;
  height: 848px;
  max-height: calc(100dvh - 52px);
  background: var(--m-hueso);
  border-radius: var(--m-radio-panel);
  overflow: hidden;
  box-shadow: 0 18px 50px rgba(11, 9, 7, 0.45);
  animation: assistant-panel-entra 0.18s ease-out;
}

.assistant-panel__caja:focus-visible {
  outline: 2px solid var(--m-oro);
  outline-offset: -2px;
}

@keyframes assistant-panel-entra {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
}

.assistant-panel__cabecera {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 12px;
  height: 70px;
  padding: 0 16px;
  background: var(--m-tinta);
  color: var(--m-hueso);
}

/// En escritorio el cierre va a la derecha; en móvil la flecha abre la fila.
.assistant-panel__volver {
  order: 3;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--m-tactil-min);
  height: var(--m-tactil-min);
  margin-left: auto;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--m-hueso);
  cursor: pointer;
}

.assistant-panel__volver:focus-visible {
  outline: 2px solid var(--m-oro);
  outline-offset: 2px;
}

.assistant-panel__icono-volver {
  display: none;
}

.assistant-panel__icono-cerrar {
  display: block;
}

.assistant-panel__avatar {
  order: 1;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: var(--m-filete-grosor) solid var(--m-oro);
  font-family: var(--m-font-display);
  font-size: 17px;
  color: var(--m-oro);
}

.assistant-panel__rotulos {
  order: 2;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.assistant-panel__titulo {
  font-family: var(--m-font-display);
  font-size: 17px;
  line-height: 1.2;
}

.assistant-panel__sub {
  font-family: var(--m-font-sans);
  font-size: 11.5px;
  color: var(--m-piedra-clara);
}

/// Banda de arena. `--m-piedra` encima da 4,8:1, que pasa AA.
.assistant-panel__aviso {
  flex: 0 0 auto;
  margin: 0;
  padding: 8px 16px;
  background: var(--m-aviso-fondo);
  color: var(--m-piedra);
  border-bottom: var(--m-filete-grosor) solid var(--m-filete);
  font-family: var(--m-font-sans);
  font-size: 11.5px;
  line-height: 1.45;
}

.assistant-panel__sesion {
  flex: 0 0 auto;
  margin: 0;
  padding: 8px 16px;
  background: var(--m-nieve);
  border-top: var(--m-filete-grosor) solid var(--m-filete);
  font-family: var(--m-font-sans);
  font-size: 12.5px;
  color: var(--m-piedra);
}

/// Sobre claro, el enlace va en rosa profundo (6,4:1), no en el rosa del acento.
.assistant-panel__sesion a {
  color: var(--m-rosa-profundo);
}

@media (max-width: 699px) {
  // El velo sobra: el panel ES la pantalla.
  .assistant-panel__velo {
    display: none;
  }

  .assistant-panel__caja {
    inset: 0;
    width: 100%;
    height: 100dvh;
    max-height: none;
    border-radius: 0;
  }

  .assistant-panel__cabecera {
    height: 66px;
  }

  // La flecha abre la fila y hace de cierre.
  .assistant-panel__volver {
    order: 0;
    margin-left: 0;
    margin-right: -4px;
  }

  .assistant-panel__icono-volver {
    display: block;
  }

  .assistant-panel__icono-cerrar {
    display: none;
  }

  .assistant-panel__avatar {
    width: 34px;
    height: 34px;
    font-size: 15px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .assistant-panel__caja {
    animation: none;
  }
}
</style>
