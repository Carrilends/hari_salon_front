import {
  isIsoDateString,
  isPositiveInteger,
  isUuid,
  reservationPayloadIsComplete,
} from 'src/helpers/validators';

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

describe('reservation validators (NF05 — frontend)', () => {
  it('Caso 1: isIsoDateString acepta una fecha ISO 8601 válida', () => {
    expect(isIsoDateString('2026-05-06T15:00:00Z')).toBe(true);
    expect(isIsoDateString('2026-05-06T15:00:00.000Z')).toBe(true);
  });

  it('Caso 2: isIsoDateString rechaza formatos no-ISO', () => {
    expect(isIsoDateString('06/05/2026')).toBe('Fecha inválida');
    expect(isIsoDateString('hola')).toBe('Fecha inválida');
    expect(isIsoDateString(undefined)).toBe('Fecha inválida');
  });

  it('Caso 3: isPositiveInteger rechaza cero, negativos y decimales', () => {
    expect(isPositiveInteger(0)).toBe('Debe ser un entero mayor o igual a 1');
    expect(isPositiveInteger(-5)).toBe('Debe ser un entero mayor o igual a 1');
    expect(isPositiveInteger(1.5)).toBe('Debe ser un entero mayor o igual a 1');
    expect(isPositiveInteger(30)).toBe(true);
  });

  it('Caso 4: isUuid acepta UUID v4 válido y rechaza strings inválidos', () => {
    expect(isUuid(VALID_UUID)).toBe(true);
    expect(isUuid('not-a-uuid')).toBe('UUID inválido');
    expect(isUuid('')).toBe('UUID inválido');
  });

  it('Caso 5: reservationPayloadIsComplete reporta el primer campo faltante', () => {
    expect(
      reservationPayloadIsComplete({ date: null, stylist: 'x', time: '10:00' }),
    ).toBe('Selecciona una fecha');
    expect(
      reservationPayloadIsComplete({ date: '2026-05-06', stylist: null, time: '10:00' }),
    ).toBe('Selecciona un estilista');
    expect(
      reservationPayloadIsComplete({ date: '2026-05-06', stylist: 'x', time: null }),
    ).toBe('Selecciona una hora');
    expect(
      reservationPayloadIsComplete({ date: '2026-05-06', stylist: 'x', time: '10:00' }),
    ).toBe(true);
  });
});
