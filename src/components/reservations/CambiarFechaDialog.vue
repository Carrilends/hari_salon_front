<template>
  <!-- En móvil, `maximized` con la posición `standard`: su capa es
       `fixed-full` y el panel la llena con su propio desplazamiento. Con
       `bottom` la capa era de alto automático y la cabecera se salía por
       arriba. La entrada desde abajo la da `slide-up`. -->
  <q-dialog
    :model-value="modelValue"
    class="cambiar-fecha-dialogo"
    :maximized="esMovil"
    :persistent="guardando"
    position="standard"
    transition-show="slide-up"
    transition-hide="slide-down"
    @update:model-value="alCambiarVisibilidad"
  >
    <section
      class="cambiar-fecha"
      :class="{ 'cambiar-fecha--hoja': esMovil }"
      role="document"
      aria-labelledby="cambiar-fecha-titulo"
      data-test="cambiar-fecha"
    >
      <header class="cambiar-fecha__cabecera">
        <div class="cambiar-fecha__barra">
          <h2 id="cambiar-fecha-titulo" class="cambiar-fecha__titulo">
            Cambiar fecha
          </h2>
          <button
            type="button"
            class="cambiar-fecha__cerrar m-boton-plano"
            aria-label="Cerrar"
            data-test="cerrar-cambiar-fecha"
            :disabled="guardando"
            @click="cerrar"
          >
            <StrokeIcon nombre="cerrar" :tamano="20" />
          </button>
        </div>
        <p class="cambiar-fecha__ahora" data-test="cita-actual">
          Ahora:
          <span class="cambiar-fecha__ahora-valor">{{ ahoraTexto }}</span> ·
          {{ servicios }} · {{ duracion }} min
        </p>
      </header>

      <div class="cambiar-fecha__cuerpo">
        <section
          class="cambiar-fecha__bloque"
          aria-labelledby="cambiar-fecha-con-quien"
          data-test="con-quien"
        >
          <h3 id="cambiar-fecha-con-quien" class="cambiar-fecha__etiqueta">
            Con quién
          </h3>
          <FichasDeEstilista
            :estilistas="estilistasFijas"
            :seleccionada="reserva.workerId"
            :duracion-min="duracion"
            :fija="estilistaFija"
          />
          <p
            v-if="reserva.workerPinned === true"
            class="cambiar-fecha__nota"
            data-test="nota-elegida"
          >
            La elegiste tú: se mantiene.
          </p>
          <p
            v-else-if="avisarAsignada"
            class="cambiar-fecha__aviso"
            data-test="aviso-asignada"
          >
            <StrokeIcon
              nombre="alerta"
              :tamano="16"
              class="cambiar-fecha__aviso-icono"
            />
            <span
              >Cambiar la hora puede significar que te atienda otra
              estilista.</span
            >
          </p>
        </section>

        <h3 class="cambiar-fecha__etiqueta">Qué día · {{ mesVisible }}</h3>
        <TiraDeDias :dias="dias" :seleccionado="fecha" @elegir="elegirFecha" />

        <h3 class="cambiar-fecha__etiqueta">
          A qué hora · caben {{ duracion }} min
        </h3>
        <FichasDeHora
          :huecos="huecos"
          :seleccionada="hora"
          :cargando="cargandoHuecos"
          @elegir="elegirHora"
        />

        <p
          v-if="errorHuecos"
          class="cambiar-fecha__error-huecos"
          role="alert"
          data-test="error-huecos"
        >
          <span>No pudimos traer los huecos de ese día.</span>
          <button
            type="button"
            class="cambiar-fecha__reintentar"
            data-test="reintentar-huecos"
            @click="reintentarHuecos"
          >
            Reintentar
          </button>
        </p>

        <div
          v-if="error"
          class="cambiar-fecha__choque"
          role="alert"
          data-test="aviso-choque"
        >
          <StrokeIcon
            nombre="alerta"
            :tamano="18"
            class="cambiar-fecha__choque-icono"
          />
          <span>{{ error }}</span>
        </div>
      </div>

      <footer class="cambiar-fecha__pie">
        <p
          v-if="nuevaTexto"
          class="cambiar-fecha__nueva"
          data-test="cita-nueva"
        >
          Nueva: {{ nuevaTexto }}
        </p>
        <div class="cambiar-fecha__acciones">
          <button
            type="button"
            class="cambiar-fecha__volver m-boton-plano"
            data-test="volver-cambiar-fecha"
            :disabled="guardando"
            @click="cerrar"
          >
            Volver
          </button>
          <button
            type="button"
            class="cambiar-fecha__guardar"
            data-test="guardar-fecha"
            :disabled="!puedeGuardar"
            :aria-busy="guardando ? 'true' : 'false'"
            @click="guardar"
          >
            {{ guardando ? 'Moviendo…' : 'Mover la cita' }}
          </button>
        </div>
      </footer>
    </section>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useQueryClient } from '@tanstack/vue-query';
import StrokeIcon from 'src/components/shared/StrokeIcon.vue';
import TiraDeDias from 'src/components/reserva/TiraDeDias.vue';
import FichasDeHora from 'src/components/reserva/FichasDeHora.vue';
import FichasDeEstilista from 'src/components/reserva/FichasDeEstilista.vue';
import { useWorkerAvailability } from 'src/composables/booking/useWorkerAvailability';
import { useOcupacionDeLaTira } from 'src/composables/booking/useOcupacionDeLaTira';
import { useConsultaMedios } from 'src/composables/shared/useConsultaMedios';
import { rescheduleReservation } from 'src/api/reservations-api';
import { queryKeys } from 'src/api/query-keys';
import {
  bookingSelectionToUtcIso,
  getSalonNowParts,
} from 'src/helpers/businessHours';
import {
  diasDeLaTira,
  huecosDelDia,
  rangoDeLaTira,
  type HuecoDeHora,
} from 'src/helpers/reserva-huecos';
import { franjaTexto } from 'src/helpers/reserva-texto';
import {
  CONSULTA_MOVIL_RESERVAS,
  fechaDeCita,
  fechaLargaDeQDate,
  horaHHmm,
  mesLargoDeQDate,
  nombreDeEstilista,
  nombresDeServicios,
  partesEnBogota,
  rescheduleErrorMessage,
  shouldWarnWorkerMayChange,
  sinLaPropiaReserva,
} from 'src/helpers/my-reservations';
import type { WorkerAvailabilityEntry } from 'src/api/workers-api';
import type { ReservationDto } from 'src/interfaces/booking';

/**
 * «Cambiar fecha» (M3; contrato §4.2 de la hoja de ruta). Reutiliza la tira de
 * días y las fichas de hora del cajón de reserva, con los huecos calculados
 * para la duración de la cita y SIN su propio bloque (el backend lo excluye
 * al comprobar el solape; sin recortarlo, el portal tacharía horas válidas).
 *
 * Hace el PATCH él mismo porque lo reutiliza la bandeja de la dueña (plan 3).
 * Al salir bien espera a que se invaliden las consultas antes de avisar, y
 * avisa con la estilista que devolvió el PATCH: quien escucha `reprogramada`
 * sabe si el sistema la reasignó aunque la lista no se haya podido refrescar,
 * y si se refrescó, saca de ahí su nombre.
 *
 * Los puntos de la tira salen de la ocupación real del salón
 * (`useOcupacionDeLaTira`, clave `queryKeys.occupancy.rango`, la misma
 * consulta que el cajón), con `byDate` pasado tal cual a `diasDeLaTira`
 * (hoja de ruta §4.1). Es la del salón entero, no la de su estilista, y cuenta
 * la propia cita: orienta para elegir día; las horas de verdad salen de la
 * disponibilidad del día, ya recortada.
 */
defineOptions({ name: 'CambiarFechaDialog' });

const props = withDefaults(
  defineProps<{
    reserva: ReservationDto;
    modelValue: boolean;
    /** Contrato §4.2: la bandeja lo pide si el backend lo admite (hoy no; ver `ESTILISTA_EN_PATCH`). */
    permitirEstilista?: boolean;
  }>(),
  { permitirEstilista: false }
);

const emit = defineEmits<{
  (e: 'update:modelValue', valor: boolean): void;
  /**
   * `workerId` es la estilista que devolvió el PATCH: la verdad del servidor,
   * aunque la lista refrescada falle. Segundo argumento aditivo (§4.2): quien
   * escucha solo `(id)` sigue valiendo.
   */
  (e: 'reprogramada', id: string, workerId: string): void;
}>();

/**
 * ¿Admite el backend cambiar la estilista al mover? No:
 * `RescheduleReservationDto` solo tiene `scheduledAt` y, con
 * `forbidNonWhitelisted`, un `workerId` daría 400. Mientras valga `false`,
 * «Con quién» va fijo aunque se pida `permitirEstilista`.
 */
const ESTILISTA_EN_PATCH = false;

const esMovil = useConsultaMedios(CONSULTA_MOVIL_RESERVAS, false);
const queryClient = useQueryClient();

const fecha = ref<string | null>(null);
const hora = ref<string | null>(null);
const error = ref('');
const guardando = ref(false);
const ahoraSalon = ref(getSalonNowParts());

const duracion = computed(() => props.reserva.totalDurationMinutes);
const actual = computed(() => partesEnBogota(props.reserva.scheduledAt));
const servicios = computed(() => nombresDeServicios(props.reserva));
const ahoraTexto = computed(
  () =>
    `${fechaDeCita(props.reserva.scheduledAt)} · ${franjaTexto(
      horaHHmm(actual.value),
      duracion.value
    )}`
);

const ocupacion = useOcupacionDeLaTira(
  () => rangoDeLaTira(ahoraSalon.value),
  () => props.modelValue
);

const dias = computed(() =>
  diasDeLaTira(ahoraSalon.value, ocupacion.data.value?.byDate, duracion.value)
);
const mesVisible = computed(() =>
  mesLargoDeQDate(fecha.value ?? dias.value[0]?.fecha ?? '')
);

const disponibilidad = useWorkerAvailability(
  () => fecha.value ?? '',
  () => props.modelValue
);

const disponibilidadSinLaPropia = computed(() => {
  const datos = disponibilidad.data.value;
  if (!datos || !fecha.value) return null;
  return sinLaPropiaReserva(datos, props.reserva, fecha.value);
});

const huecos = computed<HuecoDeHora[]>(() => {
  const datos = disponibilidadSinLaPropia.value;
  if (!datos || !fecha.value) return [];
  return huecosDelDia({
    fecha: fecha.value,
    duracionMin: duracion.value,
    disponibilidad: datos,
    // Igual que el backend: con estilista elegida, solo su agenda; sin ella,
    // vale cualquiera (el reparto vuelve a elegir al mover).
    estilistaId: props.reserva.workerPinned ? props.reserva.workerId : null,
  });
});

const cargandoHuecos = computed(
  () => Boolean(fecha.value) && disponibilidad.isLoading.value
);
const errorHuecos = computed(
  () => Boolean(fecha.value) && disponibilidad.isError.value
);

const estilistaFija = computed(
  () => !(props.permitirEstilista && ESTILISTA_EN_PATCH)
);

/** La estilista de la cita, con su disponibilidad ya recortada si ha llegado. */
const estilistasFijas = computed<WorkerAvailabilityEntry[]>(() => {
  const real = disponibilidadSinLaPropia.value?.workers.find(
    (w) => w.id === props.reserva.workerId
  );
  if (real) return [real];
  return [
    {
      id: props.reserva.workerId,
      name: nombreDeEstilista(props.reserva),
      isDefault: false,
      assignable: true,
      usedMinutes: 0,
      capacityMinutes: 0,
      availableMinutes: duracion.value,
      reservations: [],
    },
  ];
});

const avisarAsignada = computed(() => shouldWarnWorkerMayChange(props.reserva));

const esLaMisma = computed(
  () =>
    fecha.value === actual.value.qDate && hora.value === horaHHmm(actual.value)
);

const horaLibre = computed(() =>
  huecos.value.some((h) => h.hora === hora.value && h.libre)
);

const puedeGuardar = computed(
  () =>
    Boolean(fecha.value && hora.value) &&
    !esLaMisma.value &&
    horaLibre.value &&
    !guardando.value
);

const nuevaTexto = computed(() => {
  if (!fecha.value || !hora.value || esLaMisma.value) return '';
  const base = `${fechaLargaDeQDate(fecha.value)} · ${franjaTexto(
    hora.value,
    duracion.value
  )}`;
  // Solo se nombra a la estilista si está garantizada: si la repartió el
  // sistema, mover puede traer a otra.
  return props.reserva.workerPinned
    ? `${base} · ${nombreDeEstilista(props.reserva)}`
    : base;
});

/**
 * Cada apertura es una vuelta. La clienta no puede cerrar mientras se mueve
 * (ver `cerrar`), pero la página sí puede cerrarlo, reabrirlo o cambiarle la
 * cita por su cuenta (un aviso en tiempo real, otra cita en la bandeja). Un
 * PATCH que sigue en vuelo entonces ya no es de la vuelta que se ve: al
 * terminar avisa de la cita que movió, pero no cierra ni pinta su error sobre
 * la nueva.
 */
let vuelta = 0;

/**
 * Al abrir (o al cambiar de cita con el diálogo abierto) se empieza limpio:
 * sin aviso, sin hora y en el día de la cita si cae en la tira.
 */
function reiniciar(): void {
  vuelta += 1;
  ahoraSalon.value = getSalonNowParts();
  error.value = '';
  hora.value = null;
  guardando.value = false;
  const diaActual = actual.value.qDate;
  fecha.value = dias.value.some((d) => d.fecha === diaActual)
    ? diaActual
    : dias.value[0]?.fecha ?? null;
}

// Dos fuentes, no un captador que devuelve un arreglo: ese daría uno nuevo
// cada vez que la lista refrescada trae otro objeto para la MISMA cita, y
// borraría lo elegido a mitad de camino.
watch(
  [() => props.modelValue, () => props.reserva.id],
  ([abierto]) => {
    if (abierto) reiniciar();
  },
  { immediate: true }
);

function elegirFecha(nueva: string): void {
  fecha.value = nueva;
  hora.value = null;
  error.value = '';
}

function elegirHora(nueva: string): void {
  hora.value = nueva;
  error.value = '';
}

function reintentarHuecos(): void {
  void disponibilidad.refetch();
}

/**
 * Mientras se mueve no se cierra: ni con la X, ni con «Volver», ni con Escape
 * o el velo (`persistent` los frena en Quasar; esto, por si algo pidiera
 * cerrar igual). Cerrar a mitad dejaba reabrir la misma cita y mandar un
 * segundo PATCH, callaba un fallo y, si la página desmontaba el diálogo,
 * perdía el éxito. Es la regla del cajón de reserva.
 */
function alCambiarVisibilidad(valor: boolean): void {
  if (!valor && guardando.value) return;
  emit('update:modelValue', valor);
}

function cerrar(): void {
  alCambiarVisibilidad(false);
}

async function guardar(): Promise<void> {
  if (!puedeGuardar.value || !fecha.value || !hora.value) return;
  const iso = bookingSelectionToUtcIso(fecha.value, hora.value);
  if (!iso) {
    error.value = 'No se pudo interpretar esa fecha y hora.';
    return;
  }

  const mia = vuelta;
  const reserva = props.reserva;
  guardando.value = true;
  error.value = '';
  let estilistaNueva: string;
  try {
    const movida = await rescheduleReservation(reserva.id, iso);
    estilistaNueva = movida.workerId;
  } catch (fallo) {
    if (mia !== vuelta) return;
    error.value = rescheduleErrorMessage(fallo, reserva);
    guardando.value = false;
    // El hueco que parecía libre ya no lo está (o no se pudo saber): se
    // vuelve a pedir el día para que las fichas digan la verdad.
    void disponibilidad.refetch();
    return;
  }

  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.reservations.all }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.workerAvailability.all,
    }),
    queryClient.invalidateQueries({ queryKey: queryKeys.occupancy.all }),
  ]);
  // Cerrado a mitad, la cita se movió igual: la página lo sabe por aquí.
  emit('reprogramada', reserva.id, estilistaNueva);
  if (mia !== vuelta) return;
  guardando.value = false;
  emit('update:modelValue', false);
}
</script>

<style scoped lang="scss">
/**
 * Tablero MisReservasA · Móvil 2: cabecera tinta con «Cambiar fecha» en
 * Marcellus y la cita actual en piedra clara (10,3:1); cuerpo hueso con las
 * etiquetas en versalitas de oro profundo; pie nieve con la cita nueva sobre
 * hueso, «Volver» y la píldora tinta «Mover la cita». En escritorio, el mismo
 * panel en un diálogo de 560 px.
 */
.cambiar-fecha {
  /* Quasar quita los clics a `.q-dialog__inner` y solo los devuelve a sus
     hijos `<div>`: sin esto, cada clic atraviesa la raíz y cae en el velo. */
  pointer-events: all;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  width: min(560px, calc(100vw - 32px));
  max-height: calc(100vh - 48px);
  overflow: hidden;
  border-radius: var(--m-radio-panel);
  background: var(--m-hueso);
  color: var(--m-tinta);
  font-family: var(--m-font-sans);
}

/* `maximized` + `standard`: la capa es `fixed-full` (alto de la pantalla
   visible, también con la barra de Safari) y el panel la llena. Cabecera y pie
   no encogen; desplaza solo el cuerpo. Sin `vh`: el 100 % de una capa fija es
   el alto real, y Safari 13.1 no sabe de `dvh`. */
.cambiar-fecha--hoja {
  width: 100%;
  max-width: 100%;
  height: 100%;
  max-height: 100%;
  border-radius: 0;
}

.cambiar-fecha__cabecera {
  flex-shrink: 0;
  padding: 0 6px 14px 20px;
  background: var(--m-tinta);
  color: var(--m-hueso);
}

.cambiar-fecha__barra {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 60px;
}

.cambiar-fecha__titulo {
  margin: 0;
  font-family: var(--m-font-display);
  font-size: 22px;
  font-weight: 400;
}

.cambiar-fecha__cerrar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--m-tactil-min);
  height: var(--m-tactil-min);
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--m-hueso);
  cursor: pointer;
}

.cambiar-fecha__cerrar:focus-visible {
  outline: 2px solid var(--m-hueso);
  outline-offset: 2px;
}

.cambiar-fecha__ahora {
  margin: 0;
  padding-right: 14px;
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--m-piedra-clara);
}

.cambiar-fecha__ahora-valor {
  color: var(--m-hueso);
}

.cambiar-fecha__cuerpo {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 16px 20px 20px;
}

.cambiar-fecha__etiqueta {
  margin: 18px 0 8px;
  font-size: 10.5px;
  font-weight: 400;
  letter-spacing: var(--m-tracking-etiqueta);
  text-transform: uppercase;
  color: var(--m-oro-profundo);
}

.cambiar-fecha__bloque .cambiar-fecha__etiqueta {
  margin-top: 0;
}

.cambiar-fecha__nota {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--m-piedra);
}

.cambiar-fecha__aviso {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 8px 0 0;
  padding: 10px 12px;
  border: var(--m-filete-grosor) solid var(--m-filete);
  border-radius: var(--m-radio-tarjeta);
  background: var(--m-aviso-fondo);
  color: var(--m-tinta);
  font-size: 13px;
  line-height: 1.45;
}

.cambiar-fecha__aviso-icono {
  flex-shrink: 0;
  margin-top: 1px;
  color: var(--m-oro-profundo);
}

.cambiar-fecha__error-huecos {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin: 12px 0 0;
  font-size: 13px;
  color: var(--m-peligro);
}

.cambiar-fecha__reintentar {
  min-height: var(--m-tactil-min);
  padding: 0 16px;
  border: var(--m-filete-grosor) solid var(--m-tinta);
  border-radius: var(--m-radio-pildora);
  background: transparent;
  color: var(--m-tinta);
  font-family: var(--m-font-sans);
  font-size: 12px;
  cursor: pointer;
}

.cambiar-fecha__choque {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-top: 16px;
  padding: 12px 14px;
  border: var(--m-filete-grosor) solid var(--m-peligro);
  border-radius: var(--m-radio-tarjeta);
  background: var(--m-nieve);
  color: var(--m-peligro);
  font-size: 13px;
  line-height: 1.45;
}

.cambiar-fecha__choque-icono {
  flex-shrink: 0;
  margin-top: 1px;
}

.cambiar-fecha__pie {
  flex-shrink: 0;
  border-top: var(--m-filete-grosor) solid var(--m-filete);
  background: var(--m-nieve);
}

.cambiar-fecha__nueva {
  margin: 0;
  padding: 9px 20px;
  border-bottom: var(--m-filete-grosor) solid var(--m-filete);
  background: var(--m-hueso);
  font-size: 12.5px;
}

.cambiar-fecha__acciones {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 76px;
  padding: 0 20px env(safe-area-inset-bottom, 0px);
}

.cambiar-fecha__volver {
  min-height: var(--m-tactil-min);
  padding: 0 4px;
  border: 0;
  background: transparent;
  color: var(--m-piedra);
  font-family: var(--m-font-sans);
  font-size: 13px;
  cursor: pointer;
}

.cambiar-fecha__guardar {
  min-height: 48px;
  padding: 0 26px;
  border: 0;
  border-radius: var(--m-radio-pildora);
  background: var(--m-tinta);
  color: var(--m-hueso);
  font-family: var(--m-font-sans);
  font-size: 12px;
  letter-spacing: var(--m-tracking-nav);
  text-transform: uppercase;
  cursor: pointer;
}

.cambiar-fecha__cerrar:disabled,
.cambiar-fecha__volver:disabled,
.cambiar-fecha__guardar:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.cambiar-fecha__volver:focus-visible,
.cambiar-fecha__guardar:focus-visible,
.cambiar-fecha__reintentar:focus-visible {
  outline: 2px solid var(--m-tinta);
  outline-offset: 2px;
}

/**
 * Realce al pasar (solo puntero fino): el COLOR. La X y «Mover la cita» se
 * leen sobre tinta, donde el oro da 5,7:1; «Volver» y «Reintentar», sobre
 * claro, nunca en oro claro.
 */
@media (hover: hover) and (pointer: fine) {
  .cambiar-fecha__cerrar:hover:not(:disabled) {
    color: var(--m-oro);
  }

  .cambiar-fecha__volver:hover:not(:disabled) {
    color: var(--m-oro-profundo);
  }

  .cambiar-fecha__reintentar:hover {
    border-color: var(--m-oro);
  }

  .cambiar-fecha__guardar:hover:not(:disabled) {
    color: var(--m-oro);
  }
}
</style>

<!--
  Sin `scoped` a propósito: el velo lo pinta QDialog fuera del ámbito. La clase
  `cambiar-fecha-dialogo` viaja a la raíz del diálogo, así que la regla no se
  escapa a otro.
-->
<style lang="scss">
.cambiar-fecha-dialogo .q-dialog__backdrop {
  background: var(--m-velo);
}
</style>
