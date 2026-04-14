import axios from 'axios';

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
