<template>
  <div
    v-if="authStore.isAdmin"
    class="acciones-admin"
    :class="{ 'acciones-admin--compacto': compacto }"
    data-test="acciones-admin"
  >
    <button
      type="button"
      class="acciones-admin__boton"
      data-test="editar"
      :aria-label="nombres.editar"
      :title="compacto ? undefined : nombres.editar"
      @click.stop="emit('editar', servicio.id)"
    >
      <StrokeIcon nombre="lapiz" :tamano="compacto ? 17 : 20" />
      <span v-if="compacto" class="acciones-admin__rotulo">Editar</span>
    </button>

    <button
      type="button"
      class="acciones-admin__boton"
      :class="{ 'acciones-admin__boton--oro': enPromocion }"
      data-test="promocion"
      :aria-label="nombres.promocion"
      :title="compacto ? undefined : nombres.promocion"
      @click.stop="emit('promocion', servicio)"
    >
      <template v-if="compacto">
        <StrokeIcon v-if="!enPromocion" nombre="etiqueta" :tamano="17" />
        <span class="acciones-admin__rotulo">{{ rotuloPromocion }}</span>
      </template>
      <template v-else>
        <span v-if="enPromocion" class="acciones-admin__pct">{{ pct }}%</span>
        <StrokeIcon v-else nombre="etiqueta" :tamano="20" />
      </template>
    </button>

    <button
      type="button"
      class="acciones-admin__boton"
      :class="{ 'acciones-admin__boton--borrar': compacto }"
      data-test="eliminar"
      :aria-label="nombres.eliminar"
      :title="compacto ? undefined : nombres.eliminar"
      @click.stop="emit('eliminar', servicio.id)"
    >
      <StrokeIcon nombre="papelera" :tamano="compacto ? 17 : 20" />
      <span v-if="compacto" class="acciones-admin__rotulo">Borrar</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import StrokeIcon from 'src/components/shared/StrokeIcon.vue';
import { useAuthStore } from 'src/stores/auth-store';
import {
  promotionPercentDisplay,
  serviceIsOnPromotion,
} from 'src/helpers/service-promotion';
import type Service from 'src/interfaces/service';

/**
 * Los tres controles de la dueña: editar, promoción y borrar.
 *
 * No dependen del `hover` (D5). En la tarjeta viven sobre el velo, que con
 * puntero grueso está siempre visible, y son de solo icono. En el renglón de
 * móvil (`compacto`) son una franja al pie de la tarjeta, con texto (plan 9,
 * V2; tablero AdminMostradorMovil). Solo emiten: quien decide qué hacer es
 * `useServiceAdminActions`.
 *
 * El guardia de `isAdmin` es cosmético —el backend protege cada endpoint con
 * `@Auth()`—, pero enseñar un botón de borrar a una clienta es un susto que no
 * pidió.
 */
const props = withDefaults(
  defineProps<{
    servicio: Service;
    /** Versión del renglón de móvil: franja de tres tercios con texto. */
    compacto?: boolean;
  }>(),
  { compacto: false }
);

const emit = defineEmits<{
  editar: [id: string];
  promocion: [servicio: Service];
  eliminar: [id: string];
}>();

const authStore = useAuthStore();

const enPromocion = computed(() => serviceIsOnPromotion(props.servicio));
const pct = computed(() => promotionPercentDisplay(props.servicio));

/** Lo que se lee en la franja con la promoción puesta o sin ella. */
const rotuloPromocion = computed(() =>
  enPromocion.value ? `${pct.value} % · Quitar` : 'Promo'
);

/**
 * Los nombres accesibles. En la tarjeta los botones son de solo icono y el
 * nombre lo dice todo. En la franja se lee un texto y el nombre tiene que
 * EMPEZAR por él (WCAG 2.5.3, «etiqueta en el nombre»): quien dicta «pulsa
 * Borrar» no encuentra un botón que se llama «Eliminar…».
 */
const nombres = computed(() => {
  const nombre = props.servicio.name;
  if (props.compacto) {
    return {
      editar: `Editar ${nombre}`,
      promocion: enPromocion.value
        ? `${pct.value} % · Quitar la promoción de ${nombre}`
        : `Promo: poner una promoción a ${nombre}`,
      eliminar: `Borrar ${nombre}`,
    };
  }
  return {
    editar: `Editar ${nombre}`,
    promocion: enPromocion.value
      ? `Quitar la promoción de ${nombre}`
      : `Poner una promoción a ${nombre}`,
    eliminar: `Eliminar ${nombre}`,
  };
});

defineOptions({ name: 'ServiceCardAdminActions' });
</script>

<style lang="scss" scoped>
/* En flujo normal: la ranura de la tarjeta (o la del renglón) ya posiciona. */
.acciones-admin {
  display: flex;
  gap: 8px;
}

.acciones-admin__boton {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--m-tactil-min);
  height: var(--m-tactil-min);
  padding: 0;
  border: var(--m-filete-grosor) solid var(--m-oro);
  border-radius: var(--m-radio-pildora);
  background: var(--m-velo-accion);
  color: var(--m-hueso);
  font-family: var(--m-font-sans);
  cursor: pointer;
}

.acciones-admin__boton:focus-visible {
  outline: 2px solid var(--m-oro);
  outline-offset: 2px;
}

/* Promoción activa: el control se rellena de oro y dice el porcentaje. */
.acciones-admin__boton--oro {
  background: var(--m-oro);
  color: var(--m-tinta);
}

.acciones-admin__pct {
  font-family: var(--m-font-display);
  font-size: 0.8125rem;
  line-height: 1;
}

/*
 * Renglón de móvil (plan 9, V2; tablero AdminMostradorMovil): una franja al pie
 * de la tarjeta, tres tercios de 44 px con icono y texto, separados por
 * filetes. Sobre el nieve del renglón (paleta A, 2026-10-11): texto tinta,
 * la promoción activa en oro macizo y «Borrar» en rosa profundo (7,2:1). El
 * peligro macizo se queda en la confirmación.
 */
.acciones-admin--compacto {
  gap: 0;
  border-top: var(--m-filete-grosor) solid var(--m-filete);
}

.acciones-admin--compacto .acciones-admin__boton {
  flex: 1 1 0;
  min-width: 0;
  width: auto;
  gap: 8px;
  padding: 0 6px;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: var(--m-tinta);
  font-size: 10.5px;
  letter-spacing: var(--m-tracking-nav);
  text-transform: uppercase;
}

.acciones-admin--compacto .acciones-admin__boton + .acciones-admin__boton {
  border-left: var(--m-filete-grosor) solid var(--m-filete);
}

/*
 * El tablero pinta la promoción activa con oro al 16 % y el texto en oro: da
 * 3,8:1 y no llega a 4,5. Oro macizo con texto tinta (5,8:1), como el mismo
 * control en la tarjeta.
 */
.acciones-admin--compacto .acciones-admin__boton--oro {
  background: var(--m-oro);
  color: var(--m-tinta);
}

/* 7,2:1 sobre nieve. El rosa sobre tinta daría 1,8:1 aquí. */
.acciones-admin--compacto .acciones-admin__boton--borrar {
  color: var(--m-rosa-profundo);
}

/* Dentro de la franja el foco va por dentro, en tinta: el borde de fuera es del renglón. */
.acciones-admin--compacto .acciones-admin__boton:focus-visible {
  outline: 2px solid var(--m-tinta);
  outline-offset: -4px;
}

/* Sobre la promoción activa, tinta también (5,8:1 sobre oro macizo). */
.acciones-admin--compacto .acciones-admin__boton--oro:focus-visible {
  outline-color: var(--m-tinta);
}

/* «100 % · Quitar» en un tercio de 320 px no cabe entero: se corta, no desborda. */
.acciones-admin__rotulo {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

/**
 * Realce al pasar (solo puntero fino): el COLOR. El movimiento —subir 1 px con
 * sombra suave, hundirse a 0,96 al pulsar— es global, en `app.scss`
 * («Realce y hundido»).
 */
@media (hover: hover) and (pointer: fine) {
  // El velo se cierra a tinta y el trazo se enciende en oro (5,8:1 sobre tinta).
  .acciones-admin__boton:hover,
  .acciones-admin--compacto .acciones-admin__boton:hover {
    background: var(--m-tinta);
    color: var(--m-oro);
  }

  // Con la promoción activa, el oro macizo se aclara.
  .acciones-admin__boton--oro:hover {
    border-color: var(--m-oro-claro);
    background: var(--m-oro-claro);
    color: var(--m-tinta);
  }

  // En la franja solo cambian fondo y texto: el filete izquierdo se queda.
  .acciones-admin--compacto .acciones-admin__boton--oro:hover {
    background: var(--m-oro-claro);
    color: var(--m-tinta);
  }

  // «Borrar» no se vuelve oro al pasar: sigue diciendo que borra. Al pasar el
  // fondo se cierra a tinta, y ahí el rosa legible es el de sobre tinta (9,0:1).
  .acciones-admin--compacto .acciones-admin__boton--borrar:hover {
    color: var(--m-peligro-sobre-tinta);
  }
}
</style>
