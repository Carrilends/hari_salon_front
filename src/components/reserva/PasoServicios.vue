<template>
  <div class="bolsa" data-test="paso-servicios">
    <template v-if="lineas.length">
      <h3 class="cajon-etiqueta">
        En tu bolsa · {{ cantidadDeServicios(cantidad) }}
      </h3>
      <ul class="bolsa__lista">
        <li
          v-for="linea in lineas"
          :key="linea.service.id"
          class="bolsa__linea"
          data-test="linea-bolsa"
        >
          <img
            class="bolsa__foto"
            loading="lazy"
            decoding="async"
            :src="fotoDe(linea)"
            alt=""
            width="64"
            height="64"
          />
          <div class="bolsa__datos">
            <p
              v-if="etiquetaDeCategoria(linea.service)"
              class="bolsa__categoria"
            >
              {{ etiquetaDeCategoria(linea.service) }}
            </p>
            <p class="bolsa__nombre">
              {{ linea.service.name
              }}<span
                v-if="linea.quantity > 1"
                class="bolsa__cantidad"
                data-test="cantidad-linea"
                >× {{ linea.quantity }}</span
              >
            </p>
            <p class="bolsa__precio">
              <span class="bolsa__importe">{{
                precioTexto(subtotal(linea))
              }}</span>
              ·
              {{
                formatDurationMinutes(linea.service.duration * linea.quantity)
              }}
            </p>
          </div>
          <button
            type="button"
            class="bolsa__quitar"
            data-test="quitar-servicio"
            :aria-label="`Quitar ${linea.service.name}`"
            @click="emit('quitar', linea.service.id)"
          >
            <StrokeIcon nombre="papelera" :tamano="19" />
          </button>
        </li>
      </ul>
      <button
        type="button"
        class="bolsa__anadir"
        data-test="anadir-servicios"
        @click="emit('ver-servicios')"
      >
        <StrokeIcon nombre="mas" :tamano="16" />
        <span class="bolsa__subrayado">Añadir más servicios</span>
      </button>
      <p class="bolsa__pista">
        Después eliges el día, la estilista y la hora. Tu cita queda registrada
        al confirmar.
      </p>
    </template>

    <div v-else class="bolsa__vacia" data-test="bolsa-vacia">
      <span class="bolsa__icono" aria-hidden="true">
        <StrokeIcon nombre="bolsa" :tamano="30" />
      </span>
      <h3 class="bolsa__titulo">Tu bolsa está vacía</h3>
      <p class="bolsa__texto">
        Añade uno o varios servicios y después eliges el día, la estilista y la
        hora.
      </p>
      <button
        type="button"
        class="bolsa__ver m-boton--ancho"
        data-test="ver-servicios"
        @click="emit('ver-servicios')"
      >
        Ver servicios
      </button>
      <button
        type="button"
        class="bolsa__asistente"
        data-test="abrir-asistente"
        @click="emit('abrir-asistente')"
      >
        <span class="bolsa__subrayado">
          Pedirle una recomendación al asistente →
        </span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import StrokeIcon from 'src/components/shared/StrokeIcon.vue';
import { PLACEHOLDER_IMAGE } from 'src/constants/placeholder-image';
// Puro a propósito: `cloudinaryHelpers` arrastra Axios y `import.meta.env`.
import { optimizeCloudinaryUrl } from 'src/helpers/cloudinaryUrl';
import { urlDeFotoPrincipal } from 'src/helpers/service-photo';
import { etiquetaDeCategoria } from 'src/helpers/service-category';
import { effectiveServiceUnitPrice } from 'src/helpers/service-promotion';
import { formatDurationMinutes } from 'src/helpers/duration';
import { cantidadDeServicios, precioTexto } from 'src/helpers/reserva-texto';
import type { BookingLine } from 'src/interfaces/booking';

/**
 * Paso 1 del cajón: la bolsa (B2) y su estado vacío (B6). Presentacional: la
 * bolsa la cambia quien escucha `quitar` (el cajón, sobre `book-store`).
 */
defineOptions({ name: 'PasoServicios' });

const props = defineProps<{ lineas: BookingLine[] }>();

const emit = defineEmits<{
  (e: 'quitar', serviceId: string): void;
  (e: 'ver-servicios'): void;
  (e: 'abrir-asistente'): void;
}>();

const cantidad = computed(() =>
  props.lineas.reduce((total, linea) => total + linea.quantity, 0)
);

/** 64 px en pantalla, 128 pedidos: nítida en pantalla densa. */
const fotoDe = (linea: BookingLine) =>
  optimizeCloudinaryUrl(urlDeFotoPrincipal(linea.service), 128) ||
  PLACEHOLDER_IMAGE;

/** El precio que paga: con la promoción aplicada, por la cantidad. */
const subtotal = (linea: BookingLine) =>
  effectiveServiceUnitPrice(linea.service) * linea.quantity;
</script>

<style scoped lang="scss">
/** Tablero ReservaCajonPasos, móvil 1; ReservaCajonEstados, bolsa vacía. */
.bolsa__lista {
  margin: 0;
  padding: 0;
  list-style: none;
}

.bolsa__linea {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 0;
  border-bottom: var(--m-filete-grosor) solid var(--m-filete);
}

.bolsa__foto {
  flex-shrink: 0;
  width: 64px;
  height: 64px;
  border-radius: var(--m-radio-tarjeta);
  object-fit: cover;
  background: var(--m-esqueleto);
}

.bolsa__datos {
  flex: 1 1 auto;
  min-width: 0;
}

.bolsa__categoria {
  margin: 0;
  font-size: 10px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--m-piedra);
}

.bolsa__nombre {
  margin: 2px 0 4px;
  font-family: var(--m-font-display);
  font-size: 18px;
  line-height: 1.2;
}

.bolsa__cantidad {
  margin-left: 6px;
  font-family: var(--m-font-sans);
  font-size: 13px;
  color: var(--m-piedra);
}

.bolsa__precio {
  margin: 0;
  font-size: 13px;
  color: var(--m-piedra);
}

.bolsa__importe {
  font-weight: 500;
  color: var(--m-oro-profundo);
}

.bolsa__quitar {
  flex-shrink: 0;
  width: var(--m-tactil-min);
  height: var(--m-tactil-min);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  border-radius: var(--m-radio-pildora);
  background: transparent;
  color: var(--m-piedra);
  cursor: pointer;
}

/* Enlace sobre fondo claro: rosa profundo, subrayado con filete rosa. */
.bolsa__anadir {
  min-height: 48px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--m-rosa-profundo);
  font-family: var(--m-font-sans);
  font-size: 14px;
  cursor: pointer;
}

.bolsa__subrayado {
  border-bottom: var(--m-filete-grosor) solid var(--m-filete-rosa);
}

.bolsa__pista {
  margin: 18px 0 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--m-piedra);
}

.bolsa__vacia {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0 8px;
  text-align: center;
}

.bolsa__icono {
  width: 76px;
  height: 76px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 22px;
  border: var(--m-filete-grosor) solid var(--m-oro);
  border-radius: 50%;
  color: var(--m-oro-profundo);
}

.bolsa__titulo {
  margin: 0 0 10px;
  font-family: var(--m-font-display);
  font-size: 26px;
  font-weight: 400;
}

.bolsa__texto {
  margin: 0 0 26px;
  font-size: 14px;
  line-height: 1.65;
  color: var(--m-piedra);
}

.bolsa__ver {
  min-height: 48px;
  border: var(--m-filete-grosor) solid var(--m-tinta);
  border-radius: var(--m-radio-pildora);
  background: transparent;
  color: var(--m-tinta);
  font-family: var(--m-font-sans);
  font-size: 12px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  cursor: pointer;
}

.bolsa__asistente {
  min-height: var(--m-tactil-min);
  margin-top: 12px;
  border: none;
  background: transparent;
  color: var(--m-rosa-profundo);
  font-family: var(--m-font-sans);
  font-size: 13.5px;
  cursor: pointer;
}

.bolsa__quitar:focus-visible,
.bolsa__anadir:focus-visible,
.bolsa__ver:focus-visible,
.bolsa__asistente:focus-visible {
  outline: 2px solid var(--m-tinta);
  outline-offset: 2px;
}

@media (hover: hover) and (pointer: fine) {
  .bolsa__quitar:hover {
    color: var(--m-rosa-profundo);
  }

  .bolsa__anadir:hover,
  .bolsa__asistente:hover {
    color: var(--m-tinta);
  }

  .bolsa__ver:hover {
    border-color: var(--m-oro-profundo);
  }
}
</style>
