<template>
  <div
    class="pestanas"
    role="tablist"
    aria-label="Estado de las reservas"
    data-test="pestanas"
  >
    <button
      v-for="(pestana, i) in PESTANAS_BANDEJA"
      :id="`pestana-${pestana.id}`"
      :key="pestana.id"
      :ref="(el) => guardar(el, i)"
      type="button"
      role="tab"
      class="pestana m-boton-plano"
      :class="{ 'pestana--activa': pestana.id === activa }"
      aria-controls="bandeja-panel"
      :aria-selected="pestana.id === activa ? 'true' : 'false'"
      :tabindex="pestana.id === activa ? 0 : -1"
      :data-test="`pestana-${pestana.id}`"
      @click="emit('elegir', pestana.id)"
      @keydown="alTeclear($event, i)"
    >
      {{ pestana.rotulo }}
      <span class="pestana__cuenta" data-test="cuenta">{{
        cuentas[pestana.id]
      }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { nextTick } from 'vue';
import {
  PESTANAS_BANDEJA,
  type PestanaBandeja,
} from 'src/helpers/admin-reservation-filter';

/**
 * Las pestañas de la bandeja (spec §3, A1). Patrón ARIA de pestañas con
 * activación automática: la flecha elige y enfoca la vecina.
 */
defineProps<{
  activa: PestanaBandeja;
  cuentas: Record<PestanaBandeja, number>;
}>();

const emit = defineEmits<{ (e: 'elegir', pestana: PestanaBandeja): void }>();

const botones: Array<HTMLButtonElement | null> = [];

function guardar(el: unknown, i: number) {
  botones[i] = el instanceof HTMLButtonElement ? el : null;
}

function destino(tecla: string, i: number, total: number): number | null {
  switch (tecla) {
    case 'ArrowRight':
      return (i + 1) % total;
    case 'ArrowLeft':
      return (i - 1 + total) % total;
    case 'Home':
      return 0;
    case 'End':
      return total - 1;
    default:
      return null;
  }
}

function alTeclear(evento: KeyboardEvent, i: number) {
  const j = destino(evento.key, i, PESTANAS_BANDEJA.length);
  if (j === null) return;
  evento.preventDefault();
  emit('elegir', PESTANAS_BANDEJA[j].id);
  void nextTick(() => botones[j]?.focus());
}

defineOptions({ name: 'PestanasBandeja' });
</script>

<style lang="scss" scoped>
/* Tablero: 46 px de alto, indicador de 2 px en oro bajo la activa, contador
   en píldora (oro macizo en la activa). En móvil desplaza en horizontal. */
.pestanas {
  display: flex;
  overflow-x: auto;
  border-bottom: var(--m-filete-grosor) solid var(--m-filete-oscuro);
  scrollbar-width: none;
}

.pestanas::-webkit-scrollbar {
  display: none;
}

.pestana {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 8px;
  height: 46px;
  padding: 0 12px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--m-piedra-clara);
  font-family: var(--m-font-sans);
  font-size: 11px;
  letter-spacing: var(--m-tracking-nav);
  text-transform: uppercase;
  cursor: pointer;
}

@media (min-width: 700px) {
  .pestana {
    padding: 0 18px;
    font-size: 12px;
  }
}

.pestana--activa {
  border-bottom-color: var(--m-oro);
  color: var(--m-hueso);
}

.pestana__cuenta {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  box-sizing: border-box;
  padding: 0 6px;
  border: var(--m-filete-grosor) solid var(--m-filete-oscuro);
  border-radius: 10px;
  font-size: 10.5px;
  letter-spacing: 0;
}

.pestana--activa .pestana__cuenta {
  border-color: var(--m-oro);
  background: var(--m-oro);
  color: var(--m-tinta);
}

/* Hacia dentro: el contenedor desplaza y recortaría el anillo por fuera. */
.pestana:focus-visible {
  outline: 2px solid var(--m-hueso);
  outline-offset: -4px;
}

/**
 * Realce al pasar (solo puntero fino): el COLOR. El movimiento es global, en
 * `app.scss` («Realce y hundido»).
 */
@media (hover: hover) and (pointer: fine) {
  .pestana:hover {
    color: var(--m-hueso);
  }
}
</style>
