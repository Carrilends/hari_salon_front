import { ref } from 'vue';
import type { ReservationEvent } from 'src/interfaces/booking';
import { registrarLimpiezaDeSesion } from 'src/stores/session-cleanup';
import type { ReservationNotice } from './reservationEventEffects';

/**
 * Los avisos en tiempo real de la dueña, fijados (spec §3, A5).
 *
 * Estado de módulo, compartido: lo llena `useAdminNotifications` —que vive
 * en `App.vue` y recibe los cuatro eventos estén donde estén— y lo pinta la
 * bandeja (`AvisosFijados`). Así un aviso que llegó mientras la dueña estaba
 * en Servicios la espera al entrar en `/reservas`.
 *
 * `bandejaAbierta` lo marca la página al montarse: con la bandeja a la vista
 * el aviso solo se fija; fuera, además sale el flotante. `enVivo` refleja el
 * socket: la página dice «En vivo» solo si de verdad lo está.
 */
export interface AvisoEnVivo {
  id: number;
  reservationId: string;
  evento: ReservationEvent['type'];
  mensaje: string;
  detalle: string;
}

/** Más que esto empuja la lista fuera de la pantalla de un teléfono. */
export const MAX_AVISOS = 5;

/** La fila cancelada desaparece al refrescar: el aviso es lo único que lo explica. */
export const SALIO_DE_LA_LISTA = 'ya no está en la lista';

const avisos = ref<AvisoEnVivo[]>([]);
const enVivo = ref(false);
const bandejaAbierta = ref(false);
let siguienteId = 1;

function registrar(evento: ReservationEvent, aviso: ReservationNotice): void {
  const detalle =
    evento.type === 'reservation.cancelled'
      ? `${aviso.caption} · ${SALIO_DE_LA_LISTA}`
      : aviso.caption;
  const nuevo: AvisoEnVivo = {
    id: siguienteId++,
    reservationId: evento.reservationId,
    evento: evento.type,
    mensaje: aviso.message,
    detalle,
  };
  // El mismo hecho dos veces (reintento del servidor, reconexión) no se apila:
  // el aviso sube arriba con su texto nuevo.
  const resto = avisos.value.filter(
    (a) =>
      !(a.reservationId === nuevo.reservationId && a.evento === nuevo.evento)
  );
  avisos.value = [nuevo, ...resto].slice(0, MAX_AVISOS);
}

export function useAvisosEnVivo() {
  return {
    avisos,
    enVivo,
    bandejaAbierta,
    registrar,
    descartar: (id: number) => {
      avisos.value = avisos.value.filter((a) => a.id !== id);
    },
    vaciar: () => {
      avisos.value = [];
    },
    marcarBandeja: (abierta: boolean) => {
      bandejaAbierta.value = abierta;
    },
    marcarEnVivo: (valor: boolean) => {
      enVivo.value = valor;
    },
  };
}

/**
 * Cerrar sesión borra lo fijado: no puede quedarse en memoria para quien use
 * el navegador después. Se apunta al mecanismo de limpieza de sesión que
 * `logout()` dispara; una renovación de token no pasa por ahí.
 */
registrarLimpiezaDeSesion(() => useAvisosEnVivo().vaciar());
