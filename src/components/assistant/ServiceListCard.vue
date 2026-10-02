<template>
  <ul class="service-card">
    <li
      v-for="s in servicios"
      :key="s.id"
      class="service-card__fila"
      data-test="fila"
    >
      <img
        class="service-card__foto"
        :src="miniatura(s)"
        :srcset="miniaturaSrcset(s)"
        alt=""
        width="58"
        height="58"
        loading="lazy"
        decoding="async"
      />

      <span class="service-card__texto">
        <span class="service-card__nombre">{{ s.nombre }}</span>
        <span class="service-card__meta">
          {{ formatDurationMinutes(s.minutos) }} ·
          <span class="service-card__precio">
            ${{ formatCopDisplay(s.precio) }}
          </span>
        </span>
        <span v-if="hecho.has(s.id)" class="service-card__hecho" role="status">
          Añadido
        </span>
        <span v-if="fallo[s.id]" class="service-card__fallo" role="status">
          {{ fallo[s.id] }}
        </span>
      </span>

      <button
        type="button"
        class="service-card__anadir"
        data-test="anadir"
        :disabled="ocupado.has(s.id)"
        :aria-busy="ocupado.has(s.id) ? 'true' : undefined"
        :aria-label="`Añadir ${s.nombre}`"
        @click="anadir(s)"
      >
        <span class="service-card__rotulo">
          {{ ocupado.has(s.id) ? 'Añadiendo…' : 'Añadir' }}
        </span>
        <svg
          class="service-card__mas"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          aria-hidden="true"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { PresentedService } from 'src/api/assistant-api';
import { useAddToBag } from 'src/composables/booking/useAddToBag';
import {
  buildCloudinarySrcset,
  optimizeCloudinaryUrl,
} from 'src/helpers/cloudinaryUrl';
import { formatCopDisplay } from 'src/helpers/price-display';
import { formatDurationMinutes } from 'src/helpers/duration';
import { PLACEHOLDER_IMAGE } from 'src/constants/placeholder-image';

defineOptions({ name: 'ServiceListCard' });

defineProps<{ servicios: PresentedService[] }>();

const { añadirServicio } = useAddToBag();

/**
 * Estado **por fila**, no por tarjeta. Las tres cosas se guardan por id a
 * propósito:
 *
 * - `ocupado` frena el doble toque en LA MISMA fila, que es el que añadiría dos
 *   veces y descuadraría el contador. Entre filas distintas no hay carrera: cada
 *   una trae su servicio y `addBooking` es síncrono. Con un solo id, tocar una
 *   segunda fila mientras la primera viajaba no hacía nada —ni la añadía, ni se
 *   veía deshabilitada, ni lo decía—, y añadir dos servicios en una conexión
 *   lenta es el caso normal.
 * - `hecho` es un conjunto porque la confirmación va «en su sitio» (§5.1): con
 *   un solo id, añadir un segundo servicio borraba el «Añadido» del primero.
 */
const ocupado = ref<Set<string>>(new Set());
const hecho = ref<Set<string>>(new Set());
const fallo = ref<Record<string, string>>({});

async function anadir(servicio: PresentedService) {
  if (ocupado.value.has(servicio.id)) return;
  ocupado.value = new Set(ocupado.value).add(servicio.id);
  delete fallo.value[servicio.id];

  const resultado = await añadirServicio(servicio.id);

  const enVuelo = new Set(ocupado.value);
  enVuelo.delete(servicio.id);
  ocupado.value = enVuelo;

  if (resultado.ok) {
    hecho.value = new Set(hecho.value).add(servicio.id);
  } else {
    // Un reintento fallido no puede dejar «Añadido» y el error a la vez.
    const hechos = new Set(hecho.value);
    hechos.delete(servicio.id);
    hecho.value = hechos;
    fallo.value = { ...fallo.value, [servicio.id]: resultado.motivo };
  }
}

/**
 * La fila mide 58 px (52 en móvil): pedirle a Cloudinary el original sería
 * mandar una foto de mil píxeles para pintar cincuenta y ocho.
 * `optimizeCloudinaryUrl` y `buildCloudinarySrcset` son puras.
 */
const ANCHO_MINIATURA = 96;
const ANCHOS_SRCSET = [48, 96, 144];

function miniatura(s: PresentedService): string {
  return optimizeCloudinaryUrl(s.imagen, ANCHO_MINIATURA) || PLACEHOLDER_IMAGE;
}

function miniaturaSrcset(s: PresentedService): string {
  return buildCloudinarySrcset(s.imagen, ANCHOS_SRCSET);
}
</script>

<style scoped lang="scss">
/**
 * Diseñada para los ~340 px útiles que deja el hilo dentro del panel. Una fila
 * por servicio y nada de dos columnas: en móvil no caben.
 */
.service-card {
  display: flex;
  flex-direction: column;
  gap: 9px;
  margin: 0;
  padding: 0;
  list-style: none;
  align-self: stretch;
  // `flex: none` no es adorno. El hilo es un flex en columna con scroll: sin
  // esto, en cuanto la conversación desborda, la lista se aplasta con sus filas
  // intactas dentro del DOM. Visto en el navegador, no en las pruebas: jsdom no
  // calcula maquetación.
  flex: 0 0 auto;
}

.service-card__fila {
  display: flex;
  gap: 12px;
  align-items: center;
  background: var(--m-nieve);
  border: var(--m-filete-grosor) solid var(--m-filete);
  border-radius: var(--m-radio-tarjeta);
  padding: 10px 12px;
}

.service-card__foto {
  flex: 0 0 auto;
  width: 58px;
  height: 58px;
  object-fit: cover;
  border-radius: var(--m-radio-foto);
  background: var(--m-hueso);
}

.service-card__texto {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1 1 auto;
}

.service-card__nombre {
  font-family: var(--m-font-display);
  font-size: 15.5px;
  line-height: 1.25;
  color: var(--m-tinta);
  // Dos líneas como mucho: un nombre largo no puede empujar el botón fuera.
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  overflow-wrap: anywhere;
}

.service-card__meta {
  font-family: var(--m-font-sans);
  font-size: 12px;
  color: var(--m-piedra);
}

/// El dorado claro no es color de texto sobre nieve (2,8:1): aquí va el profundo.
.service-card__precio {
  color: var(--m-oro-profundo);
  font-weight: 500;
  white-space: nowrap;
}

.service-card__hecho {
  font-family: var(--m-font-sans);
  font-size: 11.5px;
  text-transform: uppercase;
  letter-spacing: var(--m-tracking-etiqueta);
  color: var(--m-oro-profundo);
}

.service-card__fallo {
  font-family: var(--m-font-sans);
  font-size: 11.5px;
  color: var(--m-rosa-profundo);
}

.service-card__anadir {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: var(--m-tactil-min);
  padding: 0 16px;
  border: 0;
  border-radius: var(--m-radio-pildora);
  background: var(--m-tinta);
  color: var(--m-hueso);
  font-family: var(--m-font-sans);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: var(--m-tracking-nav);
  cursor: pointer;
}

.service-card__anadir:disabled {
  opacity: 0.55;
  cursor: default;
}

.service-card__anadir:focus-visible {
  outline: 2px solid var(--m-oro);
  outline-offset: 2px;
}

// El «+» solo aparece en móvil, donde el botón es un círculo.
.service-card__mas {
  display: none;
}

@media (max-width: 699px) {
  .service-card__foto {
    width: 52px;
    height: 52px;
  }

  // Círculo de 44 px con un «+». El rótulo se va de la vista, pero el
  // `aria-label` del botón sigue nombrando el servicio.
  .service-card__anadir {
    width: var(--m-tactil-min);
    min-width: var(--m-tactil-min);
    height: var(--m-tactil-min);
    padding: 0;
    border-radius: 50%;
  }

  .service-card__rotulo {
    display: none;
  }

  .service-card__mas {
    display: block;
  }
}
</style>
