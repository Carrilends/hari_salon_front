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

      <div
        ref="galeria"
        class="ficha__galeria"
        :class="{ 'm-foto-cargando': cargando(fotoGrande) }"
        data-test="galeria"
      >
        <img
          class="ficha__foto m-foto-fundido"
          :class="{ 'm-foto-fundido--esperando': cargando(fotoGrande) }"
          data-test="foto"
          :src="fotoGrande"
          :alt="props.service.name"
          decoding="async"
          @load="alCargar"
          @error="alFallar"
        />

        <ul v-if="fotos.length > 1" class="ficha__miniaturas">
          <li v-for="(imagen, i) in fotos" :key="imagen.id ?? i">
            <button
              type="button"
              class="ficha__miniatura"
              :class="{
                'ficha__miniatura--elegida': i === elegida,
                'm-foto-cargando': cargando(miniatura(imagen.url)),
              }"
              data-test="miniatura"
              :aria-label="`Ver foto ${i + 1} de ${fotos.length}`"
              :aria-current="i === elegida ? 'true' : undefined"
              @click="elegida = i"
            >
              <img
                class="m-foto-fundido"
                :class="{
                  'm-foto-fundido--esperando': cargando(miniatura(imagen.url)),
                }"
                :src="miniatura(imagen.url)"
                alt=""
                width="56"
                height="56"
                loading="lazy"
                decoding="async"
                @load="alCargar"
                @error="alFallar"
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
              <!-- El tachado solo se ve: el lector de pantalla oye «antes». -->
              <span class="sr">antes</span>
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
            class="ficha__anadir m-boton--ancho"
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
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useDialogPluginComponent } from 'quasar';
import { useDialogMaximizedBelow } from 'src/composables/dialogs/useDialogMaximizedBelow';
import { escucharConsulta } from 'src/helpers/escuchar-consulta';
import { formatDurationMinutes } from 'src/helpers/duration';
import {
  etiquetaDeCategoria,
  etiquetasDeServicio,
} from 'src/helpers/service-category';
import { optimizeCloudinaryUrl } from 'src/helpers/cloudinaryUrl';
import { PLACEHOLDER_IMAGE } from 'src/constants/placeholder-image';
import { useCargaImagen } from 'src/composables/shared/useCargaImagen';
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
const { maximized: estrecha } = useDialogMaximizedBelow(500);
const bookStore = useBookStore();

/**
 * Teléfono tumbado o ventana bajita. La ficha es persistente (solo cierra con la
 * X o con «Cerrar»): si con 640 px de alto esos dos botones se salen de la
 * pantalla, no hay manera de salir. Por debajo de 600 px de alto se maximiza
 * aunque sobre ancho, y entonces la columna única desplaza su descripción.
 *
 * La ficha solo se abre en el cliente (la pide `$q.dialog`), pero la guarda de
 * SSG va igual: `build:ssg` evalúa el módulo sin `window`, y jsdom no siempre
 * trae `matchMedia`. El respaldo de Safari 13.1 lo pone `escucharConsulta`.
 */
const ALTO_MINIMO_FICHA_PX = 600;
const CONSULTA_ALTO = `(max-height: ${ALTO_MINIMO_FICHA_PX - 1}px)`;

const hayMatchMedia = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function';

const bajita = ref(
  hayMatchMedia() ? window.matchMedia(CONSULTA_ALTO).matches : false
);

let dejarDeEscuchar: (() => void) | null = null;

onMounted(() => {
  if (!hayMatchMedia()) return;
  const consulta = window.matchMedia(CONSULTA_ALTO);
  const sincronizar = () => {
    bajita.value = consulta.matches;
  };
  sincronizar();
  dejarDeEscuchar = escucharConsulta(consulta, sincronizar);
});

onUnmounted(() => dejarDeEscuchar?.());

const maximized = computed(() => estrecha.value || bajita.value);

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

const fotoPedida = computed(
  () =>
    optimizeCloudinaryUrl(fotos.value[elegida.value]?.url, ANCHO_FOTO) ||
    PLACEHOLDER_IMAGE
);

const miniaturaPedida = (url: string) =>
  optimizeCloudinaryUrl(url, ANCHO_MINIATURA) || PLACEHOLDER_IMAGE;

/**
 * La galería brilla mientras la foto grande no llega, y cada miniatura mientras
 * no llega la suya (ver `useCargaImagen`). El estado va por URL: elegir otra
 * miniatura vuelve a esperar la foto nueva sin reiniciar nada a mano.
 *
 * Si una foto falla (borrada en Cloudinary, sin red), se pinta el sustituto en
 * su lugar: un hueco con el texto alternativo no es una foto. El sustituto es un
 * SVG en línea, no puede fallar, así que no hay bucle.
 */
const galeria = ref<HTMLElement | null>(null);
const { cargando, fallida, alCargar, alFallar } = useCargaImagen(galeria, () =>
  [fotoPedida.value].concat(
    fotos.value.map((imagen) => miniaturaPedida(imagen.url))
  )
);

const fotoGrande = computed(() =>
  fallida(fotoPedida.value) ? PLACEHOLDER_IMAGE : fotoPedida.value
);

const miniatura = (url: string) => {
  const pedida = miniaturaPedida(url);
  return fallida(pedida) ? PLACEHOLDER_IMAGE : pedida;
};

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
 * `normalizeServiceTags` (en `src/composables/services/useServiceAdminActions.ts`)
 * los reenvía como identificadores al aplicar una promoción —un uuid no es una
 * etiqueta y no se pinta—.
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

<style scoped lang="scss">
/**
 * La ficha del servicio: 880×640 sobre el velo, foto a sangre a la izquierda y
 * la lectura a la derecha. Por debajo de 500 px de ancho o de 600 de alto el
 * diálogo va maximizado (`useDialogMaximizedBelow(500)` más la consulta de alto)
 * y la rejilla se vuelve una columna: foto arriba, pie abajo.
 *
 * El alto es `min(640px, ventana − 32px)` y no 640 fijos: entre 600 y 672 px de
 * alto la ficha flotante se encoge en vez de sacar la X y el pie de la pantalla.
 * `100vh` primero porque Safari 13.1 no sabe de `100dvh` y descarta esa segunda
 * línea; donde sí la entiende, gana, y no cuenta la barra del navegador.
 *
 * La columna de la foto es `clamp(220px, 48%, 420px)` y no 420 px fijos: entre
 * los 500 px donde el diálogo se maximiza y los 912 de la ventana que da la
 * ficha entera, 420 px de foto dejarían la lectura en 140 px. 420/880 = 48 %.
 */
.ficha {
  /* Quasar quita los clics a `.q-dialog__inner` y solo los devuelve a sus
     hijos `<div>`: sin esto, cada clic atraviesa la raíz y cae en el velo. */
  pointer-events: all;
  position: relative;
  display: grid;
  grid-template-columns: clamp(220px, 48%, 420px) minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr) auto;
  grid-template-areas:
    'foto cuerpo'
    'foto pie';
  width: 880px;
  max-width: 100%;
  height: min(640px, calc(100vh - 32px));
  height: min(640px, calc(100dvh - 32px));
  overflow: hidden;
  background: var(--m-carbon);
  border: var(--m-filete-grosor) solid var(--m-oro);
  border-radius: var(--m-radio-panel);
  font-family: var(--m-font-sans);
  color: var(--m-hueso);
}

/* --- La columna de la foto ------------------------------------------------ */

/*
 * La foto grande y las miniaturas se ven enteras (`contain`), centradas, y lo
 * que sobra de su marco es carbón: recortadas, la miniatura de un retrato no
 * se distinguía de otra.
 */
.ficha__galeria {
  grid-area: foto;
  position: relative;
  min-width: 0;
  background: var(--m-carbon);
}

.ficha__foto {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center;
}

.ficha__miniaturas {
  position: absolute;
  top: 12px;
  left: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.ficha__miniatura {
  // Ancla el brillo de carga (`.m-foto-cargando::before`, en `app.scss`).
  position: relative;
  display: block;
  width: 56px;
  height: 56px;
  padding: 0;
  overflow: hidden;
  cursor: pointer;
  background: var(--m-carbon);
  border: var(--m-filete-grosor) solid var(--m-filete-oscuro);
  border-radius: var(--m-radio-foto);
}

.ficha__miniatura--elegida {
  border-color: var(--m-oro);
}

.ficha__miniatura img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center;
}

.ficha__miniatura:focus-visible {
  outline: 2px solid var(--m-oro);
  outline-offset: 2px;
}

/* --- La X de la esquina --------------------------------------------------- */

.ficha__cerrar {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--m-tactil-min);
  height: var(--m-tactil-min);
  padding: 0;
  cursor: pointer;
  color: var(--m-hueso);
  background: var(--m-tinta);
  border: var(--m-filete-grosor) solid var(--m-filete-oscuro);
  border-radius: var(--m-radio-pildora);
}

.ficha__cerrar:focus-visible {
  outline: 2px solid var(--m-oro);
  outline-offset: 2px;
}

/* --- La columna de la lectura -------------------------------------------- */

.ficha__cuerpo {
  grid-area: cuerpo;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
  padding: 28px 28px 14px;
  overflow: hidden;
}

.ficha__categoria {
  margin: 0;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: var(--m-tracking-etiqueta);
  color: var(--m-oro);
}

.ficha__nombre {
  margin: 0;
  font-family: var(--m-font-display);
  font-size: 28px;
  font-weight: 400;
  line-height: 1.15;
  color: var(--m-hueso);
  overflow-wrap: anywhere;
}

.ficha__cifras {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 10px;
  margin: 0;
}

.ficha__precio {
  font-family: var(--m-font-display);
  font-size: 26px;
  font-variant-numeric: tabular-nums;
  color: var(--m-oro);
}

.ficha__precio-base {
  font-size: 14px;
  color: var(--m-piedra-clara);
  text-decoration: line-through;
}

/* Píldora de filete, no de relleno: el oro macizo es del botón de añadir y dos
   bloques dorados en la misma pantalla se pelean. */
.ficha__promo {
  padding: 2px 10px;
  font-size: 11px;
  letter-spacing: var(--m-tracking-nav);
  color: var(--m-oro);
  border: var(--m-filete-grosor) solid var(--m-oro);
  border-radius: var(--m-radio-pildora);
}

.ficha__duracion {
  margin-left: auto;
  font-size: 13px;
  color: var(--m-piedra-clara);
}

.ficha__filete {
  flex: 0 0 auto;
  width: 100%;
  height: 0;
  margin: 4px 0;
  border: 0;
  border-top: var(--m-filete-grosor) solid var(--m-filete-oscuro);
}

.ficha__rotulo {
  margin: 0;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: var(--m-tracking-etiqueta);
  color: var(--m-piedra-clara);
}

/**
 * Riel propio, dorado y de 6 px: la descripción es lo único que desplaza dentro
 * de la ficha. `--m-riel-canal` lo añade la fase A; mientras no esté, cae en
 * `--m-carbon`, que es el mismo valor, así que esta fase no espera a la A.
 */
.ficha__descripcion {
  flex: 1 1 auto;
  min-height: 0;
  padding-right: 10px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--m-oro) var(--m-riel-canal, var(--m-carbon));

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: var(--m-riel-canal, var(--m-carbon));
    border-radius: var(--m-radio-pildora);
  }

  &::-webkit-scrollbar-thumb {
    background: var(--m-oro);
    border-radius: var(--m-radio-pildora);
  }
}

.ficha__descripcion:focus-visible {
  outline: 2px solid var(--m-oro);
  outline-offset: 2px;
}

.ficha__texto {
  margin: 0;
  font-size: 15px;
  line-height: 1.65;
  color: var(--m-piedra-clara);
  // La descripción del sembrado trae saltos de línea a propósito.
  white-space: pre-wrap;
}

.ficha__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.ficha__tag {
  padding: 4px 10px;
  font-size: 11.5px;
  color: var(--m-hueso);
  border: var(--m-filete-grosor) solid var(--m-filete-oscuro);
  border-radius: var(--m-radio-pildora);
}

.ficha__rostros {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 13px;
  color: var(--m-piedra-clara);
}

/* --- El pie -------------------------------------------------------------- */

.ficha__pie {
  grid-area: pie;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px 28px 22px;
  border-top: var(--m-filete-grosor) solid var(--m-filete-oscuro);
}

.ficha__resumen {
  margin: 0;
  font-size: 13px;
  color: var(--m-piedra-clara);
}

.ficha__botones {
  display: flex;
  gap: 12px;
}

.ficha__anadir,
.ficha__cerrar-pie {
  height: 52px;
  cursor: pointer;
  font-family: var(--m-font-sans);
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: var(--m-tracking-nav);
  border-radius: var(--m-radio-pildora);
}

.ficha__anadir {
  flex: 1 1 auto;
  color: var(--m-tinta);
  background: var(--m-oro);
  border: 0;
}

.ficha__cerrar-pie {
  flex: 0 0 auto;
  min-width: 120px;
  color: var(--m-hueso);
  background: transparent;
  border: var(--m-filete-grosor) solid var(--m-filete-oscuro);
}

.ficha__anadir:focus-visible,
.ficha__cerrar-pie:focus-visible {
  outline: 2px solid var(--m-oro);
  outline-offset: 2px;
}

/* --- Pantalla completa por debajo de 500 px ------------------------------- */

.ficha--amplia {
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: auto minmax(0, 1fr) auto;
  grid-template-areas:
    'foto'
    'cuerpo'
    'pie';
  width: 100%;
  height: 100%;
  border: 0;
  border-radius: 0;

  // 240 px en un teléfono de pie; tumbado (390 px de alto) la foto cede hasta
  // un tercio de la ventana para que el nombre y el precio sigan a la vista.
  .ficha__galeria {
    height: min(240px, 34vh);
  }

  // Sobre una foto de 240 px la tira cabe mejor tumbada.
  .ficha__miniaturas {
    flex-direction: row;
  }

  .ficha__cuerpo {
    padding: 18px var(--m-banda-margen-movil) 10px;
  }

  .ficha__pie {
    padding: 12px var(--m-banda-margen-movil) 18px;
  }

  .ficha__nombre {
    font-size: 23px;
  }

  .ficha__precio {
    font-size: 22px;
  }
}

/**
 * Realce al pasar (solo puntero fino): el COLOR. El movimiento —subir 1 px con
 * sombra suave, hundirse a 0,96 al pulsar— es global, en `app.scss`
 * («Realce y hundido»).
 */
@media (hover: hover) and (pointer: fine) {
  .ficha__cerrar:hover {
    border-color: var(--m-oro);
    color: var(--m-oro);
  }

  .ficha__miniatura:hover {
    border-color: var(--m-oro);
  }

  .ficha__miniatura--elegida:hover {
    border-color: var(--m-oro-claro);
  }

  .ficha__anadir:hover {
    background: var(--m-oro-claro);
  }

  .ficha__cerrar-pie:hover {
    border-color: var(--m-oro);
  }
}
</style>

<style lang="scss">
/**
 * Fuera de `scoped` a propósito: el velo y el ancho los pinta QDialog, cuyos
 * nodos (`.q-dialog__backdrop`, `.q-dialog__inner`) los renderiza Quasar y no
 * llevan el atributo de ámbito de este componente, así que ninguna regla
 * `scoped` los alcanzaría. La clase `ficha-servicio` viaja al div raíz del
 * diálogo —QDialog mete `attrs.class` en sus `rootClasses`—, de modo que estas
 * dos reglas no se escapan a ningún otro diálogo del portal.
 */
.ficha-servicio .q-dialog__backdrop {
  background: var(--m-velo);
}

/**
 * Quasar limita el contenido minimizado a 560 px con `.q-dialog__inner--minimized
 * > div`, que gana en especificidad a cualquier regla con ámbito: la ficha mide
 * 880. El `min()` es lo que evita que se desborde en una ventana estrecha.
 */
.ficha-servicio .q-dialog__inner--minimized > div {
  max-width: min(880px, 100%);
}
</style>
