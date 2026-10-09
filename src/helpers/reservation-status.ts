import type { ReservationStatus } from 'src/interfaces/booking';

/**
 * Cómo se presenta el estado de una reserva (M2 de la especificación de las
 * vistas restantes; contrato §4.2 de la hoja de ruta).
 *
 * No trae colores: los pone `EstadoReserva.vue` a partir de `clase`, con
 * tokens. Lo que sí trae es lo que hace que el estado no dependa del color: el
 * texto y el icono de trazo. `tachada` le dice a quien pinta la FECHA que la
 * cita ya no va a ocurrir.
 */
export interface ReservationStatusMeta {
  label: string;
  icono: 'reloj' | 'check' | 'cumplida' | 'cancelada';
  clase:
    | 'estado--pendiente'
    | 'estado--confirmada'
    | 'estado--cumplida'
    | 'estado--cancelada';
  tachada: boolean;
}

const META: Record<ReservationStatus, ReservationStatusMeta> = {
  pendiente: {
    label: 'Pendiente',
    icono: 'reloj',
    clase: 'estado--pendiente',
    tachada: false,
  },
  confirmada: {
    label: 'Confirmada',
    icono: 'check',
    clase: 'estado--confirmada',
    tachada: false,
  },
  cumplida: {
    label: 'Cumplida',
    icono: 'cumplida',
    clase: 'estado--cumplida',
    tachada: false,
  },
  cancelada: {
    label: 'Cancelada',
    icono: 'cancelada',
    clase: 'estado--cancelada',
    tachada: true,
  },
};

/**
 * Un estado que el portal no conoce (un backend más nuevo) conserva su texto y
 * se pinta como pendiente: es el aspecto más neutro, y tachar o dar por
 * confirmada una cita que no sabemos qué es sería mentir.
 */
export function reservationStatusMeta(
  status: ReservationStatus
): ReservationStatusMeta {
  const meta = META[status];
  return meta ? { ...meta } : { ...META.pendiente, label: String(status) };
}
