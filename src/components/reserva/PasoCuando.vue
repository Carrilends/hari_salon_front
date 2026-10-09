<template>
  <div class="cuando" data-test="paso-cuando">
    <h3 class="cajon-etiqueta">Con quién</h3>
    <FichasDeEstilista
      :estilistas="estilistas"
      :seleccionada="estilistaId"
      :duracion-min="duracionMin"
      @elegir="alElegirEstilista"
    />

    <div class="cuando__cabeza">
      <h3 class="cajon-etiqueta cuando__rotulo">Qué día</h3>
      <span v-if="mes" class="cuando__mes" data-test="mes-tira">{{ mes }}</span>
    </div>
    <TiraDeDias :dias="dias" :seleccionado="fecha" @elegir="alElegirFecha" />

    <div
      v-if="aviso"
      id="aviso-disponibilidad"
      class="cuando__aviso"
      role="alert"
      data-test="aviso-disponibilidad"
    >
      <p class="cuando__aviso-texto">
        <StrokeIcon nombre="alerta" :tamano="18" />
        <span>{{ aviso.texto }}</span>
      </p>
      <div class="cuando__aviso-acciones">
        <button
          type="button"
          class="cuando__aviso-boton"
          data-test="elegir-otra-hora"
          @click="alElegirOtraHora"
        >
          Elegir otra hora
        </button>
        <button
          v-if="aviso.ofrecerSinPreferencia"
          type="button"
          class="cuando__aviso-enlace"
          data-test="probar-sin-preferencia"
          @click="emit('probar-sin-preferencia')"
        >
          Probar sin preferencia
        </button>
      </div>
    </div>

    <h3 ref="tituloHoras" class="cajon-etiqueta cuando__horas" tabindex="-1">
      A qué hora
    </h3>
    <div
      v-if="errorHuecos"
      class="cuando__error"
      role="alert"
      data-test="error-huecos"
    >
      <p class="cuando__error-texto">
        No pudimos cargar las horas libres de este día.
      </p>
      <button
        type="button"
        class="cuando__reintentar"
        data-test="reintentar-huecos"
        @click="emit('reintentar')"
      >
        Reintentar
      </button>
    </div>
    <p v-else-if="!fecha" class="cuando__pista" data-test="elige-dia">
      Elige un día para ver sus horas libres.
    </p>
    <FichasDeHora
      v-else
      :huecos="huecos"
      :seleccionada="hora"
      :cargando="cargando"
      @elegir="alElegirHora"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import StrokeIcon from 'src/components/shared/StrokeIcon.vue';
import TiraDeDias from 'src/components/reserva/TiraDeDias.vue';
import FichasDeHora from 'src/components/reserva/FichasDeHora.vue';
import FichasDeEstilista from 'src/components/reserva/FichasDeEstilista.vue';
import type { WorkerAvailabilityEntry } from 'src/api/workers-api';
import type { DiaDeTira, HuecoDeHora } from 'src/helpers/reserva-huecos';
import type { AvisoDisponibilidad } from 'src/components/reserva/tipos';
import { mesYAnio } from 'src/helpers/reserva-texto';

/**
 * Paso 2 del cajón (B3, B6). Compone las tres piezas compartidas y pinta en
 * línea lo que antes eran avisos flotantes: «la disponibilidad cambió» y «no
 * pudimos cargar las horas». Presentacional: decide `useCajonReserva`.
 */
defineOptions({ name: 'PasoCuando' });

const props = defineProps<{
  estilistas: WorkerAvailabilityEntry[];
  estilistaId: string | null;
  duracionMin: number;
  dias: DiaDeTira[];
  fecha: string | null;
  huecos: HuecoDeHora[];
  hora: string | null;
  cargando: boolean;
  errorHuecos: boolean;
  aviso: AvisoDisponibilidad | null;
}>();

const emit = defineEmits<{
  (e: 'elegir-estilista', id: string | null): void;
  (e: 'elegir-fecha', fecha: string): void;
  (e: 'elegir-hora', hora: string): void;
  (e: 'elegir-otra-hora'): void;
  (e: 'probar-sin-preferencia'): void;
  (e: 'reintentar'): void;
}>();

const tituloHoras = ref<HTMLElement | null>(null);

const mes = computed(() => {
  const referencia = props.fecha ?? props.dias[0]?.fecha;
  return referencia ? mesYAnio(referencia) : '';
});

const alElegirEstilista = (id: string | null) => emit('elegir-estilista', id);
const alElegirFecha = (fecha: string) => emit('elegir-fecha', fecha);
const alElegirHora = (hora: string) => emit('elegir-hora', hora);

/** El aviso se va y el foco baja a las horas: es lo siguiente que toca. */
async function alElegirOtraHora() {
  emit('elegir-otra-hora');
  await nextTick();
  tituloHoras.value?.focus();
}
</script>

<style scoped lang="scss">
/** Tableros ReservaCajonPasos (escritorio y móvil 2) y ReservaCajonEstados. */
.cuando__cabeza {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-top: 22px;
}

.cuando__rotulo {
  margin-bottom: 10px;
}

.cuando__mes {
  font-size: 12px;
  color: var(--m-piedra);
}

.cuando__horas {
  margin-top: 20px;
  margin-bottom: 8px;
}

.cuando__horas:focus-visible {
  outline: 2px solid var(--m-tinta);
  outline-offset: 2px;
}

.cuando__aviso {
  margin-top: 16px;
  padding: 14px 14px 12px;
  border: var(--m-filete-grosor) solid var(--m-rosa-profundo);
  border-radius: var(--m-radio-tarjeta);
  background: var(--m-nieve);
}

.cuando__aviso-texto {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin: 0;
  font-size: 13.5px;
  line-height: 1.5;
  color: var(--m-rosa-profundo);
}

.cuando__aviso-acciones {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
  padding-left: 28px;
}

.cuando__aviso-boton {
  min-height: var(--m-tactil-min);
  padding: 0 16px;
  border: none;
  border-radius: var(--m-radio-pildora);
  background: var(--m-tinta);
  color: var(--m-hueso);
  font-family: var(--m-font-sans);
  font-size: 11.5px;
  letter-spacing: var(--m-tracking-nav);
  text-transform: uppercase;
  cursor: pointer;
}

.cuando__aviso-enlace,
.cuando__reintentar {
  min-height: var(--m-tactil-min);
  padding: 0 4px;
  border: none;
  background: transparent;
  color: var(--m-piedra);
  font-family: var(--m-font-sans);
  font-size: 13px;
  cursor: pointer;
}

.cuando__reintentar {
  color: var(--m-rosa-profundo);
}

.cuando__subrayado {
  border-bottom: var(--m-filete-grosor) solid var(--m-filete-rosa);
}

.cuando__aviso-boton:focus-visible,
.cuando__aviso-enlace:focus-visible,
.cuando__reintentar:focus-visible {
  outline: 2px solid var(--m-tinta);
  outline-offset: 2px;
}

.cuando__error-texto,
.cuando__pista {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--m-piedra);
}

@media (hover: hover) and (pointer: fine) {
  .cuando__aviso-boton:hover {
    color: var(--m-oro);
  }

  .cuando__aviso-enlace:hover,
  .cuando__reintentar:hover {
    color: var(--m-tinta);
  }
}
</style>
