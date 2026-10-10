<template>
  <q-page class="bandeja" :class="{ 'bandeja--escritorio': esEscritorio }">
    <section class="bandeja__principal" aria-labelledby="bandeja-titulo">
      <header class="bandeja__cabecera">
        <div>
          <p class="bandeja__antetitulo">Vigentes · de hoy en adelante</p>
          <h1 id="bandeja-titulo" class="bandeja__titulo">Reservas</h1>
        </div>
        <div class="bandeja__vivo" data-test="en-vivo">
          <span
            class="bandeja__punto"
            :class="{ 'bandeja__punto--apagado': !enVivo }"
            aria-hidden="true"
          />
          <span>{{ enVivo ? 'En vivo' : 'Sin tiempo real' }}</span>
          <button
            v-if="!enVivo"
            type="button"
            class="bandeja__boton"
            data-test="actualizar"
            :disabled="query.isFetching.value"
            @click="() => refrescar()"
          >
            Actualizar
          </button>
        </div>
      </header>

      <PestanasBandeja
        :activa="pestana"
        :cuentas="cuentas"
        @elegir="elegirPestana"
      />

      <AvisosFijados
        :avisos="avisos"
        :ids-en-lista="idsEnLista"
        @ver="verAviso"
        @descartar="descartar"
      />

      <!--
        Foco 3: el error de confirmar/cancelar se pinta en la fila, el panel o
        el diálogo, pero el refresco que dispara se los suele llevar (la fila
        sale de «Pendientes», el diálogo se cierra). Esta línea sobrevive: se va
        con la acción siguiente o cuando la dueña la cierra. La región existe
        siempre para que el lector de pantalla anuncie lo que entra en ella.
      -->
      <div class="bandeja__region-accion" role="status" aria-live="polite">
        <p
          v-if="avisoAccion"
          class="bandeja__aviso-accion"
          data-test="aviso-accion"
        >
          <StrokeIcon
            class="bandeja__aviso-icono"
            nombre="alerta"
            :tamano="16"
          />
          <span class="bandeja__aviso-texto">{{ avisoAccion }}</span>
          <button
            type="button"
            class="bandeja__aviso-cerrar m-boton-plano"
            data-test="cerrar-aviso-accion"
            aria-label="Cerrar el aviso"
            @click="avisoAccion = null"
          >
            <StrokeIcon nombre="cerrar" :tamano="16" />
          </button>
        </p>
      </div>

      <div
        id="bandeja-panel"
        ref="panelLista"
        class="bandeja__lista"
        role="tabpanel"
        :aria-labelledby="`pestana-${pestana}`"
        tabindex="0"
      >
        <div
          v-if="query.isLoading.value"
          class="bandeja__cargando"
          data-test="bandeja-cargando"
          aria-busy="true"
          aria-label="Cargando las reservas"
        >
          <span v-for="n in 3" :key="n" class="bandeja__esqueleto" />
        </div>

        <div
          v-else-if="query.isError.value && !query.data.value"
          class="bandeja__error"
          role="alert"
          data-test="bandeja-error"
        >
          <p class="bandeja__error-texto">
            No se pudieron cargar las reservas.
          </p>
          <button
            type="button"
            class="bandeja__boton"
            data-test="reintentar"
            @click="() => query.refetch()"
          >
            Reintentar
          </button>
        </div>

        <template v-else>
          <!-- Falló un refresco en segundo plano: la lista que había sigue
               valiendo y se conserva; solo se avisa encima. -->
          <p
            v-if="query.isError.value"
            class="bandeja__error-refresco"
            role="status"
            data-test="bandeja-error-refresco"
          >
            <span>No se pudo actualizar la lista.</span>
            <button
              type="button"
              class="bandeja__boton"
              data-test="reintentar"
              :disabled="query.isFetching.value"
              @click="() => query.refetch()"
            >
              Reintentar
            </button>
          </p>
          <p
            v-if="grupos.length === 0"
            class="bandeja__vacio"
            data-test="bandeja-vacia"
          >
            {{ TEXTO_VACIO[pestana] }}
          </p>
          <section
            v-for="grupo in grupos"
            :key="grupo.ymd"
            class="bandeja__grupo"
            data-test="grupo-dia"
            :aria-labelledby="`dia-${grupo.ymd}`"
          >
            <h2
              :id="`dia-${grupo.ymd}`"
              class="bandeja__dia"
              data-test="titulo-dia"
            >
              {{ grupo.titulo }}
            </h2>
            <FilaReserva
              v-for="r in grupo.reservas"
              :key="r.id"
              :reserva="r"
              :seleccionada="r.id === seleccionadaId"
              :nueva="nuevas.includes(r.id)"
              :compacta="esMovil"
              :confirmando="ocupadaDe(r.id) === 'confirmar'"
              :bloqueada="ocupada !== null"
              :error="errorDe(r.id)"
              @abrir="abrir"
              @confirmar="confirmar"
            />
          </section>
          <p class="bandeja__pie" data-test="bandeja-pie">
            <StrokeIcon
              class="bandeja__pie-icono"
              nombre="check"
              :tamano="16"
            />{{ grupos.length ? textoDelPie(pestana) : NOTA_CANCELADAS }}
          </p>
        </template>
      </div>
    </section>

    <aside
      v-if="esEscritorio"
      class="bandeja__detalle"
      aria-label="Reserva seleccionada"
    >
      <DetalleReserva
        v-if="seleccionada"
        variante="panel"
        :reserva="seleccionada"
        :ocupada="ocupadaDe(seleccionada.id)"
        :bloqueada="ocupada !== null"
        :error="errorDe(seleccionada.id)"
        @confirmar="confirmar"
        @mover="moverAbierto = true"
        @cancelar="pedirCancelar"
      />
      <p v-else class="bandeja__sin-seleccion" data-test="detalle-vacio">
        Elige una reserva de la lista para ver su detalle.
      </p>
    </aside>

    <q-dialog
      v-else
      v-model="detalleMovilAbierto"
      maximized
      transition-show="slide-left"
      transition-hide="slide-right"
      @hide="() => void recogerFoco()"
    >
      <!-- Al acabar de salir (`hide`), Quasar devuelve el foco a la fila que la
           abrió; si la fila ya no está (la cancelaron), cae al body y lo
           recoge la lista. -->
      <!-- La capa tiene alto definido y es la que se desplaza: así la ficha
           (`min-height: 100%`) llena la pantalla y sus acciones se pegan abajo. -->
      <div class="bandeja__pantalla">
        <DetalleReserva
          v-if="seleccionada"
          variante="pantalla"
          :reserva="seleccionada"
          :ocupada="ocupadaDe(seleccionada.id)"
          :bloqueada="ocupada !== null"
          :error="errorDe(seleccionada.id)"
          @confirmar="confirmar"
          @mover="moverAbierto = true"
          @cancelar="pedirCancelar"
          @volver="seleccionadaId = null"
        />
      </div>
    </q-dialog>

    <!--
      A3: la dueña mueve con la misma pieza que la clienta (plan 2). Sin
      estilista: `PATCH /reschedule` solo acepta `scheduledAt`; la estilista la
      conserva quien la eligió y la vuelve a repartir el sistema si no.
    -->
    <CambiarFechaDialog
      v-if="seleccionada"
      v-model="moverAbierto"
      :reserva="seleccionada"
      :permitir-estilista="false"
      @reprogramada="alReprogramar"
    />

    <!-- Un solo cerrojo para toda la página: con cualquier acción en vuelo,
         «Cancelar la cita» espera apagado (`bloqueada`); «Cancelando…», el
         diálogo persistente y «Volver» apagado son solo de cancelar. -->
    <CancelarReservaBandeja
      v-model="cancelarAbierto"
      :reserva="seleccionada"
      :hoja="esMovil"
      :ocupada="ocupada?.accion === 'cancelar'"
      :bloqueada="ocupada !== null"
      :error="errorCancelar"
      @confirmar="cancelarSeleccionada"
    />
  </q-page>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue';
import AvisosFijados from 'src/components/admin-reservas/AvisosFijados.vue';
import CancelarReservaBandeja from 'src/components/admin-reservas/CancelarReservaBandeja.vue';
import DetalleReserva from 'src/components/admin-reservas/DetalleReserva.vue';
import FilaReserva from 'src/components/admin-reservas/FilaReserva.vue';
import PestanasBandeja from 'src/components/admin-reservas/PestanasBandeja.vue';
import CambiarFechaDialog from 'src/components/reservations/CambiarFechaDialog.vue';
import StrokeIcon from 'src/components/shared/StrokeIcon.vue';
import {
  useAvisosEnVivo,
  type AvisoEnVivo,
} from 'src/composables/notifications/avisosEnVivo';
import { useAdminReservations } from 'src/composables/reservations/useAdminReservations';
import { useConsultaMedios } from 'src/composables/shared/useConsultaMedios';
import {
  falloDeAccion,
  type AccionBandeja,
} from 'src/helpers/acciones-bandeja';
import {
  NOTA_CANCELADAS,
  TEXTO_VACIO,
  agruparPorDia,
  contarPorPestana,
  filtrarPorPestana,
  ordenarPorHora,
  textoDelPie,
  type PestanaBandeja,
} from 'src/helpers/admin-reservation-filter';
import { getSalonNowParts } from 'src/helpers/businessHours';
import { CONSULTA_MOVIL_RESERVAS } from 'src/helpers/my-reservations';

/**
 * «La bandeja»: la página de reservas de la dueña (spec §3, A1–A5; tablero
 * `AdminReservasB`). Lista las vigentes por pestaña y por día, abre la ficha a
 * la derecha (escritorio, ≥ 1024 px) o a pantalla completa, y fija encima los
 * avisos en tiempo real que recibe `useAdminNotifications`.
 *
 * Toda acción pasa por los casos de uso del backend (confirmar, reprogramar,
 * cancelar), que son los que disparan los cuatro avisos: la página no
 * reproduce ninguna regla, solo traduce sus errores.
 */
defineOptions({ name: 'AdminReservationsPage' });

const { query, confirm, cancel, refrescar } = useAdminReservations();
const vivos = useAvisosEnVivo();
const { avisos, enVivo } = vivos;

const esEscritorio = useConsultaMedios('(min-width: 1024px)', true);
// El mismo corte que los diálogos de «Mis reservas» (plan 2): hoja por debajo de 700.
const esMovil = useConsultaMedios(CONSULTA_MOVIL_RESERVAS, false);

const pestana = ref<PestanaBandeja>('pendientes');
// «Hoy» se recalcula con cada lista nueva: una pestaña abierta de un día para
// otro no se queda en ayer.
const hoy = ref(getSalonNowParts().ymd);
watch(
  () => query.data.value,
  () => {
    hoy.value = getSalonNowParts().ymd;
  }
);

const todas = computed(() => ordenarPorHora(query.data.value ?? []));
const cuentas = computed(() => contarPorPestana(todas.value, hoy.value));
const grupos = computed(() =>
  agruparPorDia(
    filtrarPorPestana(todas.value, pestana.value, hoy.value),
    hoy.value
  )
);
const idsEnLista = computed(() => todas.value.map((r) => r.id));
const nuevas = computed(() =>
  avisos.value
    .filter((a) => a.evento === 'reservation.created')
    .map((a) => a.reservationId)
);

// La ficha se busca en la lista viva: si la reserva sale de ella (la cancelaron
// por WhatsApp, terminó su hora), la ficha se suelta sola (Foco 1).
const seleccionadaId = ref<string | null>(null);
const seleccionada = computed(
  () => todas.value.find((r) => r.id === seleccionadaId.value) ?? null
);
const detalleMovilAbierto = computed({
  get: () => !esEscritorio.value && seleccionada.value !== null,
  set: (abierto: boolean) => {
    if (!abierto) seleccionadaId.value = null;
  },
});

const ocupada = ref<{ id: string; accion: AccionBandeja } | null>(null);
const errorAccion = ref<{ id: string; mensaje: string } | null>(null);
/**
 * El último fallo de confirmar o cancelar, sobre la lista (Foco 3). Regla: se
 * va al empezar la acción siguiente o al cerrarlo; cambiar de pestaña no lo
 * borra («la lista se actualizó» vale para todas).
 */
const avisoAccion = ref<string | null>(null);
const cancelarAbierto = ref(false);
const errorCancelar = ref<string | null>(null);
const moverAbierto = ref(false);

const panelLista = ref<HTMLElement | null>(null);

/**
 * Si lo ocurrido se llevó el control enfocado (la fila salió de la pestaña, la
 * ficha se soltó), el foco cae al `<body>` y quien usa el teclado vuelve a
 * empezar desde arriba: lo recoge la lista. Con `forzar`, aunque el foco siga
 * aún en un diálogo que se está cerrando. Sin `preventScroll`, enfocar la
 * lista la desplazaría a la vista.
 */
async function recogerFoco(forzar = false) {
  await nextTick();
  const activo = document.activeElement;
  const perdido = !activo || activo === document.body || !activo.isConnected;
  if (forzar || perdido) panelLista.value?.focus({ preventScroll: true });
}

watch(seleccionada, (reserva) => {
  if (reserva) return;
  cancelarAbierto.value = false;
  moverAbierto.value = false;
  void recogerFoco();
});

function ocupadaDe(id: string): AccionBandeja | null {
  return ocupada.value?.id === id ? ocupada.value.accion : null;
}

function errorDe(id: string): string | null {
  return errorAccion.value?.id === id ? errorAccion.value.mensaje : null;
}

function elegirPestana(nueva: PestanaBandeja) {
  pestana.value = nueva;
}

/**
 * Abrirla es haberla visto: su aviso de «Nueva» (y con él la etiqueta de la
 * fila) se descarta, igual que con «Ver». Los demás avisos de esa reserva se
 * quedan.
 */
function abrir(id: string) {
  seleccionadaId.value = id;
  for (const aviso of avisos.value) {
    if (aviso.evento === 'reservation.created' && aviso.reservationId === id)
      vivos.descartar(aviso.id);
  }
}

async function confirmar(id: string) {
  // Una acción a la vez: el segundo clic de un doble clic no manda otro PATCH.
  if (ocupada.value) return;
  ocupada.value = { id, accion: 'confirmar' };
  errorAccion.value = null;
  avisoAccion.value = null;
  try {
    await confirm.mutateAsync(id);
  } catch (err) {
    const fallo = falloDeAccion(err, 'confirmar');
    errorAccion.value = { id, mensaje: fallo.mensaje };
    avisoAccion.value = fallo.mensaje;
    if (fallo.refrescar) void refrescar();
  } finally {
    ocupada.value = null;
  }
  await recogerFoco();
}

function pedirCancelar() {
  errorCancelar.value = null;
  cancelarAbierto.value = true;
}

async function cancelarSeleccionada() {
  const objetivo = seleccionada.value;
  if (!objetivo) {
    cancelarAbierto.value = false;
    return;
  }
  if (ocupada.value) return;
  ocupada.value = { id: objetivo.id, accion: 'cancelar' };
  errorCancelar.value = null;
  avisoAccion.value = null;
  try {
    await cancel.mutateAsync(objetivo.id);
    cancelarAbierto.value = false;
    seleccionadaId.value = null;
    // El foco está en «Cancelar la cita», dentro de un diálogo que se cierra.
    void recogerFoco(true);
  } catch (err) {
    const fallo = falloDeAccion(err, 'cancelar');
    errorCancelar.value = fallo.mensaje;
    avisoAccion.value = fallo.mensaje;
    if (fallo.refrescar) void refrescar();
  } finally {
    ocupada.value = null;
  }
}

/**
 * `CambiarFechaDialog` avisa con `(id, workerId)`; la mutación del plan 2 ya
 * invalida la lista, y refrescar otra vez no cuesta nada.
 */
function alReprogramar() {
  void refrescar();
}

function verAviso(aviso: AvisoEnVivo) {
  const reserva = todas.value.find((r) => r.id === aviso.reservationId);
  if (!reserva) return;
  if (filtrarPorPestana([reserva], pestana.value, hoy.value).length === 0) {
    pestana.value = 'todas';
  }
  seleccionadaId.value = reserva.id;
  vivos.descartar(aviso.id);
}

function descartar(id: number) {
  vivos.descartar(id);
}

// Con la bandeja a la vista, el aviso en tiempo real solo se fija (A5).
onMounted(() => vivos.marcarBandeja(true));
onBeforeUnmount(() => vivos.marcarBandeja(false));
</script>

<style lang="scss" scoped>
/* Tablero `AdminReservasB`: página tinta; en escritorio, lista a la izquierda
   con 32 px de margen y la ficha clara de 400 px a la derecha. */
.bandeja {
  min-height: 100%;
  background: var(--m-tinta);
  color: var(--m-hueso);
  font-family: var(--m-font-sans);
}

.bandeja--escritorio {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 400px;
  column-gap: 32px;
  align-items: start;
}

/* Abajo, el hueco del lanzador del asistente (fijo en la esquina): sin él,
   la píldora tapa el pie de la lista al llegar al final. */
.bandeja__principal {
  min-width: 0;
  padding: 0 var(--m-banda-margen-movil) calc(32px + var(--m-flotante-despeje));
}

.bandeja--escritorio .bandeja__principal {
  padding: 0 0 48px 32px;
}

.bandeja__cabecera {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 0 10px;
}

.bandeja--escritorio .bandeja__cabecera {
  align-items: center;
  min-height: 92px;
  padding: 0;
}

.bandeja__antetitulo {
  display: none;
  margin: 0 0 8px;
  color: var(--m-oro);
  font-size: 11px;
  letter-spacing: var(--m-tracking-marca);
  text-transform: uppercase;
}

.bandeja--escritorio .bandeja__antetitulo {
  display: block;
}

.bandeja__titulo {
  margin: 0;
  font-family: var(--m-font-display);
  font-size: 24px;
  font-weight: 400;
  line-height: 1;
}

.bandeja--escritorio .bandeja__titulo {
  font-size: 28px;
}

.bandeja__vivo {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--m-piedra-clara);
  font-size: 12px;
}

.bandeja__punto {
  width: 8px;
  height: 8px;
  flex-shrink: 0;
  box-sizing: border-box;
  border-radius: 50%;
  background: var(--m-oro);
  box-shadow: 0 0 0 3px var(--m-filete-oscuro);
}

.bandeja__punto--apagado {
  border: var(--m-filete-grosor) solid var(--m-piedra-clara);
  background: transparent;
  box-shadow: none;
}

.bandeja__boton {
  min-height: var(--m-tactil-min);
  padding: 0 14px;
  border: var(--m-filete-grosor) solid var(--m-filete-oscuro);
  border-radius: var(--m-radio-pildora);
  background: transparent;
  color: var(--m-hueso);
  font-family: var(--m-font-sans);
  font-size: 11px;
  letter-spacing: var(--m-tracking-nav);
  text-transform: uppercase;
  cursor: pointer;
}

.bandeja__boton:disabled {
  opacity: 0.6;
  cursor: progress;
}

/* El fallo de una acción, sobre tinta: texto hueso, acento rosa (el único de
   la pantalla) en el filete y el icono. */
.bandeja__aviso-accion {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 12px 0 0;
  padding: 0 4px 0 14px;
  border: var(--m-filete-grosor) solid var(--m-filete-oscuro);
  border-left: 3px solid var(--m-rosa);
  border-radius: var(--m-radio-tarjeta);
  background: var(--m-carbon);
  color: var(--m-hueso);
  font-size: 13px;
  line-height: 1.45;
}

.bandeja__aviso-icono {
  flex-shrink: 0;
  color: var(--m-rosa);
}

.bandeja__aviso-texto {
  flex: 1;
  min-width: 0;
  padding: 10px 0;
}

.bandeja__aviso-cerrar {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: var(--m-tactil-min);
  height: var(--m-tactil-min);
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--m-piedra-clara);
  cursor: pointer;
}

.bandeja__dia {
  margin: 18px 0 10px;
  color: var(--m-oro);
  font-family: var(--m-font-sans);
  font-size: 10.5px;
  font-weight: 400;
  /* Sin esto hereda el `line-height: 3.75rem` del h2 de Quasar: 60 px de
     alto para una etiqueta de 10,5 px. */
  line-height: 1.4;
  letter-spacing: var(--m-tracking-etiqueta);
  text-transform: uppercase;
}

.bandeja__esqueleto {
  display: block;
  height: 86px;
  margin: 18px 0 10px;
  border-radius: var(--m-radio-tarjeta);
  background: var(--m-carbon);
}

.bandeja__error {
  margin-top: 26px;
}

.bandeja__error-refresco {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 16px;
  margin: 12px 0 0;
  padding: 6px 6px 6px 14px;
  border: var(--m-filete-grosor) solid var(--m-filete-oscuro);
  border-radius: var(--m-radio-tarjeta);
  background: var(--m-carbon);
  color: var(--m-hueso);
  font-size: 13px;
}

.bandeja__error-texto {
  margin: 0 0 12px;
  font-size: 14px;
}

.bandeja__vacio {
  margin: 26px 0 0;
  font-family: var(--m-font-display);
  font-size: 20px;
}

.bandeja__pie {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 26px 0 0;
  color: var(--m-piedra-clara);
  font-size: 13px;
}

.bandeja__pie-icono {
  flex-shrink: 0;
  color: var(--m-oro);
}

/* La ficha se queda a la vista al desplazar la lista, justo bajo la cabecera
   del sitio, que es fija. */
.bandeja__detalle {
  position: sticky;
  top: var(--m-cabecera-alto);
  height: calc(100vh - var(--m-cabecera-alto));
  overflow-y: auto;
  box-sizing: border-box;
  /* Las acciones van al pie de la ficha, justo donde flota el lanzador del
     asistente: sin este hueco, la píldora tapa «Cancelar». */
  padding: 26px 30px var(--m-flotante-despeje);
  background: var(--m-hueso);
  color: var(--m-tinta);
}

.bandeja__sin-seleccion {
  margin: 0;
  color: var(--m-piedra);
  font-size: 14px;
}

/* Móvil: la capa del diálogo maximizado, con alto definido; es ella la que
   se desplaza, para que la ficha llene la pantalla y sus acciones se peguen
   abajo. */
.bandeja__pantalla {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  background: var(--m-hueso);
}

.bandeja__lista:focus-visible,
.bandeja__boton:focus-visible,
.bandeja__aviso-cerrar:focus-visible {
  outline: 2px solid var(--m-hueso);
  outline-offset: 2px;
}

/**
 * Realce al pasar (solo puntero fino): el COLOR. El movimiento es global, en
 * `app.scss` («Realce y hundido»).
 */
@media (hover: hover) and (pointer: fine) {
  .bandeja__boton:hover:not(:disabled) {
    border-color: var(--m-oro);
  }

  .bandeja__aviso-cerrar:hover {
    color: var(--m-hueso);
  }
}
</style>
