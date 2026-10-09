<template>
  <q-page class="mis-reservas">
    <div class="mis-reservas__columna">
      <header class="mis-reservas__cabecera">
        <div>
          <p class="mis-reservas__antetitulo">Tu cuenta</p>
          <h1 class="mis-reservas__titulo">Mis reservas</h1>
          <p class="mis-reservas__lede">
            Puedes mover o cancelar una cita hasta la hora en que empieza.
          </p>
        </div>
        <button
          type="button"
          class="mis-reservas__actualizar"
          data-test="actualizar"
          :disabled="query.isFetching.value"
          :aria-busy="query.isFetching.value ? 'true' : 'false'"
          @click="actualizar"
        >
          <StrokeIcon
            nombre="actualizar"
            :tamano="16"
            class="mis-reservas__actualizar-icono"
          />
          <span class="mis-reservas__actualizar-texto">Actualizar</span>
        </button>
      </header>

      <p
        v-if="aviso"
        class="mis-reservas__aviso"
        role="status"
        data-test="aviso-pagina"
      >
        <span data-test="aviso-texto">{{ aviso }}</span>
        <button
          type="button"
          class="mis-reservas__descartar m-boton-plano"
          aria-label="Descartar el aviso"
          data-test="descartar-aviso"
          @click="aviso = ''"
        >
          <StrokeIcon nombre="cerrar" :tamano="16" />
        </button>
      </p>

      <p
        v-if="query.isLoading.value"
        class="mis-reservas__estado"
        role="status"
        data-test="cargando"
      >
        Cargando tus reservas…
      </p>

      <div
        v-else-if="query.isError.value"
        class="mis-reservas__error"
        role="alert"
        data-test="error-carga"
      >
        <p class="mis-reservas__error-texto">
          No se pudieron cargar tus reservas. Revisa tu conexión e inténtalo de
          nuevo.
        </p>
        <button
          type="button"
          class="mis-reservas__reintentar"
          data-test="reintentar"
          @click="actualizar"
        >
          Reintentar
        </button>
      </div>

      <div
        v-else-if="todas.length === 0"
        class="mis-reservas__vacio"
        data-test="vacio"
      >
        <p class="mis-reservas__vacio-texto">Todavía no tienes reservas.</p>
        <router-link
          to="/services"
          class="mis-reservas__ver-servicios"
          data-test="ver-servicios"
          ><span class="mis-reservas__ver-servicios-texto"
            >Ver servicios →</span
          ></router-link
        >
      </div>

      <template v-else>
        <section
          v-if="proximas.length"
          aria-labelledby="mis-reservas-proximas"
          data-test="seccion-proximas"
        >
          <h2 id="mis-reservas-proximas" class="mis-reservas__seccion">
            Próximas · {{ proximas.length }}
          </h2>
          <div class="mis-reservas__rejilla">
            <TarjetaReserva
              v-for="reserva in proximas"
              :key="reserva.id"
              :reserva="reserva"
              :ahora="ahora"
              :cancelable="isCancelable(reserva, ahora)"
              :movible="isReschedulable(reserva, ahora)"
              @cancelar="abrirCancelar"
              @cambiar-fecha="abrirMover"
            />
          </div>
        </section>
        <p v-else class="mis-reservas__sin-proximas" data-test="sin-proximas">
          No tienes citas próximas.
          <router-link to="/services" class="mis-reservas__ver-servicios"
            ><span class="mis-reservas__ver-servicios-texto"
              >Ver servicios →</span
            ></router-link
          >
        </p>

        <section v-if="pasadas.length" class="mis-reservas__pasadas">
          <button
            type="button"
            class="mis-reservas__plegar m-boton-plano m-boton--ancho"
            :aria-expanded="pasadasAbiertas ? 'true' : 'false'"
            aria-controls="mis-reservas-lista-pasadas"
            data-test="plegar-pasadas"
            @click="pasadasAbiertas = !pasadasAbiertas"
          >
            <span class="mis-reservas__seccion mis-reservas__seccion--plegable"
              >Pasadas · {{ pasadas.length }}</span
            >
            <StrokeIcon
              nombre="chevron-abajo"
              :tamano="16"
              class="mis-reservas__chevron"
              :class="{ 'mis-reservas__chevron--abierto': pasadasAbiertas }"
            />
          </button>
          <ul
            v-if="pasadasAbiertas"
            id="mis-reservas-lista-pasadas"
            class="mis-reservas__lista-pasadas"
            data-test="lista-pasadas"
          >
            <FilaPasada
              v-for="reserva in pasadas"
              :key="reserva.id"
              :reserva="reserva"
              @resena="dejarResena"
            />
          </ul>
        </section>
      </template>
    </div>

    <!-- Se monta al abrir la primera vez y ya no se desmonta: `aMover` nunca
         vuelve a null, así un PATCH en vuelo siempre encuentra quien escuche
         `reprogramada`. -->
    <CambiarFechaDialog
      v-if="aMover"
      v-model="moverAbierto"
      :reserva="aMover"
      @reprogramada="alReprogramar"
    />
    <CancelarReservaDialog
      :model-value="cancelarAbierto"
      :reserva="aCancelar"
      :cancelando="cancelandoId !== null"
      :error="errorCancelar"
      @update:model-value="alCambiarCancelar"
      @confirmar="confirmarCancelacion"
    />
  </q-page>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import StrokeIcon from 'src/components/shared/StrokeIcon.vue';
import TarjetaReserva from 'src/components/reservations/TarjetaReserva.vue';
import FilaPasada from 'src/components/reservations/FilaPasada.vue';
import CambiarFechaDialog from 'src/components/reservations/CambiarFechaDialog.vue';
import CancelarReservaDialog from 'src/components/reservations/CancelarReservaDialog.vue';
import { useMyReservations } from 'src/composables/reservations/useMyReservations';
import { useReviewDialog } from 'src/composables/reviews/useReviewDialog';
import {
  cancelErrorMessage,
  fechaDeCita,
  isCancelable,
  isReschedulable,
  rescheduleSuccessMessage,
  splitReservationsByTime,
} from 'src/helpers/my-reservations';
import type { ReservationDto } from 'src/interfaces/booking';

/**
 * «Mis reservas», agenda clara (M1–M6 de la especificación de las vistas
 * restantes; tablero MisReservasA). Próximas en tarjetas, pasadas plegadas en
 * filas, mover y cancelar en diálogos propios, y los resultados en línea:
 * aquí no queda ningún aviso flotante de Quasar.
 */
defineOptions({ name: 'MyReservationsPage' });

const { query, cancel } = useMyReservations();
// `solicitar` y no `abrir`: la regla de quién puede reseñar (y rellenar el
// nombre) la registra el armazón, y se dispara por aquí.
const { solicitar: pedirResena } = useReviewDialog();

// Instante de referencia para separar próximas y pasadas y para la cortesía de
// los botones. La regla real la aplica el backend. Se renueva con cada
// respuesta del servidor y al pulsar «Actualizar», para que una cita cuya hora
// ya pasó salga de «Próximas». Se vigila `dataUpdatedAt` y no `data`: si la
// lista vuelve igual, TanStack conserva el MISMO objeto (lo comparte) y un
// vigilante de `data` no se enteraba; la pestaña abierta desde ayer seguía
// diciendo «Mañana» el día de la cita.
const ahora = ref(new Date());
watch(
  () => query.dataUpdatedAt.value,
  () => {
    ahora.value = new Date();
  }
);

const todas = computed<ReservationDto[]>(() => query.data.value ?? []);
const division = computed(() =>
  splitReservationsByTime(todas.value, ahora.value)
);
const proximas = computed(() => division.value.upcoming);
const pasadas = computed(() => division.value.past);
const pasadasAbiertas = ref(false);

/** El resultado de mover o cancelar, en línea y descartable. */
const aviso = ref('');

function actualizar(): void {
  ahora.value = new Date();
  void query.refetch();
}

function dejarResena(): void {
  pedirResena();
}

// --- Cambiar fecha -----------------------------------------------------------

// Nunca vuelve a null: el diálogo exige una reserva y debe seguir montado
// mientras su PATCH esté en vuelo (ver la plantilla).
const aMover = ref<ReservationDto | null>(null);
const moverAbierto = ref(false);

function abrirMover(reserva: ReservationDto): void {
  aviso.value = '';
  aMover.value = reserva;
  moverAbierto.value = true;
}

/**
 * `workerId` es la estilista que devolvió el PATCH: decide si cambió, aunque
 * la lista refrescada no haya llegado (`invalidateQueries` no falla si el
 * refresco falla). La fila refrescada solo pone el nombre, y solo si ya dice
 * esa misma estilista. `aMover` conserva la reserva tal como estaba antes.
 * Sin `workerId` (un oyente del contrato antiguo) se usa la fila refrescada.
 */
function alReprogramar(id: string, workerId?: string): void {
  const antes = aMover.value;
  const refrescada = todas.value.find((r) => r.id === id) ?? null;
  const nueva = workerId ?? refrescada?.workerId;
  aviso.value =
    antes && nueva
      ? rescheduleSuccessMessage(antes, { workerId: nueva }, refrescada)
      : 'Tu cita quedó movida.';
}

// --- Cancelar ----------------------------------------------------------------

const aCancelar = ref<ReservationDto | null>(null);
const cancelarAbierto = ref(false);
const cancelandoId = ref<string | null>(null);
const errorCancelar = ref('');

function abrirCancelar(reserva: ReservationDto): void {
  aviso.value = '';
  errorCancelar.value = '';
  aCancelar.value = reserva;
  cancelarAbierto.value = true;
}

/**
 * Mientras cancela no se cierra: el diálogo sigue pidiéndolo con la X o con
 * «Volver», pero cerrar a mitad dejaba reabrir la misma cita con la
 * cancelación en vuelo y perdía el error. Es la regla del cajón de reserva y
 * de «Cambiar fecha».
 */
function alCambiarCancelar(valor: boolean): void {
  if (!valor && cancelandoId.value !== null) return;
  cancelarAbierto.value = valor;
}

/** Una sola cancelación en vuelo: el segundo toque llega con `cancelandoId` puesto. */
async function confirmarCancelacion(id: string): Promise<void> {
  if (cancelandoId.value) return;
  const reserva = aCancelar.value;
  cancelandoId.value = id;
  errorCancelar.value = '';
  try {
    await cancel.mutateAsync(id);
    cancelarAbierto.value = false;
    aviso.value = reserva
      ? `Tu cita del ${fechaDeCita(reserva.scheduledAt)} quedó cancelada.`
      : 'Tu cita quedó cancelada.';
  } catch (fallo) {
    errorCancelar.value = cancelErrorMessage(fallo);
  } finally {
    cancelandoId.value = null;
  }
}
</script>

<style scoped lang="scss">
/**
 * Tablero MisReservasA: página hueso, columna de 920 px, antetítulo «Tu
 * cuenta» en oro profundo, «Mis reservas» en Marcellus (38 px; 28 en móvil),
 * rejilla de dos tarjetas (una en móvil) y las pasadas tras un desplegable con
 * filete. El relleno inferior deja sitio al flotante del asistente.
 */
.mis-reservas {
  box-sizing: border-box;
  min-height: 100%;
  padding: 38px var(--m-banda-margen) calc(48px + var(--m-flotante-despeje));
  background: var(--m-hueso);
  color: var(--m-tinta);
  font-family: var(--m-font-sans);
}

.mis-reservas__columna {
  max-width: 920px;
  margin: 0 auto;
}

.mis-reservas__cabecera {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 26px;
}

.mis-reservas__antetitulo {
  margin: 0 0 10px;
  font-size: 11px;
  letter-spacing: var(--m-tracking-marca);
  text-transform: uppercase;
  color: var(--m-oro-profundo);
}

.mis-reservas__titulo {
  margin: 0 0 8px;
  font-family: var(--m-font-display);
  font-size: 38px;
  font-weight: 400;
  line-height: 1.05;
}

.mis-reservas__lede {
  margin: 0;
  font-size: 14px;
  color: var(--m-piedra);
}

.mis-reservas__actualizar {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  min-height: var(--m-tactil-min);
  padding: 0 16px;
  border: var(--m-filete-grosor) solid var(--m-filete);
  border-radius: var(--m-radio-pildora);
  background: var(--m-nieve);
  color: var(--m-piedra);
  font-family: var(--m-font-sans);
  font-size: 12px;
  letter-spacing: var(--m-tracking-nav);
  text-transform: uppercase;
  cursor: pointer;
}

.mis-reservas__actualizar:disabled {
  cursor: progress;
}

.mis-reservas__actualizar-icono {
  color: var(--m-oro-profundo);
}

.mis-reservas__aviso {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin: 0 0 18px;
  padding: 6px 6px 6px 14px;
  border: var(--m-filete-grosor) solid var(--m-oro-profundo);
  border-radius: var(--m-radio-tarjeta);
  background: var(--m-nieve);
  font-size: 13.5px;
}

.mis-reservas__descartar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: var(--m-tactil-min);
  height: var(--m-tactil-min);
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--m-piedra);
  cursor: pointer;
}

.mis-reservas__estado {
  margin: 24px 0;
  color: var(--m-piedra);
}

.mis-reservas__error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border: var(--m-filete-grosor) solid var(--m-peligro);
  border-radius: var(--m-radio-tarjeta);
  background: var(--m-nieve);
  color: var(--m-peligro);
}

.mis-reservas__error-texto {
  margin: 0;
  font-size: 13.5px;
}

.mis-reservas__reintentar {
  flex-shrink: 0;
  min-height: var(--m-tactil-min);
  padding: 0 18px;
  border: var(--m-filete-grosor) solid var(--m-tinta);
  border-radius: var(--m-radio-pildora);
  background: transparent;
  color: var(--m-tinta);
  font-family: var(--m-font-sans);
  font-size: 12px;
  letter-spacing: var(--m-tracking-nav);
  text-transform: uppercase;
  cursor: pointer;
}

.mis-reservas__vacio {
  padding: 48px 0;
  text-align: center;
}

.mis-reservas__vacio-texto {
  margin: 0 0 8px;
  color: var(--m-piedra);
}

.mis-reservas__sin-proximas {
  margin: 0 0 8px;
  color: var(--m-piedra);
}

/* Enlace de contenido sobre claro: rosa profundo (6,4:1) con su filete rosa. */
.mis-reservas__ver-servicios {
  display: inline-flex;
  align-items: center;
  min-height: var(--m-tactil-min);
  color: var(--m-rosa-profundo);
  text-decoration: none;
}

.mis-reservas__ver-servicios-texto {
  border-bottom: var(--m-filete-grosor) solid var(--m-filete-rosa);
}

.mis-reservas__seccion {
  margin: 0 0 12px;
  font-size: 10.5px;
  font-weight: 400;
  letter-spacing: var(--m-tracking-etiqueta);
  text-transform: uppercase;
  color: var(--m-oro-profundo);
}

.mis-reservas__seccion--plegable {
  margin: 0;
}

.mis-reservas__rejilla {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--m-rejilla-gap);
}

.mis-reservas__pasadas {
  margin-top: 34px;
}

.mis-reservas__plegar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: var(--m-tactil-min);
  padding: 0;
  border: 0;
  border-bottom: var(--m-filete-grosor) solid var(--m-filete);
  background: transparent;
  color: var(--m-oro-profundo);
  font-family: var(--m-font-sans);
  cursor: pointer;
}

.mis-reservas__chevron {
  transition: transform var(--m-transicion-pulsar) ease;
}

.mis-reservas__chevron--abierto {
  transform: rotate(180deg);
}

.mis-reservas__lista-pasadas {
  margin: 0;
  padding: 0;
  list-style: none;
}

.mis-reservas__actualizar:focus-visible,
.mis-reservas__descartar:focus-visible,
.mis-reservas__reintentar:focus-visible,
.mis-reservas__plegar:focus-visible,
.mis-reservas__ver-servicios:focus-visible {
  outline: 2px solid var(--m-tinta);
  outline-offset: 2px;
}

@media (max-width: 699px) {
  .mis-reservas {
    padding: 20px var(--m-banda-margen-movil)
      calc(24px + var(--m-flotante-despeje));
  }

  .mis-reservas__cabecera {
    align-items: center;
    margin-bottom: 18px;
  }

  .mis-reservas__antetitulo {
    display: none;
  }

  .mis-reservas__titulo {
    margin-bottom: 4px;
    font-size: 28px;
  }

  .mis-reservas__lede {
    font-size: 13px;
  }

  /* Solo icono: el texto sigue ahí para el lector de pantalla. */
  .mis-reservas__actualizar {
    justify-content: center;
    width: var(--m-tactil-min);
    margin-right: -10px;
    padding: 0;
    border-color: transparent;
    background: transparent;
  }

  .mis-reservas__actualizar-texto {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }

  .mis-reservas__seccion {
    margin-bottom: 10px;
  }

  .mis-reservas__rejilla {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--m-rejilla-gap-movil);
  }

  .mis-reservas__pasadas {
    margin-top: 20px;
  }

  .mis-reservas__plegar {
    min-height: 48px;
    border-top: var(--m-filete-grosor) solid var(--m-filete);
  }
}

/**
 * Realce al pasar (solo puntero fino): el COLOR. El movimiento es el global de
 * `app.scss`. Todo es superficie clara: nada de oro claro como texto.
 */
@media (hover: hover) and (pointer: fine) {
  .mis-reservas__actualizar:hover:not(:disabled) {
    border-color: var(--m-oro);
  }

  .mis-reservas__descartar:hover {
    color: var(--m-oro-profundo);
  }

  .mis-reservas__reintentar:hover {
    border-color: var(--m-oro);
  }

  .mis-reservas__plegar:hover {
    border-bottom-color: var(--m-oro);
  }
}
</style>
