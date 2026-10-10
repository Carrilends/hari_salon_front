/**
 * «Mis estilistas»: lo que no se puede comprobar montando.
 *
 * `workers-api.ts` lee `import.meta.env`, que ts-jest no compila a CommonJS:
 * ninguna prueba lo importa sin doblarlo. Lo que el plan promete de él —que
 * `fetchWorkersWeek` va con el Bearer a la ruta del contrato §4.5 y que
 * `fetchWorkerAvailability`, que usa el diálogo de reserva, no cambió— se lee
 * de la fuente.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const leer = (ruta: string) =>
  readFileSync(join(__dirname, '../../src', ruta), 'utf8');

describe('workers-api · la semana', () => {
  const API = leer('api/workers-api.ts');

  it('declara el contrato §4.5 con sus nombres', () => {
    expect(API).toMatch(/export interface WorkersWeekResponse \{/);
    expect(API).toMatch(
      /export async function fetchWorkersWeek\(\s*start: string\s*\): Promise<WorkersWeekResponse>/
    );
  });

  it('pide la semana con el Bearer de la dueña, a la ruta del contrato', () => {
    expect(API).toMatch(
      /adminServiceApi\.get<WorkersWeekResponse>\(\s*'\/workers\/availability\/week',\s*\{\s*params:\s*\{\s*start\s*\}\s*\}/
    );
  });

  it('no cambia fetchWorkerAvailability (la usa el diálogo de reserva)', () => {
    expect(API).toMatch(
      /export async function fetchWorkerAvailability\(\s*dateYmd: string,?\s*\): Promise<WorkerAvailabilityResponse> \{\s*const \{ data \} = await workersApi\.get<WorkerAvailabilityResponse>\(\s*'\/workers\/availability',\s*\{ params: \{ date: dateYmd \} \},?\s*\);\s*return data;\s*\}/
    );
  });
});
