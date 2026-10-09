/**
 * `reservations-api.ts` lee `import.meta.env` y no se puede importar en Jest:
 * se lee la fuente.
 *
 * Crear una reserva iba por `reservationsApi`, que NO añade el Bearer: toda
 * reserva del portal salía anónima aunque la clienta tuviera sesión, y nunca
 * aparecía en «Mis reservas». Con el cajón (B4: sin `contact` si hay sesión)
 * eso sería además un 400 seguro.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const API = readFileSync(
  join(__dirname, '../../src/api/reservations-api.ts'),
  'utf8'
);

describe('crear una reserva', () => {
  const cuerpo = API.slice(
    API.indexOf('export async function createReservation')
  );

  it('va por la instancia que añade el Bearer cuando hay sesión', () => {
    expect(cuerpo).toMatch(
      /authedReservationsApi\.post<ReservationDto>\(\s*'\/reservations'/
    );
  });

  it('ya no va por la instancia sin Bearer', () => {
    expect(cuerpo).not.toMatch(/(^|[^\w])reservationsApi\.post/);
  });
});
