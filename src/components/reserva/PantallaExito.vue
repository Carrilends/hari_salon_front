<template>
  <div class="exito" data-test="pantalla-exito">
    <div class="exito__cuerpo">
      <!-- La región viva es el envoltorio, no el título: un `role` en el
           encabezado le quitaría su papel de encabezado. El foco va al título. -->
      <div class="exito__cabeza" role="status">
        <span class="exito__sello" aria-hidden="true">
          <StrokeIcon nombre="check" :tamano="30" />
        </span>
        <h3 ref="titulo" class="exito__titulo" tabindex="-1">
          Tu cita quedó registrada
        </h3>
        <p class="exito__texto" data-test="texto-exito">{{ texto }}</p>
      </div>

      <article class="exito__resumen" data-test="resumen-exito">
        <p class="exito__dia">
          <StrokeIcon nombre="calendario" :tamano="16" />
          {{ resumen.fechaTexto }}
        </p>
        <p class="exito__franja">
          {{ resumen.franja
          }}<template v-if="resumen.estilista">
            · con {{ resumen.estilista }}</template
          >
        </p>
        <hr class="exito__filete" />
        <ul class="exito__lineas">
          <li
            v-for="linea in resumen.lineas"
            :key="linea.nombre"
            class="exito__linea"
            data-test="linea-exito"
          >
            <span
              >{{ linea.nombre
              }}<template v-if="linea.cantidad > 1">
                × {{ linea.cantidad }}</template
              ></span
            >
            <span class="exito__precio">{{ precioTexto(linea.precio) }}</span>
          </li>
        </ul>
        <p class="exito__total">
          <span class="exito__total-rotulo">Total</span>
          <span class="exito__total-valor" data-test="total-exito">{{
            precioTexto(resumen.total)
          }}</span>
        </p>
      </article>

      <a
        class="exito__whatsapp m-boton m-boton--ancho"
        data-test="avisar-whatsapp"
        :href="resumen.urlWhatsApp"
        target="_blank"
        rel="noopener"
      >
        <StrokeIcon nombre="whatsapp" :tamano="20" />
        Avisar al salón por WhatsApp
      </a>
      <p class="exito__opcional">
        Opcional: abre WhatsApp con el resumen de tu cita.
      </p>
    </div>

    <footer class="exito__pie">
      <button
        type="button"
        class="exito__seguir m-boton-plano"
        data-test="seguir-viendo"
        @click="emit('ver-servicios')"
      >
        Seguir viendo servicios
      </button>
      <button
        v-if="resumen.conSesion"
        type="button"
        class="exito__principal"
        data-test="ver-mis-reservas"
        @click="emit('ver-mis-reservas')"
      >
        Ver mis reservas
      </button>
      <button
        v-else
        type="button"
        class="exito__principal"
        data-test="cerrar-exito"
        @click="emit('cerrar')"
      >
        Cerrar
      </button>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import StrokeIcon from 'src/components/shared/StrokeIcon.vue';
import type { ResumenExito } from 'src/components/reserva/tipos';
import { precioTexto } from 'src/helpers/reserva-texto';

/**
 * El éxito dentro del cajón (B5). Es una foto fija de la reserva: la bolsa ya
 * se vació al llegar aquí, así que todo sale de `resumen`.
 *
 * WhatsApp ya no se abre solo: el botón verde es el mismo `wa.me` de antes
 * (`whatsappBooking.ts`) y la clienta decide. Es un enlace de verdad, no una
 * ventana abierta desde código: el navegador no lo trata como emergente.
 */
defineOptions({ name: 'PantallaExito' });

const props = defineProps<{ resumen: ResumenExito }>();

const emit = defineEmits<{
  (e: 'ver-servicios'): void;
  (e: 'ver-mis-reservas'): void;
  (e: 'cerrar'): void;
}>();

const titulo = ref<HTMLElement | null>(null);

const texto = computed(() => {
  const base = 'Queda pendiente hasta que el salón la confirme.';
  if (props.resumen.avisoPorWhatsApp)
    return `${base} Te avisaremos por WhatsApp.`;
  if (props.resumen.conSesion)
    return `${base} La encuentras en «Mis reservas».`;
  return base;
});

onMounted(() => {
  titulo.value?.focus();
});
</script>

<style scoped lang="scss">
/** Tablero ReservaCajonEstados, «Móvil · éxito». */
.exito {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.exito__cuerpo {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 30px 24px 24px;
}

.exito__cabeza {
  text-align: center;
}

.exito__sello {
  width: 72px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 18px;
  border-radius: 50%;
  background: var(--m-tinta);
  color: var(--m-oro);
}

.exito__titulo {
  margin: 0 0 8px;
  font-family: var(--m-font-display);
  font-size: 27px;
  font-weight: 400;
}

.exito__titulo:focus-visible {
  outline: 2px solid var(--m-tinta);
  outline-offset: 2px;
}

.exito__texto {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.6;
  color: var(--m-piedra);
}

.exito__resumen {
  margin-top: 22px;
  padding: 16px 18px;
  border: var(--m-filete-grosor) solid var(--m-filete);
  border-radius: var(--m-radio-tarjeta);
  background: var(--m-nieve);
}

.exito__dia {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 6px;
  font-family: var(--m-font-display);
  font-size: 18px;
  color: var(--m-tinta);
}

.exito__dia :deep(svg) {
  color: var(--m-oro-profundo);
}

.exito__franja {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.6;
  color: var(--m-piedra);
}

.exito__filete {
  height: 0;
  margin: 12px 0;
  border: none;
  border-top: var(--m-filete-grosor) solid var(--m-filete);
}

.exito__lineas {
  margin: 0;
  padding: 0;
  list-style: none;
}

.exito__linea {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 13.5px;
  line-height: 1.9;
}

.exito__precio {
  color: var(--m-oro-profundo);
}

.exito__total {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin: 6px 0 0;
}

.exito__total-rotulo {
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--m-piedra);
}

.exito__total-valor {
  font-family: var(--m-font-display);
  font-size: 19px;
}

.exito__whatsapp {
  min-height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: 22px;
  border-radius: var(--m-radio-pildora);
  background: var(--m-whatsapp);
  color: var(--m-whatsapp-texto);
  font-family: var(--m-font-sans);
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
}

.exito__opcional {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--m-piedra);
  text-align: center;
}

.exito__pie {
  flex-shrink: 0;
  min-height: 84px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 20px;
  border-top: var(--m-filete-grosor) solid var(--m-filete);
  background: var(--m-nieve);
}

.exito__seguir {
  min-height: var(--m-tactil-min);
  padding: 0 4px;
  border: none;
  background: transparent;
  color: var(--m-piedra);
  font-family: var(--m-font-sans);
  font-size: 13.5px;
  cursor: pointer;
}

.exito__principal {
  min-height: 48px;
  padding: 0 24px;
  border: none;
  border-radius: var(--m-radio-pildora);
  background: var(--m-tinta);
  color: var(--m-hueso);
  font-family: var(--m-font-sans);
  font-size: 12px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  cursor: pointer;
}

.exito__whatsapp:focus-visible,
.exito__seguir:focus-visible,
.exito__principal:focus-visible {
  outline: 2px solid var(--m-tinta);
  outline-offset: 2px;
}

@media (hover: hover) and (pointer: fine) {
  .exito__whatsapp:hover {
    background: var(--m-whatsapp-realce);
  }

  .exito__seguir:hover {
    color: var(--m-tinta);
  }

  .exito__principal:hover {
    color: var(--m-oro);
  }
}
</style>
