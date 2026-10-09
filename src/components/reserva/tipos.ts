/**
 * Tipos que comparten las piezas del cajón de reserva y su composable
 * (`useCajonReserva`). Viven aquí, y no en el composable, para que una pieza
 * no tenga que importar el composable (y con él la API) solo por un tipo.
 */

/**
 * El aviso en línea de «Cuándo»: el de B6, «la disponibilidad cambió», y el de
 * la hora que empezó mientras la clienta escribía, «Esa hora ya pasó».
 */
export interface AvisoDisponibilidad {
  texto: string;
  /** Solo si la clienta había elegido estilista: «Probar sin preferencia». */
  ofrecerSinPreferencia: boolean;
}

/** La tarjeta «Tu cita» del paso 3. */
export interface CitaElegida {
  cuando: string; // 'Jueves 8 de octubre · 10:30'
  detalle: string; // 'Hasta las 11:30 · con Monica'
  servicios: string; // 'Bob clásico · Uñas de gel'
}

/** Lo que pinta la pantalla de éxito (B5): una foto fija de la reserva hecha. */
export interface ResumenExito {
  fechaTexto: string; // 'Jueves 8 de octubre'
  franja: string; // '10:30 a 11:30'
  estilista: string | null;
  lineas: Array<{ nombre: string; cantidad: number; precio: number }>;
  total: number;
  conSesion: boolean;
  /** Dejó teléfono: el backend le escribe por WhatsApp (`reservation.created`). */
  avisoPorWhatsApp: boolean;
  /** El mismo `wa.me` de antes, con el mismo mensaje. Solo se abre si lo pulsa. */
  urlWhatsApp: string;
}
