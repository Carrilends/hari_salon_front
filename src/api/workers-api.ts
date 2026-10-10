import axios from 'axios';
import { adminServiceApi } from './services-api';
import { attachRefreshInterceptor } from './refresh-interceptor';

export type ReservationBlock = {
  startMin: number;
  endMin: number;
};

export type WorkerAvailabilityEntry = {
  id: string;
  name: string;
  isDefault: boolean;
  assignable: boolean;
  usedMinutes: number;
  capacityMinutes: number;
  availableMinutes: number;
  reservations: ReservationBlock[];
};

export type WorkerAvailabilityResponse = {
  workers: WorkerAvailabilityEntry[];
  dayBounds: {
    openMin: number;
    closeMin: number;
    effectiveStartMin: number;
    isToday: boolean;
  };
  salonNow: {
    ymd: string;
    minOfDay: number;
    tz: string;
  };
};

export type WorkerItem = {
  id: string;
  name: string;
  isDefault: boolean;
};

const workersApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});
attachRefreshInterceptor(workersApi);

export async function fetchWorkerAvailability(
  dateYmd: string,
): Promise<WorkerAvailabilityResponse> {
  const { data } = await workersApi.get<WorkerAvailabilityResponse>(
    '/workers/availability',
    { params: { date: dateYmd } },
  );
  return data;
}

export async function fetchWorkers(): Promise<WorkerItem[]> {
  const { data } = await adminServiceApi.get<WorkerItem[]>('/workers');
  return data;
}

export async function createWorker(body: { name: string }): Promise<WorkerItem> {
  const { data } = await adminServiceApi.post<WorkerItem>('/workers', body);
  return data;
}

export async function updateWorker(
  id: string,
  body: { name: string },
): Promise<WorkerItem> {
  const { data } = await adminServiceApi.patch<WorkerItem>(`/workers/${id}`, body);
  return data;
}

export async function removeWorker(id: string): Promise<{ deleted: boolean }> {
  const { data } = await adminServiceApi.delete<{ deleted: boolean }>(`/workers/${id}`);
  return data;
}

/**
 * Carga de la semana para «Mis estilistas»: contrato §4.5 de
 * `docs/superpowers/plans/2026-10-09-vistas-hoja-de-ruta.md`. El backend lleva
 * `start` al lunes de su semana y cuenta cada día entero (también hoy).
 */
export interface WorkersWeekResponse {
  start: string; // lunes, 'YYYY-MM-DD'
  days: string[]; // 7 fechas 'YYYY-MM-DD'
  workers: Array<{
    id: string;
    name: string;
    isDefault: boolean;
    days: Array<{ date: string; usedMinutes: number; capacityMinutes: number }>;
  }>;
}

/**
 * Un día y una estilista de la semana, con nombre propio. Tienen la MISMA forma
 * que `WorkersWeekResponse['workers'][number]` y su `days[number]` (TypeScript
 * los da por iguales), pero no se escriben como tipos indexados: el compilador
 * de SFC de Vue resuelve el tipo de cada prop para inferir su tipo en tiempo de
 * ejecución, y con un tipo indexado sobre `Array<…>` puede fallar.
 */
export interface WorkersWeekDay {
  date: string;
  usedMinutes: number;
  capacityMinutes: number;
}

export interface WorkersWeekWorker {
  id: string;
  name: string;
  isDefault: boolean;
  days: WorkersWeekDay[];
}

/**
 * `GET /workers/availability/week?start=YYYY-MM-DD`. Va por `adminServiceApi`
 * (pone el Bearer): la ruta es solo de la dueña. `workersApi`, la instancia de
 * arriba, no lo pone porque la disponibilidad de un día es pública.
 */
export async function fetchWorkersWeek(start: string): Promise<WorkersWeekResponse> {
  const { data } = await adminServiceApi.get<WorkersWeekResponse>(
    '/workers/availability/week',
    { params: { start } }
  );
  return data;
}
