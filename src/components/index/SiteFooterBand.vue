<template>
  <footer class="footer-band">
    <p class="footer-band__dato">{{ direccion }}</p>
    <p class="footer-band__dato">
      {{ horario.weekdayLabel }} {{ horario.weekdayRange }} ·
      {{ horario.weekendLabel }} {{ horario.weekendRange }}
    </p>

    <button
      v-if="mostrarAdmin"
      type="button"
      class="footer-band__admin"
      data-test="admin"
      @click="emit('admin')"
    >
      ¿Eres administrador?
    </button>

    <a
      class="footer-band__whatsapp"
      data-test="whatsapp"
      :href="enlaceWhatsApp"
      target="_blank"
      rel="noopener noreferrer"
    >
      <svg
        width="17"
        height="17"
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
      WhatsApp
    </a>
  </footer>
</template>

<script setup lang="ts">
import { SALON_ADDRESS } from 'src/constants/salon-location';
import { BUSINESS_SCHEDULE_COPY } from 'src/helpers/businessHours';
import { WHATSAPP_PHONE } from 'src/constants/whatsapp-phone';
import { buildWhatsAppUrl } from 'src/helpers/whatsappBooking';

withDefaults(defineProps<{ mostrarAdmin?: boolean }>(), { mostrarAdmin: false });
const emit = defineEmits<{ (e: 'admin'): void }>();

const direccion = SALON_ADDRESS;
const horario = BUSINESS_SCHEDULE_COPY;

const enlaceWhatsApp = buildWhatsAppUrl(
  WHATSAPP_PHONE,
  'Hola, quiero pedir una cita en la Peluquería Marlene.',
);

defineOptions({ name: 'SiteFooterBand' });
</script>

<style scoped lang="scss">
.footer-band {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 16px var(--m-banda-margen);
  /* El flotante del asistente (56 px + 18 de margen) se posa sobre la esquina
     inferior derecha: sin este respiro taparía el botón de WhatsApp. */
  padding-right: calc(var(--m-banda-margen) + 74px);
  background: var(--m-tinta);
  color: var(--m-piedra-clara);
  font-size: 12.5px;
}

.footer-band__dato {
  margin: 0;
}

/* El acceso de administración vivía en un chip flotante sobre el contenido.
   Aquí no tapa nada y deja la pantalla con un solo flotante, el del
   asistente, que es la regla acordada. */
.footer-band__admin {
  padding: 0 0 2px;
  background: none;
  border: 0;
  border-bottom: var(--m-filete-grosor) solid var(--m-filete-oscuro);
  font: inherit;
  font-size: 12px;
  letter-spacing: var(--m-tracking-nav);
  text-transform: uppercase;
  color: var(--m-piedra-clara);
  cursor: pointer;
}

.footer-band__whatsapp {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 11px 20px;
  min-height: var(--m-tactil-min);
  box-sizing: border-box;
  background: var(--m-whatsapp);
  border-radius: var(--m-radio-pildora);
  // Oscuro sobre el verde: 9,3:1. En blanco daría 2,0:1 y no pasa AA.
  color: var(--m-whatsapp-texto);
  font-size: 12px;
  letter-spacing: var(--m-tracking-nav);
  text-transform: uppercase;
  text-decoration: none;
}

@media (max-width: 699px) {
  .footer-band {
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 20px var(--m-banda-margen-movil);
    // La barra fija de móvil se superpone al final de la página: el pie le
    // reserva su alto para no quedar debajo de ella.
    padding-bottom: calc(var(--m-barra-movil-alto) + 16px);
    text-align: center;
  }
}
</style>
