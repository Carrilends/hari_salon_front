<template>
  <q-dialog
    :model-value="abierta"
    class="menu-hoja-dialogo"
    position="bottom"
    aria-label="Menú"
    transition-show="slide-up"
    transition-hide="slide-down"
    @update:model-value="alCambiar"
  >
    <section class="menu-hoja" data-test="menu-hoja">
      <span class="menu-hoja__tirador" aria-hidden="true" />

      <header class="menu-hoja__cabecera">
        <h2 class="menu-hoja__titulo">Menú</h2>
        <button
          type="button"
          class="menu-hoja__cerrar m-boton-plano"
          aria-label="Cerrar el menú"
          data-test="menu-hoja-cerrar"
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
            focusable="false"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </header>

      <div class="menu-hoja__cuerpo">
        <MenuMasContenido
          :secciones="secciones"
          variante="hoja"
          :nombre="nombre"
          :correo="correo"
          :horario-hoy="horarioHoy"
          @elegir="reenviar"
        />
      </div>
    </section>
  </q-dialog>
</template>

<script setup lang="ts">
import MenuMasContenido from 'src/components/shared/MenuMasContenido.vue';
import type { EntradaMenu, SeccionMenu } from 'src/composables/shared/menuMas';

/**
 * La hoja inferior del menú «Más» por debajo de 700 px (M6, M7 de
 * `docs/superpowers/specs/2026-10-07-menu-y-acceso-design.md`). Es solo un
 * envoltorio: el contenido es `MenuMasContenido` y lo que pasa al elegir lo
 * resuelve el armazón. El velo y Escape los da `q-dialog`; la X, esta hoja.
 */
defineOptions({ name: 'MenuMasHoja' });

defineProps<{
  abierta: boolean;
  secciones: SeccionMenu[];
  nombre: string;
  correo: string;
  horarioHoy: string;
}>();

const emit = defineEmits<{
  (e: 'update:abierta', valor: boolean): void;
  (e: 'elegir', entrada: EntradaMenu): void;
}>();

function alCambiar(valor: boolean): void {
  emit('update:abierta', valor);
}

function cerrar(): void {
  emit('update:abierta', false);
}

function reenviar(entrada: EntradaMenu): void {
  emit('elegir', entrada);
}
</script>

<style scoped lang="scss">
/**
 * Tablero MenuSeccionesMovil: hoja de nieve con tirador, «Menú» en Marcellus y
 * una X de 44 px. La esquina es la del panel (`--m-radio-panel`), la misma que
 * la hoja de filtros: el tablero dibuja 16 px, que no es ningún token.
 */
.menu-hoja {
  /* Quasar quita los clics a `.q-dialog__inner` y solo los devuelve a sus
     hijos `<div>`: sin esto, cada toque atraviesa la hoja y cae en el velo. */
  pointer-events: all;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  max-height: 85vh;
  padding: 8px 12px 0;
  border-top-left-radius: var(--m-radio-panel);
  border-top-right-radius: var(--m-radio-panel);
  background: var(--m-nieve);
  color: var(--m-tinta);
  font-family: var(--m-font-sans);
}

.menu-hoja__tirador {
  flex: 0 0 auto;
  width: 36px;
  height: 4px;
  margin: 4px auto 2px;
  border-radius: var(--m-radio-pildora);
  background: var(--m-filete);
}

/// Fija: si el menú no cabe, desplaza el cuerpo y la X sigue a mano.
.menu-hoja__cabecera {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 0 0 8px;
}

.menu-hoja__titulo {
  margin: 0;
  font-family: var(--m-font-display);
  font-size: 20px;
  font-weight: 400;
  line-height: 1.2;
  color: var(--m-tinta);
}

.menu-hoja__cerrar {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--m-tactil-min);
  height: var(--m-tactil-min);
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--m-tinta);
  cursor: pointer;
}

.menu-hoja__cerrar:focus-visible {
  outline: 2px solid var(--m-oro);
  outline-offset: 2px;
}

.menu-hoja__cuerpo {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding-bottom: calc(24px + env(safe-area-inset-bottom, 0px));
}

/**
 * Realce al pasar (solo puntero fino): el COLOR. El movimiento es el global de
 * `app.scss` (`m-boton-plano`: sube sin sombra, que dibujaría una caja).
 */
@media (hover: hover) and (pointer: fine) {
  .menu-hoja__cerrar:hover {
    color: var(--m-oro-profundo);
  }
}
</style>

<!--
  Sin `scoped` a propósito: el velo lo pinta QDialog, cuyos nodos los renderiza
  Quasar sin el atributo de ámbito. La clase `menu-hoja-dialogo` viaja al div
  raíz del diálogo (QDialog mete `attrs.class` en sus clases raíz), así que la
  regla no se escapa a otro diálogo.
-->
<style lang="scss">
.menu-hoja-dialogo .q-dialog__backdrop {
  background: var(--m-velo);
}

/* Quasar solo quita el relleno lateral de 24 px a las hojas inferiores por
   debajo de 600 px; la hoja del menú sale hasta 699 px y debe ir de borde a
   borde también entre 600 y 699. */
.menu-hoja-dialogo .q-dialog__inner--bottom {
  padding-left: 0;
  padding-right: 0;
}
</style>
