import {
  bookingSelectionToUtcIso,
  createBookingTimeOptionsFn,
  getSalonNowParts,
  getBookingTimeBounds,
  isBookingDateTimeWithinHours,
  isQDateSelectable,
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

  test('getBookingTimeBounds: weekday uses 8:00–21:59 span', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 3, 1, 12, 0, 0));
    const b = getBookingTimeBounds('2026/04/07');
    expect(b.startTotalMin).toBe(8 * 60);
    expect(b.endTotalMin).toBe(21 * 60 + 59);
    jest.useRealTimers();
  });

  test('getBookingTimeBounds: weekend uses 9:00–19:59 span', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 3, 1, 12, 0, 0));
    const b = getBookingTimeBounds('2026/04/11');
    expect(b.startTotalMin).toBe(9 * 60);
    expect(b.endTotalMin).toBe(19 * 60 + 59);
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
    expect(fn(21, 0, null)).toBe(true);
    expect(fn(21, 59, null)).toBe(true);
    expect(fn(21, 60, null)).toBe(false);
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
    expect(b.endTotalMin).toBe(21 * 60 + 59 - 180);
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
    expect(fn(18, 0, null)).toBe(true);
    expect(fn(18, 59, null)).toBe(true);
    expect(fn(19, 0, null)).toBe(false);
    expect(fn(21, 0, null)).toBe(false);
    jest.useRealTimers();
  });

  test('isBookingDateTimeWithinHours with duration rejects late start', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 3, 1, 12, 0, 0));
    expect(
      isBookingDateTimeWithinHours('2026/04/07', '2026-04-07 18:00', 180)
    ).toBe(true);
    expect(
      isBookingDateTimeWithinHours('2026/04/07', '2026-04-07 19:00', 180)
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
