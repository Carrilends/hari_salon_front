<template>
  <q-dialog ref="dialogRef" persistent @hide="onDialogHide">
    <section
      class="borrado"
      data-test="dialogo-borrado"
      role="document"
      aria-labelledby="borrado-titulo"
    >
      <h2 id="borrado-titulo" class="borrado__titulo">Eliminar servicio</h2>
      <p class="borrado__texto">
        ¿Está seguro de que desea eliminar este servicio?
      </p>

      <article class="borrado__ficha">
        <img
          class="borrado__foto"
          :src="foto"
          alt=""
          width="56"
          height="56"
          loading="lazy"
          decoding="async"
        />
        <div class="borrado__datos">
          <p class="borrado__nombre" data-test="nombre">{{ service.name }}</p>
          <PriceDisplayPill :amount="precio" dense />
        </div>
      </article>

      <div class="borrado__acciones">
        <button
          type="button"
          class="borrado__boton"
          data-test="cancelar"
          @click="onDialogCancel"
        >
          Cancelar
        </button>
        <button
          type="button"
          class="borrado__boton borrado__boton--peligro m-boton--ancho"
          data-test="eliminar"
          :disabled="borrando"
          @click="confirmar"
        >
          Eliminar
        </button>
      </div>
    </section>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useDialogPluginComponent } from 'quasar';
import PriceDisplayPill from 'src/components/shared/PriceDisplayPill.vue';
import { PLACEHOLDER_IMAGE } from 'src/constants/placeholder-image';
// Puro a propósito: `cloudinaryHelpers` arrastra Axios y `import.meta.env`.
import { optimizeCloudinaryUrl } from 'src/helpers/cloudinaryUrl';
import { effectiveServiceUnitPrice } from 'src/helpers/service-promotion';
import { urlDeFotoPrincipal } from 'src/helpers/service-photo';
import type Service from 'src/interfaces/service';

/**
 * La confirmación de borrado, con ficha.
 *
 * El `$q.dialog` anterior preguntaba por «este servicio» sin decir cuál: con
 * dos nombres parecidos en la misma página, eso es una ruleta. Aquí se ve la
 * foto, el nombre y el precio de lo que se va a borrar.
 *
 * Quien borra de verdad es `useServiceAdminActions`: este componente solo
 * confirma, y lo hace una sola vez (el doble toque no manda dos `DELETE`).
 */
const props = defineProps<{ service: Service }>();

defineEmits([...useDialogPluginComponent.emits]);

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } =
  useDialogPluginComponent();

const borrando = ref(false);

/**
 * 56 px en pantalla, 112 pedidos: la ficha se ve nítida en pantalla densa. La
 * foto es la principal (`urlDeFotoPrincipal`), la misma que la tarjeta y la
 * ficha: la dueña confirma el borrado viendo lo que ve en la lista.
 */
const foto = computed(
  () =>
    optimizeCloudinaryUrl(urlDeFotoPrincipal(props.service), 112) ||
    PLACEHOLDER_IMAGE
);

/** El precio que ve la clienta, con la promoción aplicada si la tiene. */
const precio = computed(() => effectiveServiceUnitPrice(props.service));

function confirmar() {
  if (borrando.value) return;
  borrando.value = true;
  onDialogOK();
}

defineOptions({ name: 'ServiceDeleteDialog' });
</script>

<style lang="scss" scoped>
.borrado {
  /* Quasar quita los clics a `.q-dialog__inner` y solo los devuelve a sus
     hijos `<div>`: sin esto, cada clic atraviesa la raíz y cae en el velo. */
  pointer-events: all;
  width: min(420px, calc(100vw - 32px));
  padding: 26px 24px 20px;
  border: var(--m-filete-grosor) solid var(--m-filete);
  border-radius: var(--m-radio-panel);
  background: var(--m-hueso);
  color: var(--m-tinta);
  font-family: var(--m-font-sans);
}

.borrado__titulo {
  margin: 0 0 12px;
  font-family: var(--m-font-display);
  font-size: 1.35rem;
  font-weight: 400;
  line-height: 1.2;
}

.borrado__texto {
  margin: 0 0 18px;
  color: var(--m-piedra);
  font-size: 0.95rem;
}

.borrado__ficha {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 22px;
  padding: 10px;
  border: var(--m-filete-grosor) solid var(--m-filete);
  border-radius: var(--m-radio-tarjeta);
  background: var(--m-nieve);
}

.borrado__foto {
  width: 56px;
  height: 56px;
  flex-shrink: 0;
  border-radius: var(--m-radio-foto);
  object-fit: cover;
}

.borrado__datos {
  min-width: 0;
}

.borrado__nombre {
  margin: 0 0 4px;
  font-family: var(--m-font-display);
  font-size: 1rem;
  line-height: 1.25;
}

.borrado__acciones {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.borrado__boton {
  min-height: var(--m-tactil-min);
  padding: 0 18px;
  border: var(--m-filete-grosor) solid transparent;
  border-radius: var(--m-radio-pildora);
  background: transparent;
  color: var(--m-tinta);
  font-family: var(--m-font-sans);
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: var(--m-tracking-nav);
  cursor: pointer;
}

.borrado__boton:focus-visible {
  outline: 2px solid var(--m-oro);
  outline-offset: 2px;
}

/* D6: el único botón de la paleta que se lee como «esto no se deshace». */
.borrado__boton--peligro {
  border-color: var(--m-peligro);
  background: var(--m-peligro);
  color: var(--m-peligro-texto);
}

.borrado__boton--peligro:disabled {
  opacity: 0.6;
  cursor: progress;
}

/**
 * Realce al pasar (solo puntero fino): el COLOR. El movimiento —subir 1 px con
 * sombra suave, hundirse a 0,96 al pulsar— es global, en `app.scss`
 * («Realce y hundido»).
 */
@media (hover: hover) and (pointer: fine) {
  .borrado__boton:hover:not(:disabled) {
    border-color: var(--m-oro);
  }

  // El borrado no se aclara (no es una acción que invitar): se le enciende un
  // filete de oro alrededor. Ni el fondo ni el rótulo cambian.
  .borrado__boton--peligro:hover:not(:disabled) {
    border-color: var(--m-oro);
  }
}
</style>
