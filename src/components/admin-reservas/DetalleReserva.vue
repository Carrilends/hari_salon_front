<template>
  <article
    ref="ficha"
    class="detalle"
    :class="`detalle--${variante}`"
    data-test="detalle-reserva"
    :aria-labelledby="tituloId"
    tabindex="-1"
  >
    <header class="detalle__cabecera">
      <button
        v-if="variante === 'pantalla'"
        type="button"
        class="detalle__volver m-boton-plano"
        data-test="volver-a-la-lista"
        @click="emit('volver')"
      >
        ← Reservas
      </button>
      <span v-else class="detalle__antetitulo" data-test="detalle-antetitulo"
        >Reserva</span
      >
      <EstadoReserva :estado="reserva.status" compacto />
    </header>

    <div class="detalle__cuerpo">
      <h2 :id="tituloId" class="detalle__nombre" data-test="detalle-nombre">
        {{ nombre }}
      </h2>
      <p class="detalle__contacto" data-test="detalle-contacto">
        {{ contacto }}
      </p>

      <dl class="detalle__datos">
        <div class="detalle__fila">
          <dt>Día</dt>
          <dd data-test="detalle-dia">{{ dia }}</dd>
        </div>
        <div class="detalle__fila">
          <dt>Hora</dt>
          <dd data-test="detalle-hora">
            {{ franja
            }}<span class="detalle__sub" data-test="detalle-duracion">{{
              duracion
            }}</span>
          </dd>
        </div>
        <div class="detalle__fila">
          <dt>Estilista</dt>
          <dd data-test="detalle-estilista">
            {{ estilista
            }}<span class="detalle__sub" data-test="detalle-asignacion">{{
              asignacion
            }}</span>
          </dd>
        </div>
        <div class="detalle__servicios">
          <dt>Servicios</dt>
          <dd>
            <ul class="detalle__lista">
              <li
                v-for="(servicio, i) in reserva.services"
                :key="`${servicio.serviceId ?? 'sin-id'}-${i}`"
                class="detalle__servicio"
                data-test="detalle-servicio"
              >
                <span>{{ servicio.name }}</span
                >{{ ' '
                }}<span class="detalle__precio">{{
                  precioTexto(servicio.price)
                }}</span>
              </li>
            </ul>
            <p class="detalle__total">
              <span class="detalle__total-rotulo">Total</span>
              <span class="detalle__total-cifra" data-test="detalle-total">{{
                total
              }}</span>
            </p>
          </dd>
        </div>
      </dl>
    </div>

    <footer class="detalle__acciones">
      <p class="detalle__nota" data-test="nota-avisos">
        Al confirmar, al mover o al cancelar, la clienta recibe el aviso por
        WhatsApp si dejó su teléfono.
      </p>
      <!-- Sin región viva: lo anuncia la línea de la página (`aviso-accion`). -->
      <p v-if="error" class="detalle__error" data-test="error-detalle">
        {{ error }}
      </p>
      <button
        v-if="reserva.status === 'pendiente'"
        type="button"
        class="detalle__confirmar m-boton--ancho"
        data-test="confirmar-detalle"
        :disabled="apagada"
        @click="emit('confirmar', reserva.id)"
      >
        <StrokeIcon
          class="detalle__confirmar-icono"
          nombre="check"
          :tamano="16"
        />{{ ocupada === 'confirmar' ? 'Confirmando…' : 'Confirmar' }}
      </button>
      <div v-if="activa" class="detalle__pareja">
        <button
          ref="botonMover"
          type="button"
          class="detalle__accion m-boton--ancho"
          data-test="mover"
          :disabled="apagada"
          @click="emit('mover', reserva.id)"
        >
          <StrokeIcon nombre="mover-cita" :tamano="16" />Mover
        </button>
        <button
          type="button"
          class="detalle__accion detalle__accion--peligro m-boton--ancho"
          data-test="cancelar-detalle"
          :disabled="apagada"
          @click="emit('cancelar', reserva.id)"
        >
          <StrokeIcon nombre="cancelada" :tamano="16" />{{
            ocupada === 'cancelar' ? 'Cancelando…' : 'Cancelar'
          }}
        </button>
      </div>
    </footer>
  </article>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import EstadoReserva from 'src/components/reservations/EstadoReserva.vue';
import StrokeIcon from 'src/components/shared/StrokeIcon.vue';
import type { AccionBandeja } from 'src/helpers/acciones-bandeja';
import {
  diaDelSalon,
  fechaLargaCapitalizada,
  franjaDeLaCita,
  nombreDeClienta,
  nombreDeEstilista,
  procedenciaDeClienta,
  textoAsignacion,
  totalDeLaReserva,
} from 'src/helpers/admin-reservation-filter';
import { formatDurationMinutes } from 'src/helpers/duration';
import { precioTexto } from 'src/helpers/reserva-texto';
import type { ReservationDto } from 'src/interfaces/booking';

/**
 * La ficha de una reserva en la bandeja (spec §3, A3–A4; tablero
 * `AdminReservasB`, panel de 400 px y «Una reserva» en móvil). Solo pinta y
 * avisa: confirmar, mover y cancelar los resuelve la página.
 *
 * El teléfono que se ve es el **de la clienta**: es como la dueña la
 * contacta. La regla de «ningún teléfono a la vista» es para el del salón.
 */
const props = withDefaults(
  defineProps<{
    reserva: ReservationDto;
    variante?: 'panel' | 'pantalla';
    ocupada?: AccionBandeja | null;
    /**
     * Otra reserva tiene una acción en vuelo (la página tiene un solo
     * cerrojo): los botones se apagan, pero el rótulo solo cambia en el de la
     * acción que corre, y esa no es de esta ficha.
     */
    bloqueada?: boolean;
    error?: string | null;
  }>(),
  { variante: 'panel', ocupada: null, bloqueada: false, error: null }
);

const emit = defineEmits<{
  (e: 'confirmar', id: string): void;
  (e: 'mover', id: string): void;
  (e: 'cancelar', id: string): void;
  (e: 'volver'): void;
}>();

const tituloId = computed(() => `detalle-titulo-${props.reserva.id}`);
const nombre = computed(() => nombreDeClienta(props.reserva));
const contacto = computed(() =>
  [
    props.reserva.contact?.phone?.trim(),
    props.reserva.contact?.email?.trim(),
    procedenciaDeClienta(props.reserva),
  ]
    .filter((parte): parte is string => !!parte)
    .join(' · ')
);
const dia = computed(() =>
  fechaLargaCapitalizada(diaDelSalon(props.reserva.scheduledAt))
);
const franja = computed(() => franjaDeLaCita(props.reserva));
const duracion = computed(() =>
  formatDurationMinutes(props.reserva.totalDurationMinutes)
);
const estilista = computed(() => nombreDeEstilista(props.reserva));
const asignacion = computed(() => textoAsignacion(props.reserva));
const total = computed(() => precioTexto(totalDeLaReserva(props.reserva)));
const apagada = computed(() => props.ocupada !== null || props.bloqueada);

const ficha = ref<HTMLElement | null>(null);
const botonMover = ref<HTMLButtonElement | null>(null);

/**
 * Para la página, cuando una acción de la ficha se lleva el botón enfocado
 * (confirmar quita «Confirmar»): el foco sigue en la ficha, en «Mover», la
 * acción que queda; si no la hay, en la ficha misma (`tabindex="-1"`).
 */
function enfocar() {
  (botonMover.value ?? ficha.value)?.focus({ preventScroll: true });
}

defineExpose({ enfocar });
const activa = computed(
  () =>
    props.reserva.status === 'pendiente' ||
    props.reserva.status === 'confirmada'
);

defineOptions({ name: 'DetalleReserva' });
</script>

<style lang="scss" scoped>
/* Medidas del tablero: panel claro de 400 px con 26/30 de relleno (lo pone la
   página), nombre en Marcellus 28, filas de 11 px con rótulo de 74 px. */
.detalle {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  color: var(--m-tinta);
  font-family: var(--m-font-sans);
}

.detalle--pantalla {
  /* Va dentro de una capa fija (diálogo maximizado): `100%`, no `100vh`/`100dvh`
     (Safari 13.1; mismo criterio que los cajones del plan 2). */
  min-height: 100%;
  background: var(--m-hueso);
}

.detalle__cabecera {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.detalle--pantalla .detalle__cabecera {
  height: 56px;
  box-sizing: border-box;
  /* A la izquierda, 8 + los 12 de relleno de «← Reservas»; a la derecha, el
     estado a 20, como el cuerpo. */
  padding: 0 20px 0 8px;
  border-bottom: var(--m-filete-grosor) solid var(--m-filete);
}

.detalle__antetitulo {
  color: var(--m-oro-profundo);
  font-size: 10.5px;
  letter-spacing: var(--m-tracking-etiqueta);
  text-transform: uppercase;
}

.detalle__volver {
  min-height: var(--m-tactil-min);
  padding: 0 12px;
  border: 0;
  background: transparent;
  color: var(--m-piedra);
  font-family: var(--m-font-sans);
  font-size: 12px;
  letter-spacing: var(--m-tracking-nav);
  text-transform: uppercase;
  cursor: pointer;
}

.detalle--pantalla .detalle__cuerpo {
  padding: 18px 20px 0;
}

.detalle__nombre {
  margin: 14px 0 4px;
  font-family: var(--m-font-display);
  font-size: 28px;
  font-weight: 400;
  line-height: 1.15;
}

.detalle--pantalla .detalle__nombre {
  margin-top: 0;
  font-size: 26px;
}

.detalle__contacto {
  margin: 0;
  color: var(--m-piedra);
  font-size: 13px;
}

.detalle__datos {
  margin: 18px 0 0;
  border-top: var(--m-filete-grosor) solid var(--m-filete);
}

.detalle__fila {
  display: flex;
  gap: 16px;
  padding: 11px 0;
  border-bottom: var(--m-filete-grosor) solid var(--m-filete);
}

.detalle__fila dt,
.detalle__servicios dt {
  width: 74px;
  flex-shrink: 0;
  padding-top: 3px;
  color: var(--m-piedra);
  font-size: 10px;
  letter-spacing: var(--m-tracking-etiqueta);
  text-transform: uppercase;
}

.detalle__fila dd {
  margin: 0;
  font-size: 14px;
}

.detalle__sub {
  display: block;
  margin-top: 2px;
  color: var(--m-piedra);
  font-size: 12px;
}

.detalle__servicios {
  padding: 11px 0;
  border-bottom: var(--m-filete-grosor) solid var(--m-filete);
}

.detalle__servicios dt {
  width: auto;
  margin-bottom: 8px;
  padding-top: 0;
}

.detalle__servicios dd {
  margin: 0;
}

.detalle__lista {
  margin: 0;
  padding: 0;
  list-style: none;
}

.detalle__servicio {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 3px 0;
  font-size: 14px;
}

.detalle__precio {
  color: var(--m-oro-profundo);
}

.detalle__total {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin: 8px 0 0;
}

.detalle__total-rotulo {
  color: var(--m-piedra);
  font-size: 10px;
  letter-spacing: var(--m-tracking-etiqueta);
  text-transform: uppercase;
}

.detalle__total-cifra {
  color: var(--m-oro-profundo);
  font-family: var(--m-font-display);
  font-size: 20px;
}

.detalle__acciones {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: auto;
  padding-top: 22px;
}

/* Móvil: acciones fijas abajo, sobre el área segura del teléfono. */
.detalle--pantalla .detalle__acciones {
  position: sticky;
  bottom: 0;
  padding: 14px 20px calc(20px + env(safe-area-inset-bottom, 0px));
  border-top: var(--m-filete-grosor) solid var(--m-filete);
  background: var(--m-hueso);
}

.detalle__nota {
  margin: 0 0 4px;
  color: var(--m-piedra);
  font-size: 12.5px;
  line-height: 1.55;
}

.detalle__error {
  margin: 0;
  color: var(--m-peligro);
  font-size: 13px;
}

.detalle__confirmar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  width: 100%;
  height: 50px;
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

.detalle__confirmar-icono {
  color: var(--m-oro);
}

.detalle__pareja {
  display: flex;
  gap: 10px;
}

.detalle__accion {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 50%;
  height: 46px;
  box-sizing: border-box;
  border: var(--m-filete-grosor) solid var(--m-tinta);
  border-radius: var(--m-radio-pildora);
  background: transparent;
  color: var(--m-tinta);
  font-family: var(--m-font-sans);
  font-size: 11.5px;
  letter-spacing: var(--m-tracking-nav);
  text-transform: uppercase;
  cursor: pointer;
}

/* Cancelar: la única acción sin vuelta de la ficha. */
.detalle__accion--peligro {
  border-color: var(--m-peligro);
  color: var(--m-peligro);
}

.detalle__confirmar:disabled,
.detalle__accion:disabled {
  opacity: 0.6;
  cursor: progress;
}

.detalle__volver:focus-visible,
.detalle__confirmar:focus-visible,
.detalle__accion:focus-visible {
  outline: 2px solid var(--m-tinta);
  outline-offset: 2px;
}

/* La ficha solo recibe el foco por código (sin «Mover» que lo tome): el
   filete va por dentro, para que el borde del panel no lo corte. */
.detalle:focus {
  outline: none;
}

.detalle:focus-visible {
  outline: 2px solid var(--m-tinta);
  outline-offset: -2px;
}

/**
 * Realce al pasar (solo puntero fino): el COLOR. El movimiento es global, en
 * `app.scss` («Realce y hundido»). Tinta maciza → rótulo en oro (5,8:1);
 * contorno → filete de oro.
 */
@media (hover: hover) and (pointer: fine) {
  .detalle__confirmar:hover:not(:disabled) {
    color: var(--m-oro);
  }

  .detalle__accion:hover:not(:disabled) {
    border-color: var(--m-oro);
  }

  .detalle__volver:hover {
    color: var(--m-oro-profundo);
  }
}
</style>
