import {
  ADMIN_RESERVATION_FILTERS,
  filterAdminReservations,
} from 'src/helpers/admin-reservation-filter';
import type { ReservationDto } from 'src/interfaces/booking';

const row = (status: ReservationDto['status']): ReservationDto =>
  ({ id: status, status }) as ReservationDto;

describe('filtro del panel de reservas', () => {
  it('solo ofrece estados que la lista de vigentes puede contener', () => {
    // GET /reservations devuelve `endedAt > now` y no canceladas: «cumplida» y
    // «cancelada» nunca llegan, así que ofrecerlas era prometer una lista vacía.
    const values = ADMIN_RESERVATION_FILTERS.map((o) => o.value);
    expect(values).toEqual(['pendiente', 'confirmada', 'todas']);
  });

  it('«todas» devuelve la lista completa', () => {
    const list = [row('pendiente'), row('confirmada')];
    expect(filterAdminReservations(list, 'todas')).toEqual(list);
  });

  it('un estado concreto deja solo sus filas', () => {
    const list = [row('pendiente'), row('confirmada'), row('pendiente')];
    expect(filterAdminReservations(list, 'confirmada')).toEqual([row('confirmada')]);
  });
});
