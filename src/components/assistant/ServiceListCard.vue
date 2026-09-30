<template>
  <q-card flat bordered class="service-list-card">
    <q-list dense>
      <q-item
        v-for="s in servicios"
        :key="s.id"
        clickable
        class="service-list-card__row"
        @click="emit('select', s)"
      >
        <q-item-section avatar class="service-list-card__thumb">
          <q-img
            :src="miniatura(s)"
            :srcset="miniaturaSrcset(s)"
            :placeholder-src="PLACEHOLDER_IMAGE"
            :alt="s.nombre"
            width="44px"
            height="44px"
            fit="cover"
            no-spinner
            class="service-list-card__img"
          />
        </q-item-section>

        <q-item-section>
          <div class="service-list-card__name">{{ s.nombre }}</div>
          <div class="service-list-card__meta">
            {{ formatDurationMinutes(s.minutos) }}
          </div>
        </q-item-section>

        <q-item-section side class="service-list-card__price">
          ${{ formatCopDisplay(s.precio) }}
        </q-item-section>
      </q-item>
    </q-list>

    <q-card-section class="service-list-card__hint">
      Toca un servicio para seguir por el chat.
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import type { PresentedService } from 'src/api/assistant-api';
import {
  buildCloudinarySrcset,
  optimizeCloudinaryUrl,
} from 'src/helpers/cloudinaryUrl';
import { formatCopDisplay } from 'src/helpers/price-display';
import { formatDurationMinutes } from 'src/helpers/duration';
import { PLACEHOLDER_IMAGE } from 'src/constants/placeholder-image';

defineOptions({ name: 'ServiceListCard' });

defineProps<{ servicios: PresentedService[] }>();
const emit = defineEmits<{ (e: 'select', servicio: PresentedService): void }>();

/**
 * El panel mide `min(92vw, 380px)` y la miniatura 44: pedirle a Cloudinary el
 * original sería mandar una foto de mil píxeles para pintar cuarenta y cuatro.
 * `optimizeCloudinaryUrl` y `buildCloudinarySrcset` ya existían y son puras.
 */
const ANCHO_MINIATURA = 96;
const ANCHOS_SRCSET = [48, 96, 144];

// El mismo marcador se usa como `placeholder-src`: sin él, y sin ruedecita
// (la tarjeta lleva ocho, ocho ruedecitas serían un estruendo), una miniatura
// que aún viaja por la red deja un hueco blanco que parece un fallo.

function miniatura(s: PresentedService): string {
  return optimizeCloudinaryUrl(s.imagen, ANCHO_MINIATURA) || PLACEHOLDER_IMAGE;
}

function miniaturaSrcset(s: PresentedService): string {
  return buildCloudinarySrcset(s.imagen, ANCHOS_SRCSET);
}
</script>

<style scoped lang="scss">
/**
 * Diseñada para 270 px útiles desde el principio, que es lo que queda de la
 * burbuja dentro del panel. Una fila por servicio y nada de dos columnas: en
 * móvil no caben.
 */
.service-list-card {
  align-self: flex-start;
  max-width: 90%;
  border-radius: 12px;
  overflow: hidden;
  // `flex: none` no es adorno. El hilo es un flex en columna con scroll, y
  // `overflow: hidden` —que está aquí para recortar las esquinas redondeadas—
  // anula el `min-height: auto` que impide a un hijo de flex encogerse por
  // debajo de su contenido. Sin esto, en cuanto la conversación desborda, la
  // tarjeta se aplasta a una línea gris de tres píxeles con sus siete filas
  // intactas dentro del DOM. Visto en el navegador, no en las pruebas: jsdom no
  // calcula maquetación.
  flex: 0 0 auto;
}

.service-list-card__row {
  min-height: 56px;
  padding: 6px 10px;
}

.service-list-card__thumb {
  min-width: 44px;
  padding-right: 10px;
}

.service-list-card__img {
  border-radius: 8px;
}

.service-list-card__name {
  font-size: 0.86rem;
  line-height: 1.2;
  font-weight: 600;
  color: #22282f;
  // Dos líneas como mucho: un nombre largo no puede empujar el precio fuera.
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.service-list-card__meta {
  font-size: 0.72rem;
  color: #78838d;
}

.service-list-card__price {
  font-size: 0.82rem;
  font-weight: 600;
  color: #22282f;
  white-space: nowrap;
}

.service-list-card__hint {
  padding: 4px 10px 8px;
  font-size: 0.68rem;
  color: #8a949d;
}
</style>
