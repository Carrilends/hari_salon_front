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
      :aria-label="`Editar ${servicio.name}`"
      :title="`Editar ${servicio.name}`"
      @click.stop="emit('editar', servicio.id)"
    >
      <StrokeIcon nombre="lapiz" :tamano="20" />
    </button>

    <button
      type="button"
      class="acciones-admin__boton"
      :class="{ 'acciones-admin__boton--oro': enPromocion }"
      data-test="promocion"
      :aria-label="etiquetaPromocion"
      :title="etiquetaPromocion"
      @click.stop="emit('promocion', servicio)"
    >
      <span v-if="enPromocion" class="acciones-admin__pct">{{ pct }}%</span>
      <StrokeIcon v-else nombre="etiqueta" :tamano="20" />
    </button>

    <button
      type="button"
      class="acciones-admin__boton"
      data-test="eliminar"
      :aria-label="`Eliminar ${servicio.name}`"
      :title="`Eliminar ${servicio.name}`"
      @click.stop="emit('eliminar', servicio.id)"
    >
      <StrokeIcon nombre="papelera" :tamano="20" />
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
 * puntero grueso está siempre visible; en el renglón de móvil (`compacto`) van
 * en la misma fila y sin velo. Solo emiten: quien decide qué hacer es
 * `useServiceAdminActions`.
 *
 * El guardia de `isAdmin` es cosmético —el backend protege cada endpoint con
 * `@Auth()`—, pero enseñar un botón de borrar a una clienta es un susto que no
 * pidió.
 */
const props = withDefaults(
  defineProps<{
    servicio: Service;
    /** Versión del renglón de móvil: misma fila, 44 px, sin velo. */
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

const etiquetaPromocion = computed(() =>
  enPromocion.value
    ? `Quitar la promoción de ${props.servicio.name}`
    : `Poner una promoción a ${props.servicio.name}`
);

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
  transition: background 0.2s ease, color 0.2s ease, transform 0.2s ease;
}

.acciones-admin__boton:hover {
  background: var(--m-tinta);
  transform: translateY(-1px);
}

.acciones-admin__boton:focus-visible {
  outline: 2px solid var(--m-oro);
  outline-offset: 2px;
}

/* Promoción activa: el control se rellena de oro y dice el porcentaje. */
.acciones-admin__boton--oro,
.acciones-admin__boton--oro:hover {
  background: var(--m-oro);
  color: var(--m-tinta);
}

.acciones-admin__pct {
  font-family: var(--m-font-display);
  font-size: 0.8125rem;
  line-height: 1;
}

/* Renglón de móvil: fila oscura (carbón), así que borde oro y trazo hueso, sin velo. */
.acciones-admin--compacto {
  gap: 6px;
}

.acciones-admin--compacto .acciones-admin__boton {
  background: transparent;
  color: var(--m-hueso);
}

.acciones-admin--compacto .acciones-admin__boton:hover {
  background: var(--m-tinta);
}

.acciones-admin--compacto .acciones-admin__boton--oro,
.acciones-admin--compacto .acciones-admin__boton--oro:hover {
  background: var(--m-oro);
  color: var(--m-tinta);
}
</style>
