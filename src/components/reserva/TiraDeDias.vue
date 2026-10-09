<template>
  <div class="tira" data-test="tira-dias">
    <div class="tira__fila">
      <button
        type="button"
        class="tira__flecha"
        data-test="tira-anterior"
        aria-label="Días anteriores"
        @click="desplazar(-1)"
      >
        <StrokeIcon nombre="anterior" :tamano="18" />
      </button>

      <ul ref="lista" class="tira__lista">
        <li v-for="dia in dias" :key="dia.fecha" class="tira__elemento">
          <button
            type="button"
            class="tira__dia"
            :class="{ 'tira__dia--elegido': dia.fecha === seleccionado }"
            data-test="dia"
            :aria-pressed="dia.fecha === seleccionado ? 'true' : 'false'"
            :aria-label="etiquetaDe(dia)"
            :disabled="dia.disponibilidad === 'sin-hueco'"
            @click="emit('elegir', dia.fecha)"
          >
            <span
              v-if="dia.fecha === seleccionado"
              class="sr"
              data-test="dia-seleccionado"
              >elegido</span
            >
            <span class="tira__semana">{{
              dia.esHoy ? 'Hoy' : dia.diaSemanaCorto
            }}</span>
            <span class="tira__numero">{{ dia.numero }}</span>
            <span
              v-if="dia.esFestivo"
              class="tira__festivo"
              data-test="dia-festivo"
              >Festivo</span
            >
            <span
              v-else-if="tienePunto(dia)"
              class="tira__punto"
              :class="`tira__punto--${dia.disponibilidad}`"
              aria-hidden="true"
            />
          </button>
        </li>
      </ul>

      <button
        type="button"
        class="tira__flecha"
        data-test="tira-siguiente"
        aria-label="Días siguientes"
        @click="desplazar(1)"
      >
        <StrokeIcon nombre="siguiente" :tamano="18" />
      </button>
    </div>

    <!-- El significado de los puntos ya va en el nombre de cada día: la
         leyenda es para quien mira, no para el lector de pantalla. -->
    <p
      v-if="hayPuntos"
      class="tira__leyenda"
      data-test="leyenda-dias"
      aria-hidden="true"
    >
      <span class="tira__clave"
        ><span class="tira__punto tira__punto--libre" />Libre</span
      >
      <span class="tira__clave"
        ><span class="tira__punto tira__punto--poca" />Pocas horas</span
      >
    </p>

    <p v-if="festivoElegido" class="tira__nota" data-test="nota-festivo">
      {{ diaYNumero(festivoElegido.fecha) }} es festivo: se atiende de
      {{ festivoElegido.horario.abre }} a {{ festivoElegido.horario.cierra }}.
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import StrokeIcon from 'src/components/shared/StrokeIcon.vue';
import type { DiaDeTira } from 'src/helpers/reserva-huecos';
import { diaYNumero, fechaLarga } from 'src/helpers/reserva-texto';

/**
 * La tira de días del cajón de reserva (B3; contrato §4.1 de la hoja de ruta
 * de las vistas). Botones con `aria-pressed`, no un `listbox`: cada día se
 * elige con un toque y el lector de pantalla dice si está elegido.
 *
 * Cómo se leen los `data-test`: todos los días son `dia`; el elegido lleva
 * dentro `dia-seleccionado`, y un festivo, `dia-festivo`.
 */
defineOptions({ name: 'TiraDeDias' });

const props = defineProps<{ dias: DiaDeTira[]; seleccionado: string | null }>();

const emit = defineEmits<{ (e: 'elegir', fecha: string): void }>();

/** Cuatro días y medio por toque de flecha (52 px + 6 de hueco, ×4). */
const PASO_FLECHA = 232;

const lista = ref<HTMLElement | null>(null);

const TEXTO_DISPONIBILIDAD: Record<DiaDeTira['disponibilidad'], string> = {
  libre: ', con horas libres',
  poca: ', pocas horas libres',
  'sin-hueco': ', sin hueco para tu reserva',
  desconocida: '',
};

function etiquetaDe(dia: DiaDeTira): string {
  return (
    `${fechaLarga(dia.fecha)}${dia.esHoy ? ', hoy' : ''}` +
    `${dia.esFestivo ? ', festivo' : ''}` +
    `, de ${dia.horario.abre} a ${dia.horario.cierra}` +
    TEXTO_DISPONIBILIDAD[dia.disponibilidad]
  );
}

const tienePunto = (dia: DiaDeTira) =>
  dia.disponibilidad === 'libre' || dia.disponibilidad === 'poca';

const hayPuntos = computed(() => props.dias.some(tienePunto));

const festivoElegido = computed(
  () =>
    props.dias.find((d) => d.fecha === props.seleccionado && d.esFestivo) ??
    null
);

/** Sin `scrollBy` (un navegador muy viejo) la flecha no hace nada, y no revienta. */
function desplazar(sentido: 1 | -1) {
  lista.value?.scrollBy?.({ left: sentido * PASO_FLECHA, behavior: 'smooth' });
}
</script>

<style scoped lang="scss">
/**
 * Tablero ReservaCajonPasos: días de 52×72 (50×68 en móvil), nieve con filete;
 * el elegido, tinta macizo. Punto oro = libre, punto piedra = pocas horas.
 */
.tira__fila {
  display: flex;
  align-items: center;
  gap: 4px;
}

.tira__lista {
  display: flex;
  flex: 1 1 auto;
  min-width: 0;
  gap: 6px;
  margin: 0;
  padding: 4px;
  list-style: none;
  overflow-x: auto;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}

.tira__lista::-webkit-scrollbar {
  display: none;
}

.tira__elemento {
  flex-shrink: 0;
}

.tira__dia {
  width: 52px;
  height: 72px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 0;
  border: var(--m-filete-grosor) solid var(--m-filete);
  border-radius: var(--m-radio-tarjeta);
  background: var(--m-nieve);
  color: var(--m-tinta);
  font-family: var(--m-font-sans);
  cursor: pointer;
}

.tira__semana {
  font-size: 10px;
  letter-spacing: var(--m-tracking-nav);
  text-transform: uppercase;
  color: var(--m-piedra);
}

.tira__numero {
  font-size: 18px;
  line-height: 1;
}

.tira__festivo {
  font-size: 9px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--m-oro-profundo);
}

.tira__punto {
  display: inline-block;
  width: 5px;
  height: 5px;
  border-radius: 50%;
}

.tira__punto--libre {
  background: var(--m-oro);
}

.tira__punto--poca {
  background: var(--m-piedra);
}

.tira__dia--elegido {
  border-color: var(--m-tinta);
  background: var(--m-tinta);
  color: var(--m-hueso);
}

.tira__dia--elegido .tira__semana {
  color: var(--m-piedra-clara);
}

/* Sobre tinta el oro claro sí se lee (5,7:1). */
.tira__dia--elegido .tira__festivo {
  color: var(--m-oro);
}

.tira__dia--elegido .tira__punto--poca {
  background: var(--m-piedra-clara);
}

/* Lleno: apagado Y tachado, nunca solo por color. */
.tira__dia:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.tira__dia:disabled .tira__numero {
  text-decoration: line-through;
}

.tira__flecha {
  flex-shrink: 0;
  width: var(--m-tactil-min);
  height: var(--m-tactil-min);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  border-radius: var(--m-radio-pildora);
  background: transparent;
  color: var(--m-tinta);
  cursor: pointer;
}

.tira__dia:focus-visible,
.tira__flecha:focus-visible {
  outline: 2px solid var(--m-tinta);
  outline-offset: 2px;
}

.tira__leyenda {
  display: flex;
  gap: 16px;
  margin: 8px 0 0;
  font-size: 11.5px;
  color: var(--m-piedra);
}

.tira__clave {
  display: flex;
  align-items: center;
  gap: 6px;
}

.tira__nota {
  margin: 8px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--m-piedra);
}

@media (max-width: 699px) {
  /* En móvil la tira se arrastra con el dedo: las flechas sobran. */
  .tira__flecha {
    display: none;
  }

  .tira__dia {
    width: 50px;
    height: 68px;
    gap: 2px;
  }

  .tira__numero {
    font-size: 17px;
  }
}

@media (hover: hover) and (pointer: fine) {
  .tira__dia:hover:not(:disabled):not(.tira__dia--elegido) {
    border-color: var(--m-oro-profundo);
  }

  .tira__flecha:hover {
    color: var(--m-oro-profundo);
  }
}
</style>
