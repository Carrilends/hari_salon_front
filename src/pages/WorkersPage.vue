<template>
  <q-page class="estilistas" data-test="pagina-estilistas">
    <div class="estilistas__cuerpo">
      <section
        class="estilistas__principal"
        aria-labelledby="estilistas-titulo"
      >
        <header class="estilistas__cabecera">
          <div class="estilistas__titulos">
            <p class="estilistas__antetitulo" data-test="antetitulo">
              {{ antetitulo }}
            </p>
            <h1 id="estilistas-titulo" class="estilistas__titulo">
              Mis estilistas
            </h1>
          </div>
          <div class="estilistas__semana">
            <button
              type="button"
              class="estilistas__flecha"
              aria-label="Semana anterior"
              data-test="semana-anterior"
              @click="moverSemana(-7)"
            >
              <StrokeIcon nombre="anterior" :tamano="18" />
            </button>
            <span
              class="estilistas__rotulo"
              data-test="rotulo-semana"
              aria-live="polite"
              >{{ rotuloCorto }}</span
            >
            <button
              type="button"
              class="estilistas__flecha"
              aria-label="Semana siguiente"
              data-test="semana-siguiente"
              @click="moverSemana(7)"
            >
              <StrokeIcon nombre="siguiente" :tamano="18" />
            </button>
          </div>
          <button
            type="button"
            class="estilistas__agregar"
            aria-label="Agregar estilista"
            ref="botonAgregar"
            data-test="agregar-estilista"
            @click="abrirCrear"
          >
            <StrokeIcon nombre="mas" :tamano="17" />
            <span class="estilistas__agregar-texto">Agregar</span>
          </button>
        </header>

        <p
          v-if="!semana && cargando"
          class="estilistas__estado"
          role="status"
          data-test="cargando-semana"
        >
          Cargando la semana…
        </p>
        <div
          v-else-if="!semana && error"
          class="estilistas__estado"
          role="alert"
          data-test="error-semana"
        >
          <p class="estilistas__estado-texto">No se pudo cargar la semana.</p>
          <button
            type="button"
            class="estilistas__reintentar"
            data-test="reintentar"
            @click="reintentar()"
          >
            Reintentar
          </button>
        </div>
        <template v-else-if="semana">
          <p
            v-if="!nombradas.length"
            class="estilistas__vacio"
            data-test="sin-estilistas"
          >
            Aún no hay estilistas. Agrega la primera: las clientas la verán al
            reservar.
          </p>
          <TarjetasSemana
            v-if="esMovil"
            :semana="semana"
            :hoy="hoy"
            :seleccionada="idSeleccionada"
            @elegir="abrirEditar"
          />
          <TablaSemana
            v-else
            :semana="semana"
            :hoy="hoy"
            :seleccionada="idSeleccionada"
            @elegir="abrirEditar"
          />
          <p v-if="esMovil && nombradas.length" class="estilistas__pista">
            Toca una estilista para editarla y ver sus citas de hoy.
          </p>
        </template>
      </section>

      <div v-if="panel && panelEnLinea" class="estilistas__lateral">
        <PanelEstilista
          v-bind="propsPanel"
          @guardar="guardar"
          @eliminar="eliminarElegida"
          @cerrar="cerrarPanel"
        />
      </div>
    </div>

    <q-dialog
      :model-value="dialogoAbierto"
      :maximized="esMovil"
      :position="esMovil ? 'standard' : 'right'"
      full-height
      class="estilistas__dialogo"
      @update:model-value="alCambiarDialogo"
    >
      <div
        class="estilistas__hoja"
        :class="{ 'estilistas__hoja--completa': esMovil }"
      >
        <PanelEstilista
          v-if="panel"
          v-bind="propsPanel"
          @guardar="guardar"
          @eliminar="eliminarElegida"
          @cerrar="cerrarPanel"
        />
      </div>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import StrokeIcon from 'src/components/shared/StrokeIcon.vue';
import TablaSemana from 'src/components/estilistas/TablaSemana.vue';
import TarjetasSemana from 'src/components/estilistas/TarjetasSemana.vue';
import PanelEstilista from 'src/components/estilistas/PanelEstilista.vue';
import { useSeo } from 'src/composables/seo/useSeo';
import { useAviso } from 'src/composables/shared/useAviso';
import { useConsultaMedios } from 'src/composables/shared/useConsultaMedios';
import { useWorkers } from 'src/composables/workers/useWorkers';
import { useSemanaEstilistas } from 'src/composables/workers/useSemanaEstilistas';
import { useReservasDeHoy } from 'src/composables/workers/useReservasDeHoy';
import { useAuthStore } from 'src/stores/auth-store';
import { getSalonNowParts } from 'src/helpers/businessHours';
import {
  cabecerasDeDias,
  citasDeHoy,
  lunesDe,
  mensajeAlEliminar,
  mensajeAlGuardar,
  rotuloCortoSemana,
  rotuloLargoSemana,
  sumarDias,
} from 'src/helpers/semana-estilistas';

/**
 * «Mis estilistas», la «tabla con la semana» (spec §8, tablero EstilistasB).
 *
 * - ≥ 900 px tabla; por debajo, tarjetas. ≥ 1120 px el panel va al lado; por
 *   debajo, en un `q-dialog` (a la derecha, o a pantalla completa en móvil).
 * - Errores y éxitos en línea, en el panel. Solo el borrado, que cierra el
 *   panel, lo cuenta con un aviso (`useAviso`).
 * - La ruta no tiene guarda de admin (`routes.ts` es de otro plan): sin sesión
 *   de dueña se vuelve a servicios y las consultas ni se encienden.
 */
type EstadoPanel = { modo: 'crear' } | { modo: 'editar'; id: string };

useSeo({
  title: 'Mis estilistas | Peluquería Marlene',
  description: 'Gestión interna del equipo de Peluquería Marlene.',
  path: '/mis-empleados',
  noindex: true,
});

const router = useRouter();
const authStore = useAuthStore();
const aviso = useAviso();
const esAdmin = computed(() => Boolean(authStore.isAdmin));

/** Hoy en Bogotá. No toca `window`: es un cálculo de reloj. */
const hoy = getSalonNowParts().ymd;
const lunes = ref(lunesDe(hoy));

const { semana, cargando, error, reintentar } = useSemanaEstilistas(
  lunes,
  esAdmin
);
const { reservas } = useReservasDeHoy(esAdmin);
const { crear, renombrar, eliminar } = useWorkers();

const esMovil = useConsultaMedios('(max-width: 899px)', false);
const panelEnLinea = useConsultaMedios('(min-width: 1120px)', true);

const panel = ref<EstadoPanel | null>(null);
const exito = ref<string | null>(null);
const errorGuardar = ref<string | null>(null);
const errorEliminar = ref<string | null>(null);
/**
 * Candado propio contra el doble envío: `isPending` de Vue Query se entera en
 * otra tarea, y dos `Enter` seguidos llegarían antes.
 */
let enviando = false;

const nombradas = computed(
  () => semana.value?.workers.filter((w) => !w.isDefault) ?? []
);
const antetitulo = computed(() => {
  const n = nombradas.value.length;
  return `${n === 1 ? '1 estilista' : `${n} estilistas`} · ${rotuloLargoSemana(
    lunes.value
  )}`;
});
const rotuloCorto = computed(() => rotuloCortoSemana(lunes.value));
const idSeleccionada = computed(() =>
  panel.value?.modo === 'editar' ? panel.value.id : null
);
const elegida = computed(() => {
  const id = idSeleccionada.value;
  return id ? semana.value?.workers.find((w) => w.id === id) ?? null : null;
});
const hoyRotulo = computed(() => {
  const [dia] = cabecerasDeDias([hoy], hoy);
  return `Hoy · ${dia.nombreLargo} ${dia.numero}`;
});
const citas = computed(() =>
  elegida.value ? citasDeHoy(reservas.value, elegida.value.id, hoy) : []
);
const dialogoAbierto = computed(
  () => Boolean(panel.value) && !panelEnLinea.value
);

const propsPanel = computed(() => ({
  modo: panel.value?.modo ?? ('crear' as const),
  estilista: elegida.value,
  semanaRotulo: rotuloCorto.value,
  hoyRotulo: hoyRotulo.value,
  citasHoy: citas.value,
  guardando: crear.isPending.value || renombrar.isPending.value,
  eliminando: eliminar.isPending.value,
  exito: exito.value,
  errorGuardar: errorGuardar.value,
  errorEliminar: errorEliminar.value,
}));

function limpiarMensajes() {
  exito.value = null;
  errorGuardar.value = null;
  errorEliminar.value = null;
}

function moverSemana(dias: number) {
  lunes.value = sumarDias(lunes.value, dias);
}

/**
 * Generación del panel: sube con cada apertura y cada cierre. Un resultado
 * tardío solo se pinta si la generación no cambió (ni otra estilista, ni el
 * mismo panel cerrado y vuelto a abrir).
 */
let generacion = 0;
/** Quién tenía el foco al abrir el panel, para devolvérselo al cerrarlo. */
let origenDelFoco: HTMLElement | null = null;
const botonAgregar = ref<HTMLButtonElement | null>(null);

function recordarFoco() {
  const activo = document.activeElement;
  origenDelFoco = activo instanceof HTMLElement ? activo : null;
}

function devolverFoco() {
  const origen = origenDelFoco;
  origenDelFoco = null;
  // Tras el refresco: la fila de origen puede haber desaparecido con la estilista.
  void nextTick(() => {
    const destino = origen && origen.isConnected ? origen : botonAgregar.value;
    destino?.focus();
  });
}

function abrirCrear() {
  recordarFoco();
  generacion += 1;
  limpiarMensajes();
  panel.value = { modo: 'crear' };
}

function abrirEditar(id: string) {
  recordarFoco();
  generacion += 1;
  limpiarMensajes();
  panel.value = { modo: 'editar', id };
}

function cerrarPanel() {
  const eraEnLinea = Boolean(panel.value) && panelEnLinea.value;
  generacion += 1;
  panel.value = null;
  limpiarMensajes();
  // Con el diálogo, QDialog ya devuelve el foco; en línea, lo hacemos nosotros.
  if (eraEnLinea) devolverFoco();
}

function alCambiarDialogo(abierto: boolean) {
  if (!abierto) cerrarPanel();
}

async function guardar(nombre: string) {
  const estado = panel.value;
  if (!estado || enviando) return;
  const clave = generacion;
  enviando = true;
  exito.value = null;
  errorGuardar.value = null;
  try {
    if (estado.modo === 'crear') {
      await crear.mutateAsync({ name: nombre });
      if (generacion === clave) exito.value = `Se agregó a ${nombre}.`;
    } else {
      await renombrar.mutateAsync({ id: estado.id, body: { name: nombre } });
      if (generacion === clave) exito.value = 'Cambios guardados.';
    }
  } catch (err) {
    if (generacion === clave) errorGuardar.value = mensajeAlGuardar(err);
    else aviso.fallo(`${nombre}: ${mensajeAlGuardar(err)}`);
  } finally {
    enviando = false;
  }
}

async function eliminarElegida() {
  const estilista = elegida.value;
  if (!estilista || estilista.isDefault || enviando) return;
  const clave = generacion;
  enviando = true;
  errorEliminar.value = null;
  try {
    await eliminar.mutateAsync(estilista.id);
    // Si el panel ya es otro, no se toca.
    if (generacion === clave) cerrarPanel();
    aviso.logro(`Se eliminó a ${estilista.name}.`);
  } catch (err) {
    if (generacion === clave) errorEliminar.value = mensajeAlEliminar(err);
    else aviso.fallo(`${estilista.name}: ${mensajeAlEliminar(err)}`);
  } finally {
    enviando = false;
  }
}

/** Si la estilista que se edita deja de existir (otra pestaña la borró), el panel se cierra. */
watch(semana, (actual) => {
  const id = idSeleccionada.value;
  if (actual && id && !actual.workers.some((w) => w.id === id)) cerrarPanel();
});

onMounted(() => {
  if (!authStore.isAdmin) void router.replace('/services');
});

defineOptions({ name: 'WorkersPage' });
</script>

<style lang="scss" scoped>
.estilistas {
  background: var(--m-tinta);
  color: var(--m-hueso);
  font-family: var(--m-font-sans);
}

.estilistas__cuerpo {
  display: flex;
  min-height: inherit;
}

.estilistas__principal {
  flex-grow: 1;
  min-width: 0;
  box-sizing: border-box;
  padding: 26px 32px 48px var(--m-banda-margen);
}

.estilistas__lateral {
  display: flex;
  flex-shrink: 0;
  width: 360px;
}

.estilistas__cabecera {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  grid-template-areas: 'titulos semana agregar';
  align-items: end;
  column-gap: 10px;
  margin-bottom: 22px;
}

.estilistas__titulos {
  grid-area: titulos;
}

.estilistas__antetitulo {
  margin: 0 0 9px;
  color: var(--m-oro);
  font-size: 0.6875rem;
  letter-spacing: var(--m-tracking-marca);
  text-transform: uppercase;
}

.estilistas__titulo {
  margin: 0;
  font-family: var(--m-font-display);
  font-size: 1.875rem;
  font-weight: 400;
  line-height: 1;
}

.estilistas__semana {
  display: flex;
  grid-area: semana;
  align-items: center;
  gap: 10px;
}

.estilistas__rotulo {
  min-width: 120px;
  color: var(--m-piedra-clara);
  font-size: 0.78rem;
  font-variant-numeric: tabular-nums;
  text-align: center;
}

.estilistas__flecha {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--m-tactil-min);
  height: var(--m-tactil-min);
  padding: 0;
  border: var(--m-filete-grosor) solid var(--m-filete-oscuro);
  border-radius: 50%;
  background: transparent;
  color: var(--m-hueso);
  cursor: pointer;
}

.estilistas__agregar {
  display: inline-flex;
  grid-area: agregar;
  align-items: center;
  gap: 10px;
  min-height: var(--m-tactil-min);
  margin-left: 8px;
  padding: 0 20px;
  border: 0;
  border-radius: var(--m-radio-pildora);
  background: var(--m-oro);
  color: var(--m-tinta);
  font-family: var(--m-font-sans);
  font-size: 0.6875rem;
  letter-spacing: var(--m-tracking-nav);
  text-transform: uppercase;
  cursor: pointer;
}

.estilistas__estado,
.estilistas__vacio,
.estilistas__pista {
  margin: 0 0 16px;
  color: var(--m-piedra-clara);
  font-size: 0.8rem;
}

.estilistas__pista {
  margin-top: 14px;
}

.estilistas__estado-texto {
  margin: 0 0 12px;
}

.estilistas__reintentar {
  min-height: var(--m-tactil-min);
  padding: 0 20px;
  border: var(--m-filete-grosor) solid var(--m-oro);
  border-radius: var(--m-radio-pildora);
  background: transparent;
  color: var(--m-hueso);
  font-family: var(--m-font-sans);
  font-size: 0.6875rem;
  letter-spacing: var(--m-tracking-nav);
  text-transform: uppercase;
  cursor: pointer;
}

/* Raíz del q-dialog: un <div> (Quasar le devuelve los clics); el panel la llena. */
.estilistas__hoja {
  display: flex;
  width: 360px;
  max-width: 100vw;
  height: 100%;
  background: var(--m-carbon);
  pointer-events: all;
}

.estilistas__hoja--completa {
  width: 100%;
}

.estilistas__flecha:focus-visible,
.estilistas__agregar:focus-visible,
.estilistas__reintentar:focus-visible {
  outline: 2px solid var(--m-hueso);
  outline-offset: 2px;
}

/** Realce al pasar: el COLOR. El movimiento es global (`app.scss`). */
@media (hover: hover) and (pointer: fine) {
  .estilistas__flecha:hover {
    border-color: var(--m-oro);
  }

  .estilistas__agregar:hover {
    background: var(--m-oro-claro);
  }

  .estilistas__reintentar:hover {
    border-color: var(--m-oro-claro);
  }
}

@media (max-width: 899px) {
  .estilistas__principal {
    padding: 18px var(--m-banda-margen-movil) 32px;
  }

  .estilistas__cabecera {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas:
      'titulos agregar'
      'semana semana';
    row-gap: 12px;
    margin-bottom: 14px;
  }

  .estilistas__antetitulo {
    font-size: 0.625rem;
  }

  .estilistas__titulo {
    font-size: 1.5625rem;
  }

  .estilistas__semana {
    justify-content: space-between;
  }

  .estilistas__agregar {
    justify-content: center;
    width: var(--m-tactil-min);
    margin-left: 0;
    padding: 0;
    border-radius: 50%;
  }

  .estilistas__agregar-texto {
    display: none;
  }
}
</style>

<style lang="scss">
/* Quasar deja 24 px arriba y abajo al diálogo de la derecha aunque lleve
   `full-height`: el panel va a alto completo, pegado al borde. */
.estilistas__dialogo .q-dialog__inner--minimized {
  padding-top: 0;
  padding-bottom: 0;
}
</style>
