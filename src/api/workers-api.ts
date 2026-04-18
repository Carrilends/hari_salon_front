import axios from 'axios';
import { adminServiceApi } from './services-api';

export type ReservationBlock = {
  startMin: number;
  endMin: number;
};

export type WorkerAvailabilityEntry = {
  id: string;
  name: string;
  isDefault: boolean;
  usedMinutes: number;
  capacityMinutes: number;
  availableMinutes: number;
  reservations: ReservationBlock[];
};

export type WorkerAvailabilityResponse = {
  workers: WorkerAvailabilityEntry[];
};

export type WorkerItem = {
  id: string;
  name: string;
  isDefault: boolean;
};

const workersApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

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
