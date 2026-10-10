/**
 * Reservas de prueba para la bandeja de la dueña.
 *
 * «Hoy» es el miércoles 7 de octubre de 2026 en Bogotá (UTC−5, sin horario de
 * verano): las horas UTC de abajo se leen restando cinco. Los nombres y las
 * horas son los del tablero `AdminReservasB`.
 */
import type { ReservationDto } from 'src/interfaces/booking';

export const HOY = '2026-10-07';

/** Andrea Ruiz, jueves 8 a las 10:30, pendiente, con Monica (la eligió ella). */
export function reserva(cambios: Partial<ReservationDto> = {}): ReservationDto {
  return {
    id: 'res-1',
    scheduledAt: '2026-10-08T15:30:00.000Z',
    endedAt: '2026-10-08T16:30:00.000Z',
    workerId: 'w-monica',
    worker: { id: 'w-monica', name: 'Monica', isDefault: false },
    workerPinned: true,
    totalDurationMinutes: 60,
    status: 'pendiente',
    userId: null,
    contact: { name: 'Andrea Ruiz', phone: '3001234567', email: null },
    services: [
      { serviceId: 's-1', name: 'Wolf cut mujer', price: 37000, durationMinutes: 30 },
      { serviceId: 's-2', name: 'Uñas de gel', price: 48000, durationMinutes: 30 },
    ],
    ...cambios,
  };
}

/**
 * Lo que devuelve `GET /reservations`: vigentes y en orden **descendente**
 * (`scheduledAt DESC` en `findActiveWithWorker`), de la más lejana a la más
 * próxima. Cuentas con `HOY`: 3 pendientes, 2 confirmadas, 1 hoy, 5 en total.
 */
export function bandeja(): ReservationDto[] {
  return [
    // Viernes 9, 16:00 — pendiente; la estilista la repartió el sistema.
    reserva({
      id: 'res-5',
      scheduledAt: '2026-10-09T21:00:00.000Z',
      endedAt: '2026-10-09T21:30:00.000Z',
      workerId: 'w-sonia',
      worker: { id: 'w-sonia', name: 'Sonia', isDefault: false },
      workerPinned: false,
      totalDurationMinutes: 30,
      contact: { name: 'Paula R.', phone: '3007654321', email: null },
      services: [
        { serviceId: 's-3', name: 'Uñas marmoleadas', price: 42000, durationMinutes: 30 },
      ],
    }),
    // Viernes 9, 9:00 — confirmada; reservó con sesión y sin teléfono.
    reserva({
      id: 'res-4',
      status: 'confirmada',
      scheduledAt: '2026-10-09T14:00:00.000Z',
      endedAt: '2026-10-09T15:00:00.000Z',
      userId: 'u-9',
      contact: null,
    }),
    // Jueves 8, 11:00 — pendiente, con Alejandro.
    reserva({
      id: 'res-2',
      scheduledAt: '2026-10-08T16:00:00.000Z',
      endedAt: '2026-10-08T17:00:00.000Z',
      workerId: 'w-alejandro',
      worker: { id: 'w-alejandro', name: 'Alejandro', isDefault: false },
      contact: { name: 'Daniel M.', phone: '3011112222', email: null },
      services: [
        { serviceId: 's-4', name: 'Two-block cut', price: 30000, durationMinutes: 30 },
        { serviceId: 's-5', name: 'Undercut', price: 25000, durationMinutes: 30 },
      ],
    }),
    // Jueves 8, 10:30 — Andrea.
    reserva(),
    // Hoy, miércoles 7, 15:00 — confirmada.
    reserva({
      id: 'res-3',
      status: 'confirmada',
      scheduledAt: '2026-10-07T20:00:00.000Z',
      endedAt: '2026-10-07T21:00:00.000Z',
      contact: { name: 'Laura Gómez', phone: '3023334444', email: null },
    }),
  ];
}
