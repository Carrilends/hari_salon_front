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

      <div class="ficha__cuerpo">
        <p v-if="categoria" class="ficha__categoria" data-test="categoria">
          {{ categoria }}
        </p>

        <h2 class="ficha__nombre" data-test="nombre">
          {{ props.service.name }}
        </h2>

        <p class="ficha__cifras">
          <span
            v-if="duracion"
            class="ficha__duracion"
            data-test="duracion"
          >
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
      </div>
    </article>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useDialogPluginComponent } from 'quasar';
import { useDialogMaximizedBelow } from 'src/composables/dialogs/useDialogMaximizedBelow';
import { formatDurationMinutes } from 'src/helpers/duration';
import { etiquetaDeCategoria } from 'src/helpers/service-category';
import type Service from 'src/interfaces/service';

defineOptions({ name: 'serviceDialog' });

const props = defineProps<{
  service: Service;
  isFromBooking: boolean;
}>();

defineEmits([...useDialogPluginComponent.emits]);

const { dialogRef, onDialogOK, onDialogHide } = useDialogPluginComponent();
const { maximized } = useDialogMaximizedBelow(500);

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
</script>
