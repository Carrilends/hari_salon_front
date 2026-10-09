<template>
  <div class="estilistas" data-test="fichas-estilista">
    <p
      v-if="fija"
      class="estilistas__ficha estilistas__ficha--fija"
      :data-test="
        seleccionada === null ? 'ficha-sin-preferencia' : 'ficha-estilista'
      "
    >
      <span
        v-if="seleccionada === null"
        class="estilistas__avatar estilistas__avatar--hueco"
        aria-hidden="true"
      >
        <StrokeIcon nombre="sin-preferencia" :tamano="17" />
      </span>
      <span v-else class="estilistas__avatar" aria-hidden="true">{{
        inicial(nombreFijo)
      }}</span>
      <span class="estilistas__textos">
        <span class="estilistas__nombre">{{ nombreFijo }}</span>
      </span>
    </p>

    <template v-else>
      <button
        type="button"
        class="estilistas__ficha"
        :class="{ 'estilistas__ficha--elegida': seleccionada === null }"
        data-test="ficha-sin-preferencia"
        :aria-pressed="seleccionada === null ? 'true' : 'false'"
        :disabled="!sinPreferenciaAlcanza"
        @click="emit('elegir', null)"
      >
        <span
          class="estilistas__avatar estilistas__avatar--hueco"
          aria-hidden="true"
        >
          <StrokeIcon nombre="sin-preferencia" :tamano="17" />
        </span>
        <span class="estilistas__textos">
          <span class="estilistas__nombre">Sin preferencia</span>
          <span
            v-if="!sinPreferenciaAlcanza"
            class="estilistas__nota"
            data-test="estilista-sin-tiempo"
            >Sin tiempo suficiente</span
          >
          <span v-else class="estilistas__nota estilistas__nota--holgura"
            >La primera disponible</span
          >
        </span>
      </button>

      <button
        v-for="persona in asignables"
        :key="persona.id"
        type="button"
        class="estilistas__ficha"
        :class="{ 'estilistas__ficha--elegida': persona.id === seleccionada }"
        data-test="ficha-estilista"
        :aria-pressed="persona.id === seleccionada ? 'true' : 'false'"
        :disabled="!alcanza(persona)"
        @click="emit('elegir', persona.id)"
      >
        <span class="estilistas__avatar" aria-hidden="true">{{
          inicial(persona.name)
        }}</span>
        <span class="estilistas__textos">
          <span class="estilistas__nombre">{{ persona.name }}</span>
          <span
            v-if="!alcanza(persona)"
            class="estilistas__nota"
            data-test="estilista-sin-tiempo"
            >Sin tiempo suficiente</span
          >
          <span v-else class="estilistas__nota estilistas__nota--holgura">{{
            holgura(persona)
          }}</span>
        </span>
      </button>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import StrokeIcon from 'src/components/shared/StrokeIcon.vue';
import type { WorkerAvailabilityEntry } from 'src/api/workers-api';

/**
 * Con quién (B3; contrato §4.1 de la hoja de ruta de las vistas). Sustituye
 * al `q-select` de estilistas. «Sin preferencia» va primero: es lo que deja
 * al salón asignar la primera disponible (`WorkerAssigner` en el backend).
 *
 * Solo se pintan las `assignable`: la estilista predeterminada de la BD
 * («Sin prefencia», con su errata) no atiende, es el comodín del sistema.
 */
defineOptions({ name: 'FichasDeEstilista' });

const props = withDefaults(
  defineProps<{
    estilistas: WorkerAvailabilityEntry[];
    seleccionada: string | null;
    duracionMin: number;
    fija?: boolean;
  }>(),
  { fija: false }
);

const emit = defineEmits<{ (e: 'elegir', id: string | null): void }>();

const asignables = computed(() => props.estilistas.filter((e) => e.assignable));

/** La misma regla que el `q-select` de antes: el día entero, no la hora. */
const alcanza = (persona: WorkerAvailabilityEntry) =>
  persona.availableMinutes >= props.duracionMin;

/** Sin estilistas asignables el salón reparte a la predeterminada: se puede. */
const sinPreferenciaAlcanza = computed(
  () => asignables.value.length === 0 || asignables.value.some(alcanza)
);

const nombreFijo = computed(() =>
  props.seleccionada === null
    ? 'Sin preferencia'
    : props.estilistas.find((e) => e.id === props.seleccionada)?.name ?? ''
);

const inicial = (nombre: string) => nombre.trim().charAt(0).toUpperCase();

function holgura(persona: WorkerAvailabilityEntry): string {
  if (persona.capacityMinutes <= 0) return 'Pocas horas libres';
  const libre = persona.availableMinutes / persona.capacityMinutes;
  if (libre >= 2 / 3) return 'Libre casi todo el día';
  if (libre >= 1 / 3) return 'Algunas horas libres';
  return 'Pocas horas libres';
}
</script>

<style scoped lang="scss">
/**
 * Tablero ReservaCajonPasos: en escritorio, rejilla de 4 tarjetas de 92 px
 * con el avatar redondo de 36 px; en móvil, píldoras de 48 px que se
 * arrastran. La elegida, con el filete en tinta y doble grosor de sombra
 * interior (el portal nunca usa bordes de 2 px).
 */
.estilistas {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.estilistas__ficha {
  min-height: 92px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  margin: 0;
  padding: 6px 4px;
  border: var(--m-filete-grosor) solid var(--m-filete);
  border-radius: var(--m-radio-tarjeta);
  background: var(--m-nieve);
  color: var(--m-tinta);
  font-family: var(--m-font-sans);
  text-align: center;
  cursor: pointer;
}

.estilistas__ficha--elegida {
  border-color: var(--m-tinta);
  box-shadow: inset 0 0 0 1px var(--m-tinta);
}

.estilistas__ficha--fija {
  cursor: default;
}

.estilistas__ficha:disabled {
  border-style: dashed;
  background: transparent;
  color: var(--m-piedra);
  opacity: 0.75;
  cursor: not-allowed;
}

.estilistas__ficha:focus-visible {
  outline: 2px solid var(--m-tinta);
  outline-offset: 2px;
}

.estilistas__avatar {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--m-tinta);
  color: var(--m-hueso);
  font-family: var(--m-font-display);
  font-size: 16px;
}

.estilistas__avatar--hueco {
  border: var(--m-filete-grosor) solid var(--m-filete);
  background: transparent;
  color: var(--m-oro-profundo);
}

.estilistas__ficha:disabled
  .estilistas__avatar:not(.estilistas__avatar--hueco) {
  background: var(--m-piedra-clara);
}

.estilistas__textos {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 0;
}

.estilistas__nombre {
  font-size: 13px;
  line-height: 1.2;
}

.estilistas__ficha--elegida .estilistas__nombre {
  font-weight: 500;
}

.estilistas__nota {
  font-size: 10.5px;
  line-height: 1.15;
  color: var(--m-piedra);
}

@media (max-width: 699px) {
  .estilistas {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .estilistas::-webkit-scrollbar {
    display: none;
  }

  .estilistas__ficha {
    flex-shrink: 0;
    flex-direction: row;
    min-height: 48px;
    padding: 0 14px 0 6px;
    border-radius: var(--m-radio-pildora);
    text-align: left;
    gap: 8px;
  }

  .estilistas__avatar {
    width: 34px;
    height: 34px;
    font-size: 15px;
  }

  .estilistas__textos {
    align-items: flex-start;
  }

  .estilistas__nombre {
    font-size: 13.5px;
  }

  /* En la píldora solo cabe lo que impide elegir. */
  .estilistas__nota--holgura {
    display: none;
  }
}

@media (hover: hover) and (pointer: fine) {
  .estilistas__ficha:hover:not(:disabled):not(.estilistas__ficha--elegida):not(
      .estilistas__ficha--fija
    ) {
    border-color: var(--m-oro-profundo);
  }
}
</style>
