<template>
  <div class="mobile-bar">
    <button
      type="button"
      class="mobile-bar__reservar m-boton--ancho"
      data-test="reservar"
      @click="emit('reservar')"
    >
      Reservar
    </button>

    <a
      class="mobile-bar__whatsapp m-boton"
      data-test="whatsapp"
      :href="enlaceWhatsApp"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escribir por WhatsApp"
    >
      <svg
        width="25"
        height="25"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M20.5 11.6a8.5 8.5 0 0 1-12.4 7.6L3.5 20.5l1.4-4.4A8.5 8.5 0 1 1 20.5 11.6z" />
        <path
          d="M9 9.2c.3-.7.6-.7.9-.7h.6c.2 0 .5 0 .7.5l.7 1.6c.1.3 0 .5-.1.7l-.4.5c-.1.2-.2.3 0 .6a6 6 0 0 0 2.8 2.3c.3.1.5.1.7-.1l.5-.6c.2-.2.4-.2.6-.1l1.6.8c.3.1.4.3.4.5v.5c-.1.5-.6 1-1.2 1.1-1.1.2-2.6-.3-4.2-1.4a9.4 9.4 0 0 1-3.3-3.8c-.5-1.1-.5-2-.3-2.4z"
        />
      </svg>
    </a>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { WHATSAPP_PHONE } from 'src/constants/whatsapp-phone';
import { buildWhatsAppUrl } from 'src/helpers/whatsappBooking';

const emit = defineEmits<{ (e: 'reservar'): void }>();

/**
 * El flotante del asistente vive en el armazón y se posa en esta misma
 * esquina. La marca en el `body` le dice que aquí hay una barra y que suba;
 * solo la lleva la página que monta la barra, así que las demás no se ven
 * afectadas. Va en `onMounted` porque la ruta `/` se prerenderiza en Node.
 */
const MARCA = 'm-con-barra-movil';

onMounted(() => document.body.classList.add(MARCA));
onUnmounted(() => document.body.classList.remove(MARCA));

const enlaceWhatsApp = buildWhatsAppUrl(
  WHATSAPP_PHONE,
  'Hola, quiero pedir una cita en la Peluquería Marlene.',
);

defineOptions({ name: 'MobileActionBar' });
</script>

<style scoped lang="scss">
.mobile-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2500;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  // El gesto del teléfono vive debajo de la barra: sin esto, el botón de
  // WhatsApp queda bajo la franja de inicio en los iPhone con muesca.
  padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
  background: var(--m-tinta);
  border-top: var(--m-filete-grosor) solid var(--m-oro);
  box-sizing: border-box;
}

.mobile-bar__reservar {
  flex: 1 1 auto;
  min-height: var(--m-tactil-min);
  padding: 15px 0;
  background: var(--m-hueso);
  border: 0;
  border-radius: var(--m-radio-pildora);
  font: inherit;
  font-family: var(--m-font-sans);
  font-size: 12.5px;
  letter-spacing: var(--m-tracking-nav);
  text-transform: uppercase;
  color: var(--m-tinta);
  cursor: pointer;
}

.mobile-bar__whatsapp {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--m-whatsapp);
  // Sobre el verde el trazo va oscuro: en blanco daría 2,0:1.
  color: var(--m-whatsapp-texto);
}

@media (min-width: 700px) {
  .mobile-bar {
    display: none;
  }
}

/**
 * Realce al pasar (solo puntero fino): el COLOR. El movimiento —subir 1 px con
 * sombra suave, hundirse a 0,96 al pulsar— es global, en `app.scss`
 * («Realce y hundido»).
 */
@media (hover: hover) and (pointer: fine) {
  .mobile-bar__reservar:hover {
    background: var(--m-oro-claro);
  }

  .mobile-bar__whatsapp:hover {
    background: var(--m-whatsapp-realce);
  }
}
</style>
