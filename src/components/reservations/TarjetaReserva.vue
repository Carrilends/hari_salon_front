<template>
  <article
    class="tarjeta-reserva"
    :class="{ 'tarjeta-reserva--cancelada': meta.tachada }"
    data-test="tarjeta-reserva"
  >
    <div class="tarjeta-reserva__cuerpo">
      <div
        class="tarjeta-reserva__fecha"
        :class="{ 'tarjeta-reserva__fecha--tachada': meta.tachada }"
        data-test="tarjeta-fecha"
      >
        <span class="tarjeta-reserva__dia-semana">{{
          cabecera.diaSemana
        }}</span>
        <span class="tarjeta-reserva__numero">{{ cabecera.numero }}</span>
        <span class="tarjeta-reserva__mes">{{ cabecera.mes }}</span>
      </div>

      <div class="tarjeta-reserva__datos">
        <div class="tarjeta-reserva__fila">
          <span
            class="tarjeta-reserva__horas"
            :class="{ 'tarjeta-reserva__horas--tachada': meta.tachada }"
            data-test="tarjeta-horas"
            >{{ horas }}</span
          >
          <EstadoReserva :estado="reserva.status" />
        </div>
        <p class="tarjeta-reserva__detalle" data-test="tarjeta-detalle">
          {{ detalle }}
        </p>
        <p class="tarjeta-reserva__servicios" data-test="tarjeta-servicios">
          {{ servicios }}
        </p>
      </div>
    </div>

    <div
      v-if="cancelable || movible"
      class="tarjeta-reserva__acciones"
      data-test="acciones-reserva"
    >
      <button
        v-if="cancelable"
        type="button"
        class="tarjeta-reserva__cancelar m-boton-plano"
        :aria-label="`Cancelar la cita del ${dia}`"
        data-test="abrir-cancelar"
        @click="emit('cancelar', reserva)"
      >
        Cancelar
      </button>
      <button
        v-if="movible"
        type="button"
        class="tarjeta-reserva__mover m-boton-plano"
        :aria-label="`Cambiar fecha de la cita del ${dia}`"
        data-test="abrir-cambiar-fecha"
        @click="emit('cambiar-fecha', reserva)"
      >
        Cambiar fecha
      </button>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import EstadoReserva from 'src/components/reservations/EstadoReserva.vue';
import { reservationStatusMeta } from 'src/helpers/reservation-status';
import {
  cabeceraDeFecha,
  fechaDeCita,
  lineaDeDetalle,
  nombresDeServicios,
  rangoHorario,
} from 'src/helpers/my-reservations';
import type { ReservationDto } from 'src/interfaces/booking';

/**
 * Una próxima de «Mis reservas» (M1, tablero MisReservasA). Solo pinta y
 * avisa: si se puede cancelar o mover lo decide la página
 * (`isCancelable`/`isReschedulable`), y lo que pasa al pulsar, también.
 */
defineOptions({ name: 'TarjetaReserva' });

const props = defineProps<{
  reserva: ReservationDto;
  ahora: Date;
  cancelable: boolean;
  movible: boolean;
}>();

const emit = defineEmits<{
  (e: 'cancelar', reserva: ReservationDto): void;
  (e: 'cambiar-fecha', reserva: ReservationDto): void;
}>();

const meta = computed(() => reservationStatusMeta(props.reserva.status));
const cabecera = computed(() => cabeceraDeFecha(props.reserva.scheduledAt));
const horas = computed(() => rangoHorario(props.reserva));
const detalle = computed(() => lineaDeDetalle(props.reserva, props.ahora));
const servicios = computed(() => nombresDeServicios(props.reserva));
const dia = computed(() => fechaDeCita(props.reserva.scheduledAt));
</script>

<style scoped lang="scss">
/**
 * Tablero MisReservasA. Escritorio: relleno 22 px, bloque de fecha de 74 px
 * con el número a 44 px y un filete a la derecha; pie con «Cancelar» (texto
 * en peligro) y «Cambiar fecha» (píldora de contorno). Móvil: bloque de 52 px,
 * número a 34 px, y las dos acciones a mitades de 48 px partidas por un filete.
 */
.tarjeta-reserva {
  display: flex;
  flex-direction: column;
  border: var(--m-filete-grosor) solid var(--m-filete);
  border-radius: var(--m-radio-tarjeta);
  background: var(--m-nieve);
  color: var(--m-tinta);
  font-family: var(--m-font-sans);
  overflow: hidden;
}

.tarjeta-reserva__cuerpo {
  display: flex;
  gap: 22px;
  padding: 22px 22px 18px;
}

.tarjeta-reserva__fecha {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  box-sizing: content-box;
  width: 74px;
  padding-right: 20px;
  border-right: var(--m-filete-grosor) solid var(--m-filete);
  text-align: center;
}

.tarjeta-reserva__dia-semana,
.tarjeta-reserva__mes {
  font-size: 10.5px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--m-piedra);
}

.tarjeta-reserva__numero {
  font-family: var(--m-font-display);
  font-size: 44px;
  line-height: 1.05;
}

.tarjeta-reserva__fecha--tachada .tarjeta-reserva__numero,
.tarjeta-reserva__horas--tachada {
  text-decoration: line-through;
}

.tarjeta-reserva__datos {
  flex: 1 1 auto;
  min-width: 0;
}

.tarjeta-reserva__fila {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.tarjeta-reserva__horas {
  font-family: var(--m-font-display);
  font-size: 22px;
}

.tarjeta-reserva__detalle {
  margin: 0 0 8px;
  font-size: 13.5px;
  color: var(--m-piedra);
}

.tarjeta-reserva__servicios {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.5;
}

.tarjeta-reserva__acciones {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  margin-top: auto;
  padding: 10px 14px 10px 22px;
  border-top: var(--m-filete-grosor) solid var(--m-filete);
}

.tarjeta-reserva__cancelar {
  min-height: var(--m-tactil-min);
  padding: 0 16px;
  border: 0;
  border-radius: var(--m-radio-pildora);
  background: transparent;
  color: var(--m-peligro);
  font-family: var(--m-font-sans);
  font-size: 13px;
  cursor: pointer;
}

.tarjeta-reserva__mover {
  min-height: var(--m-tactil-min);
  padding: 0 20px;
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

.tarjeta-reserva__cancelar:focus-visible,
.tarjeta-reserva__mover:focus-visible {
  outline: 2px solid var(--m-tinta);
  outline-offset: 2px;
}

@media (max-width: 699px) {
  .tarjeta-reserva__cuerpo {
    gap: 16px;
    padding: 16px 16px 12px;
  }

  .tarjeta-reserva__fecha {
    width: 52px;
    padding-right: 14px;
  }

  .tarjeta-reserva__dia-semana,
  .tarjeta-reserva__mes {
    font-size: 10px;
    letter-spacing: 0.18em;
  }

  .tarjeta-reserva__numero {
    font-size: 34px;
  }

  .tarjeta-reserva__horas {
    font-size: 19px;
  }

  .tarjeta-reserva__detalle {
    margin-bottom: 4px;
    font-size: 12.5px;
  }

  .tarjeta-reserva__servicios {
    font-size: 13px;
  }

  .tarjeta-reserva__acciones {
    gap: 0;
    padding: 0;
  }

  .tarjeta-reserva__cancelar,
  .tarjeta-reserva__mover {
    flex: 1 1 0;
    min-height: 48px;
    border: 0;
    border-radius: 0;
    font-size: 13px;
    letter-spacing: normal;
    text-transform: none;
  }

  .tarjeta-reserva__mover {
    font-weight: 500;
  }

  .tarjeta-reserva__cancelar + .tarjeta-reserva__mover {
    border-left: var(--m-filete-grosor) solid var(--m-filete);
  }

  /* De borde a borde: el contorno va por dentro o lo corta la tarjeta. */
  .tarjeta-reserva__cancelar:focus-visible,
  .tarjeta-reserva__mover:focus-visible {
    outline-offset: -2px;
  }
}

/**
 * Realce al pasar (solo puntero fino): el COLOR. El movimiento es el global de
 * `app.scss` («Realce y hundido»). Sobre nieve el oro claro no es texto.
 */
@media (hover: hover) and (pointer: fine) {
  .tarjeta-reserva__cancelar:hover {
    background-color: var(--m-aviso-fondo);
  }

  .tarjeta-reserva__mover:hover {
    border-color: var(--m-oro);
  }
}
</style>
