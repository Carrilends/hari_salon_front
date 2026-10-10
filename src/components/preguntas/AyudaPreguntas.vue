<template>
  <div class="ayuda" data-test="ayuda-preguntas">
    <h2 class="ayuda__titulo">¿No está tu duda?</h2>
    <p class="ayuda__texto">
      Escríbenos y te respondemos, o pregúntale al asistente del portal.
    </p>
    <a
      class="ayuda__whatsapp m-boton m-boton--ancho"
      data-test="ayuda-whatsapp"
      :href="enlaceWhatsApp"
      target="_blank"
      rel="noopener noreferrer"
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
        focusable="false"
      >
        <path d="M20.5 11.6a8.5 8.5 0 0 1-12.4 7.6L3.5 20.5l1.4-4.4A8.5 8.5 0 1 1 20.5 11.6z" />
        <path
          d="M9 9.2c.3-.7.6-.7.9-.7h.6c.2 0 .5 0 .7.5l.7 1.6c.1.3 0 .5-.1.7l-.4.5c-.1.2-.2.3 0 .6a6 6 0 0 0 2.8 2.3c.3.1.5.1.7-.1l.5-.6c.2-.2.4-.2.6-.1l1.6.8c.3.1.4.3.4.5v.5c-.1.5-.6 1-1.2 1.1-1.1.2-2.6-.3-4.2-1.4a9.4 9.4 0 0 1-3.3-3.8c-.5-1.1-.5-2-.3-2.4z"
        />
      </svg>
      Escríbenos por WhatsApp
    </a>
    <button
      type="button"
      class="ayuda__asistente m-boton-plano"
      data-test="preguntar-asistente"
      @click="abrir()"
    >
      <span class="ayuda__asistente-texto">Pregúntale al asistente →</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { useAssistantPanel } from 'src/composables/assistant/useAssistantPanel';
import { WHATSAPP_PHONE } from 'src/constants/whatsapp-phone';
import { buildWhatsAppUrl } from 'src/helpers/whatsappBooking';

/**
 * La caja «¿No está tu duda?» de la columna tinta (F1). Dos salidas: el chat
 * del salón por WhatsApp (el número propio, el mismo `wa.me` del resto del
 * portal; nunca el teléfono a la vista) y el asistente, que se abre con el
 * mismo estado compartido que usan el flotante y la tarjeta del inicio.
 *
 * El rosa de «Pregúntale al asistente» es el único acento de la pantalla.
 */
const { abrir } = useAssistantPanel();

const enlaceWhatsApp = buildWhatsAppUrl(
  WHATSAPP_PHONE,
  'Hola, tengo una pregunta sobre la Peluquería Marlene.'
);

defineOptions({ name: 'AyudaPreguntas' });
</script>

<style scoped lang="scss">
.ayuda {
  padding: 24px 24px 22px;
  border: var(--m-filete-grosor) solid var(--m-filete-oscuro);
  border-radius: var(--m-radio-tarjeta);
  background: var(--m-carbon);
  color: var(--m-hueso);
  font-family: var(--m-font-sans);
}

.ayuda__titulo {
  margin: 0 0 6px;
  font-family: var(--m-font-display);
  font-size: 21px;
  font-weight: 400;
  line-height: 1.2;
}

.ayuda__texto {
  margin: 0 0 18px;
  color: var(--m-piedra-clara);
  font-size: 14px;
  line-height: 1.6;
}

/* Sobre el verde, el texto SIEMPRE oscuro: en blanco daría 2,0:1. */
.ayuda__whatsapp {
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border-radius: var(--m-radio-pildora);
  background: var(--m-whatsapp);
  color: var(--m-whatsapp-texto);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-decoration: none;
  text-transform: uppercase;
}

/* 44 px de área táctil; el subrayado va en el texto, no en el borde del botón. */
.ayuda__asistente {
  min-height: var(--m-tactil-min);
  display: inline-flex;
  align-items: center;
  margin-top: 6px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--m-rosa);
  cursor: pointer;
  font-family: var(--m-font-sans);
  font-size: 14px;
}

.ayuda__asistente-texto {
  padding-bottom: 2px;
  border-bottom: var(--m-filete-grosor) solid var(--m-rosa);
}

.ayuda__whatsapp:focus-visible,
.ayuda__asistente:focus-visible {
  outline: 2px solid var(--m-hueso);
  outline-offset: 2px;
}

/* En móvil la caja va sola sobre hueso: tinta para que se lea como bloque. */
@media (max-width: 899px) {
  .ayuda {
    padding: 18px 18px 16px;
    background: var(--m-tinta);
  }

  .ayuda__titulo {
    margin-bottom: 4px;
    font-size: 19px;
  }

  .ayuda__texto {
    margin-bottom: 14px;
    font-size: 13.5px;
    line-height: 1.55;
  }
}

/**
 * Realce al pasar (solo puntero fino): el COLOR. El movimiento es global, en
 * `app.scss` («Realce y hundido»).
 */
@media (hover: hover) and (pointer: fine) {
  .ayuda__whatsapp:hover {
    background: var(--m-whatsapp-realce);
  }

  .ayuda__asistente:hover {
    color: var(--m-hueso);
  }

  .ayuda__asistente:hover .ayuda__asistente-texto {
    border-bottom-color: var(--m-hueso);
  }
}
</style>
