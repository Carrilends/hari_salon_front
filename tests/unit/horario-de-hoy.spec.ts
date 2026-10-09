/**
 * La línea «Hoy · 8:00 a 20:00» del menú «Más» (M9). Sale de la misma regla
 * que el resto del portal —sábado, domingo y festivos con el horario reducido—
 * para que el menú no prometa las 8:00 de un lunes festivo que el backend
 * rechazaría. Se le pasan las partes del día: así la prueba no depende del
 * reloj de quien la ejecute.
 */
import {
  horarioDeHoy,
  isColombianHolidayQDate,
  type SalonNowParts,
} from 'src/helpers/businessHours';

const dia = (qDate: string): SalonNowParts => ({
  ymd: qDate.replace(/\//g, '-'),
  qDate,
  minOfDay: 12 * 60,
});

const LABORABLE = { abre: '8:00', cierra: '20:00' };
const REDUCIDO = { abre: '9:00', cierra: '19:00' };

describe('horarioDeHoy', () => {
  it('un miércoles corriente abre de 8:00 a 20:00', () => {
    expect(horarioDeHoy(dia('2026/10/07'))).toEqual(LABORABLE);
  });

  it('un sábado abre de 9:00 a 19:00', () => {
    expect(horarioDeHoy(dia('2026/10/10'))).toEqual(REDUCIDO);
  });

  it('un domingo abre de 9:00 a 19:00', () => {
    expect(horarioDeHoy(dia('2026/10/11'))).toEqual(REDUCIDO);
  });

  it('un lunes festivo (Día de la Raza, 12 de octubre de 2026) usa el horario reducido', () => {
    expect(isColombianHolidayQDate('2026/10/12')).toBe(true);
    expect(horarioDeHoy(dia('2026/10/12'))).toEqual(REDUCIDO);
  });

  it('un festivo trasladado por la Ley Emiliani (Todos los Santos → lunes 2 de noviembre) también', () => {
    expect(isColombianHolidayQDate('2026/11/02')).toBe(true);
    expect(horarioDeHoy(dia('2026/11/02'))).toEqual(REDUCIDO);
  });

  it('un lunes que no es festivo vuelve a 8:00 a 20:00', () => {
    expect(isColombianHolidayQDate('2026/10/26')).toBe(false);
    expect(horarioDeHoy(dia('2026/10/26'))).toEqual(LABORABLE);
  });

  it('las horas van sin cero a la izquierda y los minutos con dos cifras', () => {
    const { abre, cierra } = horarioDeHoy(dia('2026/10/07'));

    expect(abre).toMatch(/^[1-9]\d?:\d{2}$/);
    expect(cierra).toMatch(/^[1-9]\d?:\d{2}$/);
  });

  /**
   * Sin argumento mira el día del salón, en Bogotá: a las 03:00 UTC del sábado
   * en Sopó todavía son las 22:00 del viernes, y el viernes es laborable.
   */
  it('sin argumento usa el día de Bogotá, no el de UTC', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-10T03:00:00.000Z'));
    try {
      expect(horarioDeHoy()).toEqual(LABORABLE);
    } finally {
      jest.useRealTimers();
    }
  });
});
