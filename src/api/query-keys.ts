/**
 * Único sitio donde se escriben las claves de consulta de TanStack Query. Hasta
 * ahora vivían como literales repartidos por composables y diálogos; en cuanto
 * el canal en tiempo real tuvo que nombrarlas para invalidarlas, tenían que
 * salir de un solo lugar o divergirían al primer cambio.
 *
 * TanStack Query invalida **por prefijo**: invalidar `reservations.all` alcanza
 * también a `reservations.me`, y `occupancy.all` a cualquier mes concreto.
 * Los efectos del canal en tiempo real cuentan con eso: invalidan las raíces.
 */
export const queryKeys = {
  reservations: {
    /** Lista del panel de administración (GET /reservations). */
    all: ['reservations'] as const,
    /** «Mis reservas» de la clienta (GET /reservations/me). */
    me: ['reservations', 'me'] as const,
  },
  occupancy: {
    all: ['reservation-occupancy'] as const,
    /** Días con hueco del mes que muestra el calendario del diálogo de reserva. */
    month: (year: number, month: number) =>
      ['reservation-occupancy', year, month] as const,
  },
  workerAvailability: {
    all: ['worker-availability'] as const,
    /** Horas libres de cada estilista para un día `YYYY-MM-DD`. */
    day: (ymd: string) => ['worker-availability', ymd] as const,
  },
};
