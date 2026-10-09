/**
 * Datos de prueba del cajón de reserva. El día de referencia es el de los
 * tableros: miércoles 7 de octubre de 2026 a las 9:00 en Bogotá. El jueves 8
 * es día laboral (8:00–20:00) y el lunes 12 es festivo (Día de la Raza).
 *
 * Solo datos: no se usan dentro de las fábricas de `jest.mock`.
 */
import type {
  WorkerAvailabilityEntry,
  WorkerAvailabilityResponse,
} from 'src/api/workers-api';
import type { SalonNowParts } from 'src/helpers/businessHours';

export const AHORA: SalonNowParts = {
  ymd: '2026-10-07',
  qDate: '2026/10/07',
  minOfDay: 540,
};

/** Una estilista asignable con el día libre; `cambios` pisa lo que haga falta. */
export function estilista(
  cambios: Partial<WorkerAvailabilityEntry> & { id: string; name: string }
): WorkerAvailabilityEntry {
  return {
    isDefault: false,
    assignable: true,
    usedMinutes: 0,
    capacityMinutes: 720,
    availableMinutes: 720,
    reservations: [],
    ...cambios,
  };
}

/**
 * La respuesta de `GET /workers/availability` para el jueves 8 (laboral, no
 * es hoy). La holgura (`availableMinutes`) y los bloques (`reservations`) son
 * entradas independientes a propósito: la primera decide «Sin tiempo
 * suficiente» en la ficha, los segundos qué horas están ocupadas.
 *
 * - Monica: ocupada de 9:00 a 10:00; 180 min libres («Pocas horas libres»).
 * - Alejandro: libre todo el día («Libre casi todo el día»).
 * - Sonia s: ocupada de 8:00 a 19:30; 30 min libres (no le cabe 1 h).
 * - La predeterminada «Sin prefencia» (así está en la BD): no asignable.
 */
export function disponibilidad(
  cambios: Partial<WorkerAvailabilityResponse> = {}
): WorkerAvailabilityResponse {
  return {
    workers: [
      estilista({
        id: 'w-defecto',
        name: 'Sin prefencia',
        isDefault: true,
        assignable: false,
      }),
      estilista({
        id: 'w-monica',
        name: 'Monica',
        usedMinutes: 540,
        availableMinutes: 180,
        reservations: [{ startMin: 540, endMin: 600 }],
      }),
      estilista({
        id: 'w-alejandro',
        name: 'Alejandro',
        usedMinutes: 60,
        availableMinutes: 660,
      }),
      estilista({
        id: 'w-sonia',
        name: 'Sonia s',
        usedMinutes: 690,
        availableMinutes: 30,
        reservations: [{ startMin: 480, endMin: 1170 }],
      }),
    ],
    dayBounds: {
      openMin: 480,
      closeMin: 1200,
      effectiveStartMin: 480,
      isToday: false,
    },
    salonNow: { ymd: '2026-10-07', minOfDay: 540, tz: 'America/Bogota' },
    ...cambios,
  };
}

/** La misma, después de que otra clienta tomara a Monica de 10:30 a 11:30. */
export function conMonicaOcupada(): WorkerAvailabilityResponse {
  const base = disponibilidad();
  return {
    ...base,
    workers: base.workers.map((w) =>
      w.id === 'w-monica'
        ? {
            ...w,
            reservations: [
              { startMin: 540, endMin: 600 },
              { startMin: 630, endMin: 690 },
            ],
          }
        : w
    ),
  };
}
