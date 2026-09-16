import { queryKeys } from 'src/api/query-keys';

/**
 * TanStack Query invalida por prefijo: `invalidateQueries({ queryKey: ['a'] })`
 * alcanza a `['a', 'b']`. Estas pruebas fijan que cada clave concreta extiende su
 * raíz, que es lo que permite invalidar «todo lo de reservas» con una sola clave.
 */
describe('registro de claves de consulta', () => {
  it('la clave de reservas propias extiende a la raíz de reservas', () => {
    const root = queryKeys.reservations.all;
    expect(queryKeys.reservations.me.slice(0, root.length)).toEqual([...root]);
  });

  it('la ocupación de un mes extiende a la raíz de ocupación', () => {
    const root = queryKeys.occupancy.all;
    const key = queryKeys.occupancy.month(2026, 9);
    expect(key.slice(0, root.length)).toEqual([...root]);
    expect(key).toEqual(['reservation-occupancy', 2026, 9]);
  });

  it('la disponibilidad de un día extiende a la raíz de disponibilidad', () => {
    const root = queryKeys.workerAvailability.all;
    const key = queryKeys.workerAvailability.day('2026-09-15');
    expect(key.slice(0, root.length)).toEqual([...root]);
    expect(key).toEqual(['worker-availability', '2026-09-15']);
  });

  it('las tres raíces son distintas entre sí', () => {
    const roots = [
      queryKeys.reservations.all[0],
      queryKeys.occupancy.all[0],
      queryKeys.workerAvailability.all[0],
    ];
    expect(new Set(roots).size).toBe(3);
  });
});
