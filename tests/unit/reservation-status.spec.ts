import { reservationStatusMeta } from 'src/helpers/reservation-status';

describe('reservationStatusMeta', () => {
  it('mapea cada estado a su etiqueta y color', () => {
    expect(reservationStatusMeta('pendiente')).toEqual({
      label: 'Pendiente',
      color: 'orange',
    });
    expect(reservationStatusMeta('confirmada')).toEqual({
      label: 'Confirmada',
      color: 'positive',
    });
    expect(reservationStatusMeta('cumplida')).toEqual({
      label: 'Cumplida',
      color: 'blue',
    });
    expect(reservationStatusMeta('cancelada')).toEqual({
      label: 'Cancelada',
      color: 'negative',
    });
  });

  it('un estado desconocido cae en un gris con la cadena original', () => {
    const meta = reservationStatusMeta('otro' as never);
    expect(meta.color).toBe('grey');
    expect(meta.label).toBe('otro');
  });
});
