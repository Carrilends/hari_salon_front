<template>
  <q-dialog
    ref="dialogRef"
    class="ficha-servicio"
    :aria-label="`Ficha de ${props.service.name}`"
    :persistent="!props.isFromBooking"
    :maximized="maximized"
    :transition-show="maximized ? 'slide-up' : 'scale'"
    :transition-hide="maximized ? 'slide-down' : 'scale'"
    @hide="onDialogHide"
  >
    <article
      class="ficha"
      :class="{ 'ficha--amplia': maximized }"
      data-test="ficha"
    >
      <button
        type="button"
        class="ficha__cerrar"
        data-test="cerrar"
        aria-label="Cerrar la ficha del servicio"
        @click="cerrar"
      >
        <svg
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

      <div class="ficha__galeria" data-test="galeria">
        <img
          class="ficha__foto"
          data-test="foto"
          :src="fotoGrande"
          :alt="props.service.name"
          decoding="async"
        />

        <ul v-if="fotos.length > 1" class="ficha__miniaturas">
          <li v-for="(imagen, i) in fotos" :key="imagen.id ?? i">
            <button
              type="button"
              class="ficha__miniatura"
              :class="{ 'ficha__miniatura--elegida': i === elegida }"
              data-test="miniatura"
              :aria-label="`Ver foto ${i + 1} de ${fotos.length}`"
              :aria-current="i === elegida ? 'true' : undefined"
              @click="elegida = i"
            >
              <img
                :src="miniatura(imagen.url)"
                alt=""
                width="56"
                height="56"
                loading="lazy"
                decoding="async"
              />
            </button>
          </li>
        </ul>
      </div>

      <div class="ficha__cuerpo">
        <p v-if="categoria" class="ficha__categoria" data-test="categoria">
          {{ categoria }}
        </p>

        <h2 class="ficha__nombre" data-test="nombre">
          {{ props.service.name }}
        </h2>

        <p class="ficha__cifras">
          <span class="ficha__precio" data-test="precio">${{ precio }}</span>
          <template v-if="enPromocion">
            <span class="ficha__precio-base" data-test="precio-base">
              ${{ precioBase }}
            </span>
            <span class="ficha__promo" data-test="promo-pildora">
              -{{ descuento }} %
            </span>
          </template>
          <span v-if="duracion" class="ficha__duracion" data-test="duracion">
            {{ duracion }}
          </span>
        </p>

        <hr class="ficha__filete" />

        <p class="ficha__rotulo">Descripción</p>
        <!--
          `tabindex="0"` para que quien navega con teclado pueda desplazar la
          descripción: es el único panel con scroll de la ficha.
        -->
        <div class="ficha__descripcion" data-test="descripcion" tabindex="0">
          <p class="ficha__texto">{{ descripcion }}</p>
        </div>

        <ul v-if="chips.length" class="ficha__tags" data-test="tags">
          <li
            v-for="chip in chips"
            :key="chip"
            class="ficha__tag"
            data-test="tag"
          >
            {{ chip }}
          </li>
        </ul>

        <p v-if="rostros.length" class="ficha__rostros" data-test="rostros">
          <StrokeIcon nombre="rostro" :tamano="18" />
          <span>Favorece a rostros: {{ rostros.join(' · ') }}</span>
        </p>
      </div>
      <footer
        v-if="!props.isFromBooking"
        class="ficha__pie"
        data-test="pie-acciones"
      >
        <p
          class="ficha__resumen"
          data-test="resumen-bolsa"
          role="status"
          aria-live="polite"
        >
          {{ resumenBolsa }}
        </p>
        <div class="ficha__botones">
          <button
            type="button"
            class="ficha__anadir"
            data-test="anadir-reserva"
            @click="anadir"
          >
            Añadir a la reserva
          </button>
          <button
            type="button"
            class="ficha__cerrar-pie"
            data-test="cerrar-pie"
            @click="cerrar"
          >
            Cerrar
          </button>
        </div>
      </footer>
    </article>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useDialogPluginComponent } from 'quasar';
import { useDialogMaximizedBelow } from 'src/composables/dialogs/useDialogMaximizedBelow';
import { formatDurationMinutes } from 'src/helpers/duration';
import {
  etiquetaDeCategoria,
  etiquetasDeServicio,
} from 'src/helpers/service-category';
import { optimizeCloudinaryUrl } from 'src/helpers/cloudinaryUrl';
import { PLACEHOLDER_IMAGE } from 'src/constants/placeholder-image';
import { formatCopDisplay } from 'src/helpers/price-display';
import {
  effectiveServiceUnitPrice,
  promotionPercentDisplay,
  serviceIsOnPromotion,
} from 'src/helpers/service-promotion';
import { useBookStore } from 'src/stores/book-store';
import StrokeIcon from 'src/components/shared/StrokeIcon.vue';
import type { faceTypes } from 'src/interfaces/service';
import type Service from 'src/interfaces/service';
import type { Image } from 'src/interfaces/service';

defineOptions({ name: 'serviceDialog' });

const props = defineProps<{
  service: Service;
  isFromBooking: boolean;
}>();

defineEmits([...useDialogPluginComponent.emits]);

const { dialogRef, onDialogOK, onDialogHide } = useDialogPluginComponent();
const { maximized } = useDialogMaximizedBelow(500);
const bookStore = useBookStore();

/**
 * `'cancel'` es el contrato con `useService.ts`: es lo que limpia `serviceIdRef`
 * y el servicio del store. Sin esto, volver a tocar el MISMO servicio de la
 * lista no abriría nada, porque la clave de la query no cambia y el `watch` no
 * se vuelve a disparar. Desde `bookingDialog.vue` el payload se ignora.
 */
const cerrar = () => onDialogOK('cancel');

/**
 * La categoría tiene **una sola fuente** en todo el portal (hoja de ruta §8.1):
 * `etiquetaDeCategoria`, de la fase B. Recibe el servicio entero y resuelve la
 * cadena entera —traducir
 * `service.type`, que el sembrado escribe en claves como `hair-men`; si viene
 * vacío o no se reconoce, la primera etiqueta utilizable; si tampoco hay, cadena
 * vacía—. Aquí no se calcula nada: calcularlo otra vez es justo lo que hacía que
 * la ficha rotulara «hair-men» donde la tarjeta rotula «Barbería».
 *
 * Lo único que decide la ficha es que, con la cadena vacía, la línea no se pinta.
 */
const categoria = computed(() => etiquetaDeCategoria(props.service));

const duracion = computed(() => {
  const minutos = Number(props.service.duration || 0);
  return Number.isFinite(minutos) && minutos > 0
    ? formatDurationMinutes(minutos)
    : '';
});

const descripcion = computed(
  () => props.service.detail?.description?.trim() || 'Sin descripción.'
);

/**
 * El carrusel de Quasar se fue (decisión D8): el aspecto aprobado cambia de foto
 * con la tira de miniaturas, así que de él solo quedaba la maquinaria de
 * diapositivas para hacer un fundido — y a cambio arrastraba cuarenta y cinco
 * líneas de `:deep(...)` peleando con sus tripas.
 */
const SUSTITUTO: Image = {
  id: 'sustituto',
  url: PLACEHOLDER_IMAGE,
  isPrincipal: true,
  publicId: '',
  version: '',
};

/** La columna mide 420 px y la miniatura 56: el doble, para pantallas densas. */
const ANCHO_FOTO = 840;
const ANCHO_MINIATURA = 112;

/**
 * La galería abre en la foto principal, como la tarjeta, la fila y la bolsa
 * (`urlDeFotoPrincipal`): la principal va primera; sin marca, el orden dado.
 */
const fotos = computed<Image[]>(() => {
  const imagenes = props.service.images ?? [];
  if (!imagenes.length) return [SUSTITUTO];
  const principal = imagenes.find((imagen) => imagen.isPrincipal);
  return principal
    ? [principal].concat(imagenes.filter((imagen) => imagen !== principal))
    : imagenes;
});

const elegida = ref(0);

const fotoGrande = computed(
  () =>
    optimizeCloudinaryUrl(fotos.value[elegida.value]?.url, ANCHO_FOTO) ||
    PLACEHOLDER_IMAGE
);

const miniatura = (url: string) =>
  optimizeCloudinaryUrl(url, ANCHO_MINIATURA) || PLACEHOLDER_IMAGE;

/**
 * D3: la cifra grande es el precio que de verdad se va a cobrar. `price` llega
 * como cadena desde Postgres (`numeric`), así que ni una operación aritmética
 * fuera de los ayudantes, que ya hacen `Number(...)`.
 *
 * No se usa `PriceDisplayPill`: esa píldora es blanca y escarchada para posarse
 * sobre una foto, y la ficha quiere Marcellus en oro sobre carbón. Depender
 * además de la `amountBase` que la fase B le va a añadir dejaría esta fase sin
 * poder correr en paralelo.
 */
const enPromocion = computed(() => serviceIsOnPromotion(props.service));

const precio = computed(() =>
  formatCopDisplay(effectiveServiceUnitPrice(props.service))
);

const precioBase = computed(() =>
  formatCopDisplay(Number(props.service.price || 0))
);

const descuento = computed(() => promotionPercentDisplay(props.service));

/**
 * Añade, **no** reserva: el único «Reservar» del portal es el de la cabecera.
 * Por eso no toca `bookStore.showDialog` y la ficha se queda abierta — el
 * resumen de aquí abajo es la confirmación de que el servicio entró en la bolsa.
 */
const anadir = () => bookStore.addBooking(props.service);

/**
 * Sale del store, no de las props: la bolsa puede traer servicios que esta ficha
 * no conoce, y el total es el de la reserva entera.
 */
const resumenBolsa = computed(() => {
  const cantidad = bookStore.totalBookingQuantity;
  if (cantidad === 0) return 'Tu reserva está vacía.';

  const partes = [cantidad === 1 ? '1 servicio' : `${cantidad} servicios`];
  // Una bolsa sin duración no dice «0 min»: eso es un dato que falta.
  if (bookStore.bookingsDuration > 0) {
    partes.push(formatDurationMinutes(bookStore.bookingsDuration));
  }
  partes.push(`$${formatCopDisplay(bookStore.bookingsCost)}`);

  return `En tu reserva: ${partes.join(' · ')}`;
});

/**
 * Las etiquetas también salen del ayudante de la fase B, no de aquí: es él quien
 * sabe que `tags` llega del API como objetos con `name` (`leftJoinAndSelect`)
 * aunque la interfaz del front los tenga tipados como `string[]`, y que
 * `normalizeServiceTags` de `ServicePage.vue` los reenvía como identificadores
 * al aplicar una promoción —un uuid no es una etiqueta y no se pinta—.
 *
 * Tiene que ser el mismo criterio que usa `etiquetaDeCategoria` para elegir su
 * respaldo, porque es lo que hace que la comparación de abajo descarte de verdad
 * el chip que ya se está diciendo arriba. Con una copia local, bastaba una coma
 * de diferencia para que la etiqueta saliera dos veces.
 */
const etiquetas = computed(() => etiquetasDeServicio(props.service));

/**
 * Lo que ya se dice arriba como categoría no se repite abajo como chip. Cuando
 * la categoría es un `type` traducido («Barbería»), no coincide con ninguna
 * etiqueta y no se descarta nada; cuando el ayudante cayó en el respaldo, se
 * descarta esa.
 */
const chips = computed(() =>
  etiquetas.value.filter((etiqueta) => etiqueta !== categoria.value)
);

/**
 * El mapa de siempre, sin los iconos de Material que traía al lado: el portal
 * solo carga la variante rellena y desentonaban con el resto, que es todo trazo
 * fino. En el sembrado este campo viene vacío, así que la línea no sale casi
 * nunca — y cuando no hay dato, no se pinta.
 */
const NOMBRE_ROSTRO: Record<faceTypes, string> = {
  Oval: 'Ovalado',
  Round: 'Redondo',
  Diamond: 'Diamante',
  Square: 'Cuadrado',
  Heart: 'Corazón',
  Long: 'Largo',
};

const rostros = computed<string[]>(() =>
  (props.service.detail?.specifications?.faceTypes ?? []).map(
    (tipo) => NOMBRE_ROSTRO[tipo] ?? tipo
  )
);
</script>
