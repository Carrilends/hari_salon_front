<template>
  <div class="horas" data-test="fichas-hora">
    <div v-if="cargando" class="horas__cargando" data-test="fichas-cargando">
      <p class="horas__estado" role="status">Buscando horas libres…</p>
      <div aria-hidden="true">
        <span class="horas__esqueleto-rotulo" />
        <div class="horas__rejilla">
          <span v-for="n in 8" :key="`m${n}`" class="horas__esqueleto" />
        </div>
        <span class="horas__esqueleto-rotulo horas__esqueleto-rotulo--corto" />
        <div class="horas__rejilla">
          <span v-for="n in 4" :key="`t${n}`" class="horas__esqueleto" />
        </div>
      </div>
    </div>

    <template v-else>
      <p v-if="!hayLibres" class="horas__vacio" data-test="sin-huecos">
        No quedan horas libres este día. Prueba con otro día o con otra
        estilista.
      </p>

      <div
        v-for="grupo in grupos"
        :key="grupo.franja"
        class="horas__grupo"
        :data-test="`franja-${grupo.franja}`"
      >
        <h4 class="horas__rotulo">{{ grupo.rotulo }}</h4>
        <div class="horas__rejilla">
          <button
            v-for="hueco in grupo.huecos"
            :key="hueco.hora"
            type="button"
            class="horas__ficha"
            :class="{ 'horas__ficha--elegida': hueco.hora === seleccionada }"
            :data-test="hueco.libre ? 'ficha-hora' : 'ficha-ocupada'"
            :disabled="!hueco.libre"
            :aria-pressed="presionada(hueco)"
            :aria-label="
              hueco.libre ? undefined : `${horaCorta(hueco.hora)}, ocupada`
            "
            @click="emit('elegir', hueco.hora)"
          >
            {{ horaCorta(hueco.hora) }}
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Franja, HuecoDeHora } from 'src/helpers/reserva-huecos';
import { horaCorta } from 'src/helpers/reserva-texto';

/**
 * Las horas del día en fichas de 30 min (B3; contrato §4.1 de la hoja de ruta
 * de las vistas). Sustituye al reloj `q-time`. Las ocupadas se ven —tachadas y
 * deshabilitadas— para que la clienta entienda por qué falta una hora.
 */
defineOptions({ name: 'FichasDeHora' });

const props = defineProps<{
  huecos: HuecoDeHora[];
  seleccionada: string | null;
  cargando: boolean;
}>();

const emit = defineEmits<{ (e: 'elegir', hora: string): void }>();

const ORDEN: Franja[] = ['manana', 'tarde', 'noche'];
const ROTULOS: Record<Franja, string> = {
  manana: 'Mañana',
  tarde: 'Tarde',
  noche: 'Noche',
};

const grupos = computed(() =>
  ORDEN.map((franja) => ({
    franja,
    rotulo: ROTULOS[franja],
    huecos: props.huecos.filter((h) => h.franja === franja),
  })).filter((grupo) => grupo.huecos.length > 0)
);

const hayLibres = computed(() => props.huecos.some((h) => h.libre));

/** Una ocupada no es un conmutador: no lleva `aria-pressed`. */
function presionada(hueco: HuecoDeHora): 'true' | 'false' | undefined {
  if (!hueco.libre) return undefined;
  return hueco.hora === props.seleccionada ? 'true' : 'false';
}
</script>

<style scoped lang="scss">
/**
 * Tablero ReservaCajonPasos: fichas de 44 px en rejilla de 6 (4 en móvil),
 * nieve con filete; la elegida, tinta macizo; la ocupada, filete discontinuo,
 * sin fondo y tachada. El esqueleto, `--m-esqueleto`.
 */
.horas__rotulo {
  margin: 10px 0 6px;
  font-size: 11.5px;
  font-weight: 400;
  color: var(--m-piedra);
}

.horas__grupo:first-of-type .horas__rotulo {
  margin-top: 0;
}

.horas__rejilla {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 6px;
}

.horas__ficha {
  height: var(--m-tactil-min);
  padding: 0;
  border: var(--m-filete-grosor) solid var(--m-filete);
  border-radius: var(--m-radio-tarjeta);
  background: var(--m-nieve);
  color: var(--m-tinta);
  font-family: var(--m-font-sans);
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
}

.horas__ficha--elegida {
  border-color: var(--m-tinta);
  background: var(--m-tinta);
  color: var(--m-hueso);
  font-weight: 500;
}

/* Ocupada: discontinua, apagada Y tachada. Deshabilitada, así que el
   contraste no le aplica (WCAG 1.4.3, componentes inactivos). */
.horas__ficha:disabled {
  border-style: dashed;
  background: transparent;
  color: var(--m-piedra);
  opacity: 0.75;
  text-decoration: line-through;
  cursor: not-allowed;
}

.horas__ficha:focus-visible {
  outline: 2px solid var(--m-tinta);
  outline-offset: 2px;
}

.horas__estado,
.horas__vacio {
  margin: 0 0 10px;
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--m-piedra);
}

.horas__esqueleto-rotulo {
  display: block;
  width: 60px;
  height: 10px;
  margin-bottom: 8px;
  border-radius: 2px;
  background: var(--m-esqueleto);
}

.horas__esqueleto-rotulo--corto {
  width: 48px;
  margin-top: 14px;
}

.horas__esqueleto {
  display: block;
  height: var(--m-tactil-min);
  border-radius: var(--m-radio-tarjeta);
  background: var(--m-esqueleto);
}

@media (max-width: 699px) {
  .horas__rejilla {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (hover: hover) and (pointer: fine) {
  .horas__ficha:hover:not(:disabled):not(.horas__ficha--elegida) {
    border-color: var(--m-oro-profundo);
  }
}
</style>
