import {
  bookingSelectionToUtcIso,
  createBookingTimeOptionsFn,
  getSalonNowParts,
  getBookingTimeBounds,
  isBookingDateTimeWithinHours,
  isQDateSelectable,
  isColombianHolidayQDate,
  getBusinessDayBounds,
  isWeekendQDate,
  parseQDateToLocalDate,
} from 'src/helpers/businessHours';

describe('businessHours', () => {
  test('parseQDateToLocalDate parses padded q-date strings', () => {
    const d = parseQDateToLocalDate('2026/04/07');
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2026);
    expect(d!.getMonth()).toBe(3);
    expect(d!.getDate()).toBe(7);
  });

  test('isWeekendQDate: Saturday is weekend', () => {
    expect(isWeekendQDate('2026/04/11')).toBe(true);
  });

  test('isWeekendQDate: Tuesday is not weekend', () => {
    expect(isWeekendQDate('2026/04/07')).toBe(false);
  });

  test('getBookingTimeBounds: weekday uses 8:00–20:00 span', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 3, 1, 12, 0, 0));
    const b = getBookingTimeBounds('2026/04/07');
    expect(b.startTotalMin).toBe(8 * 60);
    expect(b.endTotalMin).toBe(20 * 60);
    jest.useRealTimers();
  });

  test('getBookingTimeBounds: weekend uses 9:00–19:00 span', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 3, 1, 12, 0, 0));
    const b = getBookingTimeBounds('2026/04/11');
    expect(b.startTotalMin).toBe(9 * 60);
    expect(b.endTotalMin).toBe(19 * 60);
    jest.useRealTimers();
  });

  test('getBookingTimeBounds: today raises floor to current minute', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-15T19:30:00.000Z')); // 14:30 Bogota
    const b = getBookingTimeBounds('2026/05/15');
    expect(b.startTotalMin).toBe(14 * 60 + 30);
    jest.useRealTimers();
  });

  test('createBookingTimeOptionsFn rejects hour outside range', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 3, 1, 12, 0, 0));
    const getDate = () => '2026/04/07';
    const fn = createBookingTimeOptionsFn(getDate);
    expect(fn(7, null, null)).toBe(false);
    expect(fn(8, null, null)).toBe(true);
    expect(fn(22, null, null)).toBe(false);
    jest.useRealTimers();
  });

  test('createBookingTimeOptionsFn minute respects bounds', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 3, 1, 12, 0, 0));
    const getDate = () => '2026/04/07';
    const fn = createBookingTimeOptionsFn(getDate);
    expect(fn(19, 59, null)).toBe(true);
    expect(fn(20, 0, null)).toBe(true);
    expect(fn(20, 1, null)).toBe(false);
    jest.useRealTimers();
  });

  test('isBookingDateTimeWithinHours parses time from model string', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 3, 1, 12, 0, 0));
    expect(
      isBookingDateTimeWithinHours('2026/04/07', '2026-04-07 10:00')
    ).toBe(true);
    expect(
      isBookingDateTimeWithinHours('2026/04/07', '2026-04-07 22:00')
    ).toBe(false);
    jest.useRealTimers();
  });

  test('isQDateSelectable rejects invalid string', () => {
    expect(isQDateSelectable('bad')).toBe(false);
  });

  test('getBookingTimeBounds: subtracts service duration from ceiling', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 3, 1, 12, 0, 0));
    const b = getBookingTimeBounds('2026/04/07', 180);
    expect(b.startTotalMin).toBe(8 * 60);
    expect(b.endTotalMin).toBe(20 * 60 - 180);
    jest.useRealTimers();
  });

  test('getBookingTimeBounds: duration longer than day produces empty range', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 3, 1, 12, 0, 0));
    const b = getBookingTimeBounds('2026/04/07', 9999);
    expect(b.endTotalMin).toBeLessThan(b.startTotalMin);
    jest.useRealTimers();
  });

  test('createBookingTimeOptionsFn respects service duration', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 3, 1, 12, 0, 0));
    const getDate = () => '2026/04/07';
    const fn = createBookingTimeOptionsFn(getDate, () => 180);
    // Cierre 20:00; un servicio de 180 min debe empezar a más tardar a las 17:00.
    expect(fn(16, 59, null)).toBe(true);
    expect(fn(17, 0, null)).toBe(true);
    expect(fn(17, 1, null)).toBe(false);
    expect(fn(18, 0, null)).toBe(false);
    jest.useRealTimers();
  });

  test('isBookingDateTimeWithinHours with duration rejects late start', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 3, 1, 12, 0, 0));
    expect(
      isBookingDateTimeWithinHours('2026/04/07', '2026-04-07 17:00', 180)
    ).toBe(true);
    expect(
      isBookingDateTimeWithinHours('2026/04/07', '2026-04-07 18:00', 180)
    ).toBe(false);
    jest.useRealTimers();
  });

  test('bookingSelectionToUtcIso combines q-date and q-time model', () => {
    const iso = bookingSelectionToUtcIso('2026/04/07', '2026-04-07 14:30');
    expect(iso).not.toBeNull();
    expect(iso).toBe('2026-04-07T19:30:00.000Z');
  });

  test('getSalonNowParts uses salon timezone over client timezone', () => {
    jest.useFakeTimers();
    // 2026-04-19 01:10Z => 2026-04-18 20:10 en America/Bogota
    jest.setSystemTime(new Date('2026-04-19T01:10:00.000Z'));
    const now = getSalonNowParts();
    expect(now.qDate).toBe('2026/04/18');
    expect(now.minOfDay).toBe(20 * 60 + 10);
    jest.useRealTimers();
  });

  test('isQDateSelectable compares against salon day, not browser local day', () => {
    jest.useFakeTimers();
    // A esta hora UTC ya puede ser 19 en otras TZ, pero en Bogota aun es 18.
    jest.setSystemTime(new Date('2026-04-19T01:10:00.000Z'));
    expect(isQDateSelectable('2026/04/18')).toBe(true);
    expect(isQDateSelectable('2026/04/17')).toBe(false);
    jest.useRealTimers();
  });

  test('bookingSelectionToUtcIso maps salon local time to utc iso', () => {
    const iso = bookingSelectionToUtcIso('2026/04/18', '2026-04-18 18:30');
    expect(iso).toBe('2026-04-18T23:30:00.000Z');
  });
});

/**
 * Festivos en el cliente.
 *
 * El CLAUDE.md del monorepo exige que `businessHours.ts` y
 * `hair_salon_back/src/reservations/salon-schedule.ts` coincidan, y el propio
 * archivo reconocía por escrito que los festivos faltaban. Las listas de abajo
 * son LAS MISMAS que las de `salon-schedule.spec.ts` en el backend: escritas a
 * mano desde el calendario publicado (Ley 51 de 1983, «Ley Emiliani») y no
 * generadas por ningún cálculo. Duplicarlas es el precio de que los dos repos
 * sean independientes; si un día divergen, uno de los dos tests se pone rojo,
 * que es justo lo que se quiere.
 */
const FESTIVOS_REFERENCIA: Record<number, string[]> = {
  2026: [
    '2026/01/01', '2026/01/12', '2026/03/23', '2026/04/02', '2026/04/03',
    '2026/05/01', '2026/05/18', '2026/06/08', '2026/06/15', '2026/06/29',
    '2026/07/20', '2026/08/07', '2026/08/17', '2026/10/12', '2026/11/02',
    '2026/11/16', '2026/12/08', '2026/12/25',
  ],
  2027: [
    '2027/01/01', '2027/01/11', '2027/03/22', '2027/03/25', '2027/03/26',
    '2027/05/01', '2027/05/10', '2027/05/31', '2027/06/07', '2027/07/05',
    '2027/07/20', '2027/08/07', '2027/08/16', '2027/10/18', '2027/11/01',
    '2027/11/15', '2027/12/08', '2027/12/25',
  ],
  2028: [
    '2028/01/01', '2028/01/10', '2028/03/20', '2028/04/13', '2028/04/14',
    '2028/05/01', '2028/05/29', '2028/06/19', '2028/06/26', '2028/07/03',
    '2028/07/20', '2028/08/07', '2028/08/21', '2028/10/16', '2028/11/06',
    '2028/11/13', '2028/12/08', '2028/12/25',
  ],
};

/** Todos los días del año en formato q-date, para barrer el calendario. */
function diasDelAnioQDate(year: number): string[] {
  const out: string[] = [];
  const cursor = new Date(Date.UTC(year, 0, 1));
  while (cursor.getUTCFullYear() === year) {
    out.push(cursor.toISOString().slice(0, 10).replace(/-/g, '/'));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

describe('businessHours — festivos colombianos', () => {
  test.each([2026, 2027, 2028])(
    'el calendario de %i coincide con la lista de referencia (misma que el backend)',
    (year) => {
      const esperados = FESTIVOS_REFERENCIA[year];
      expect(esperados).toHaveLength(18);
      const calculados = diasDelAnioQDate(year).filter((q) =>
        isColombianHolidayQDate(q)
      );
      expect(calculados).toEqual(esperados);
    }
  );

  test('un festivo trasladable que ya cae en lunes se queda donde está', () => {
    expect(isColombianHolidayQDate('2026/06/29')).toBe(true);
    expect(isColombianHolidayQDate('2026/07/06')).toBe(false);
  });

  test('un festivo trasladable en domingo se corre al lunes siguiente', () => {
    expect(isColombianHolidayQDate('2026/11/01')).toBe(false);
    expect(isColombianHolidayQDate('2026/11/02')).toBe(true);
  });

  test('un festivo de fecha fija no se traslada aunque caiga en sábado', () => {
    expect(isColombianHolidayQDate('2027/05/01')).toBe(true);
    expect(isColombianHolidayQDate('2027/05/03')).toBe(false);
  });

  test('un día laborable corriente no es festivo', () => {
    expect(isColombianHolidayQDate('2026/04/07')).toBe(false);
  });

  test('getBusinessDayBounds: un lunes festivo usa 9:00–19:00 como el fin de semana', () => {
    // 2 nov 2026 (Todos los Santos trasladado). Antes daba 8:00–20:00.
    expect(getBusinessDayBounds('2026/11/02')).toEqual({
      openMin: 9 * 60,
      closeMin: 19 * 60,
    });
  });

  test('getBusinessDayBounds: un lunes corriente sigue en 8:00–20:00', () => {
    expect(getBusinessDayBounds('2026/10/26')).toEqual({
      openMin: 8 * 60,
      closeMin: 20 * 60,
    });
  });

  test('getBookingTimeBounds respeta el horario de festivo', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 3, 1, 12, 0, 0));
    const b = getBookingTimeBounds('2026/11/02');
    expect(b.startTotalMin).toBe(9 * 60);
    expect(b.endTotalMin).toBe(19 * 60);
    jest.useRealTimers();
  });

  test('isBookingDateTimeWithinHours rechaza las 8:30 de un festivo', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 3, 1, 12, 0, 0));
    // Las 8:30 son válidas un lunes normal y no lo son en festivo: es el
    // cambio que el backend ya aplica y que el portal debe reflejar.
    expect(isBookingDateTimeWithinHours('2026/10/26', '08:30', 30)).toBe(true);
    expect(isBookingDateTimeWithinHours('2026/11/02', '08:30', 30)).toBe(false);
    expect(isBookingDateTimeWithinHours('2026/11/02', '09:00', 30)).toBe(true);
    jest.useRealTimers();
  });
});
