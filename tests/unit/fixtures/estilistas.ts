/**
 * La semana del tablero `EstilistasB`: del lunes 5 al domingo 11 de octubre de
 * 2026, hoy miércoles 7. Alejandro 22 h, Monica 46 h, Sonia 11 h 30, sobre
 * 80 h de horario (5 × 12 h + 2 × 10 h).
 *
 * Solo datos: no se usan dentro de las fábricas de `jest.mock`.
 */
import type { WorkersWeekDay, WorkersWeekResponse } from 'src/api/workers-api';
import type { ReservationDto } from 'src/interfaces/booking';

export const LUNES = '2026-10-05';
export const HOY = '2026-10-07';
export const DIAS = [
  '2026-10-05',
  '2026-10-06',
  '2026-10-07',
  '2026-10-08',
  '2026-10-09',
  '2026-10-10',
  '2026-10-11',
];
const CAPACIDAD = [720, 720, 720, 720, 720, 600, 600];

export function diasCon(usados: number[]): WorkersWeekDay[] {
  return DIAS.map((date, i) => ({
    date,
    usedMinutes: usados[i] ?? 0,
    capacityMinutes: CAPACIDAD[i],
  }));
}

export function semanaDePrueba(
  cambios: Partial<WorkersWeekResponse> = {}
): WorkersWeekResponse {
  return {
    start: LUNES,
    days: DIAS,
    workers: [
      {
        id: 'w-ale',
        name: 'Alejandro',
        isDefault: false,
        days: diasCon([180, 120, 90, 240, 330, 360, 0]),
      },
      {
        id: 'w-mon',
        name: 'Monica',
        isDefault: false,
        days: diasCon([360, 450, 300, 540, 480, 510, 120]),
      },
      {
        id: 'w-son',
        name: 'Sonia s',
        isDefault: false,
        days: diasCon([0, 60, 0, 120, 90, 240, 180]),
      },
      {
        id: 'w-def',
        name: 'Sin preferencia',
        isDefault: true,
        days: diasCon([0, 0, 0, 0, 0, 0, 0]),
      },
    ],
    ...cambios,
  };
}

/** Una cita de Monica hoy de 8:30 a 10:00 (Bogotá = UTC−5). */
export function reservaDePrueba(
  cambios: Partial<ReservationDto> = {}
): ReservationDto {
  return {
    id: 'r-1',
    scheduledAt: '2026-10-07T13:30:00.000Z',
    endedAt: '2026-10-07T15:00:00.000Z',
    workerId: 'w-mon',
    worker: { id: 'w-mon', name: 'Monica' },
    workerPinned: true,
    totalDurationMinutes: 90,
    status: 'confirmada',
    userId: null,
    contact: { name: 'Laura', phone: '3001234567' },
    services: [
      {
        serviceId: 's-1',
        name: 'Balayage',
        price: 180000,
        durationMinutes: 90,
      },
    ],
    ...cambios,
  };
}
