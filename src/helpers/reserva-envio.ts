/**
 * Qué se valida en «Tus datos» y qué viaja en `POST /reservations` (B4 de la
 * spec de las vistas). Las reglas copian las del backend:
 *
 * - `ReservationContactDto`: `name` con 3+ caracteres, `phone` con 7+.
 * - `Reservation.schedule`: hace falta `userId` (sale del JWT) **o** `contact`.
 *
 * Con sesión, `contact` solo viaja si la clienta deja su teléfono (para que la
 * avisen por WhatsApp), con el nombre de su cuenta. Sin sesión siempre viaja,
 * con lo que escribió, y la casilla de tratamiento de datos es obligatoria.
 */
import type { CreateReservationPayload } from 'src/api/reservations-api';
import { bookingSelectionToUtcIso } from 'src/helpers/businessHours';
import { onlyDigits } from 'src/helpers/phone';

export const NOMBRE_MINIMO = 3;
export const TELEFONO_MINIMO = 7;

export const MENSAJES_DATOS = {
  nombre: 'Escribe tu nombre (mínimo 3 caracteres).',
  telefono: 'Escribe un teléfono válido (mínimo 7 dígitos).',
  consentimiento: 'Para reservar, autoriza el tratamiento de tus datos.',
} as const;

export interface ErroresDatos {
  nombre?: string;
  telefono?: string;
  consentimiento?: string;
}

const telefonoValido = (telefono: string) =>
  onlyDigits(telefono).length >= TELEFONO_MINIMO;

export function validarDatos(d: {
  conSesion: boolean;
  nombre: string;
  telefono: string;
  consentimiento: boolean;
}): ErroresDatos {
  const errores: ErroresDatos = {};
  const telefono = d.telefono.trim();
  if (d.conSesion) {
    // Opcional: solo es un error si lo empezó a escribir y no llega.
    if (telefono && !telefonoValido(telefono)) {
      errores.telefono = MENSAJES_DATOS.telefono;
    }
    return errores;
  }
  if (d.nombre.trim().length < NOMBRE_MINIMO) {
    errores.nombre = MENSAJES_DATOS.nombre;
  }
  if (!telefonoValido(telefono)) errores.telefono = MENSAJES_DATOS.telefono;
  if (!d.consentimiento) errores.consentimiento = MENSAJES_DATOS.consentimiento;
  return errores;
}

export function hayErrores(errores: ErroresDatos): boolean {
  return Object.keys(errores).length > 0;
}

/**
 * El `name` del `contact` de una clienta con sesión: el de su cuenta; si no
 * llega a 3 caracteres, la parte local del correo; si tampoco, el correo
 * entero (que siempre los tiene).
 */
export function nombreDeContacto(nombreCuenta: string, correo: string): string {
  const nombre = nombreCuenta.trim();
  if (nombre.length >= NOMBRE_MINIMO) return nombre;
  const local = correo.split('@')[0]?.trim() ?? '';
  if (local.length >= NOMBRE_MINIMO) return local;
  return correo.trim();
}

export interface DatosSolicitud {
  fecha: string; // 'YYYY/MM/DD'
  hora: string; // 'HH:mm'
  serviceIds: string[];
  estilistaId: string | null; // null = sin preferencia
  sesion: { nombre: string; correo: string } | null;
  nombre: string;
  telefono: string;
}

/** El cuerpo de `POST /reservations`, o null si el día y la hora no son válidos. */
export function armarSolicitud(
  d: DatosSolicitud
): CreateReservationPayload | null {
  const scheduledAt = bookingSelectionToUtcIso(d.fecha, d.hora);
  if (!scheduledAt) return null;
  const solicitud: CreateReservationPayload = {
    scheduledAt,
    serviceIds: d.serviceIds,
  };
  if (d.estilistaId) solicitud.workerId = d.estilistaId;
  const telefono = d.telefono.trim();
  if (d.sesion) {
    if (telefono) {
      solicitud.contact = {
        name: nombreDeContacto(d.sesion.nombre, d.sesion.correo),
        phone: telefono,
      };
    }
  } else {
    solicitud.contact = { name: d.nombre.trim(), phone: telefono };
  }
  return solicitud;
}
