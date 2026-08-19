export type RuleResult = true | string;
export type Rule<T = unknown> = (val: T) => RuleResult;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISO_8601_REGEX =
  /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;

export const isRequired = (val: unknown): RuleResult =>
  (val !== null && val !== undefined && val !== '') || 'Requerido';

export const isEmail =
  (message = 'Debe ser un correo válido'): Rule<string> =>
  (val) =>
    EMAIL_REGEX.test(val ?? '') || message;

export const minLength =
  (n: number, message = `Debe tener al menos ${n} caracteres`): Rule<string> =>
  (val) =>
    (val ?? '').length >= n || message;

export const minTrimmedLength =
  (n: number, message = `Debe tener al menos ${n} caracteres`): Rule<string> =>
  (val) =>
    (val ?? '').trim().length >= n || message;

export const hasUppercase =
  (message = 'Debe tener al menos una mayúscula'): Rule<string> =>
  (val) =>
    /[A-Z]/.test(val ?? '') || message;

export const hasLowercase =
  (message = 'Debe tener al menos una minúscula'): Rule<string> =>
  (val) =>
    /[a-z]/.test(val ?? '') || message;

export const hasNumber =
  (message = 'Debe tener al menos un número'): Rule<string> =>
  (val) =>
    /[0-9]/.test(val ?? '') || message;

export const matches =
  (
    other: () => string,
    message = 'Las contraseñas no coinciden'
  ): Rule<string> =>
  (val) =>
    val === other() || message;

export const isIsoDateString = (val: unknown): RuleResult => {
  if (typeof val !== 'string' || !ISO_8601_REGEX.test(val)) {
    return 'Fecha inválida';
  }
  return Number.isNaN(Date.parse(val)) ? 'Fecha inválida' : true;
};

export const isPositiveInteger = (val: unknown): RuleResult =>
  (typeof val === 'number' && Number.isInteger(val) && val >= 1) ||
  'Debe ser un entero mayor o igual a 1';

export const isUuid = (val: unknown): RuleResult =>
  (typeof val === 'string' && UUID_REGEX.test(val)) || 'UUID inválido';

export interface ReservationSelection {
  date: unknown;
  stylist: unknown;
  time: unknown;
  // Fase 4: la reserva se persiste con contacto (Ley 1581); la clienta debe dar
  // nombre, teléfono y consentimiento antes de reservar.
  name?: unknown;
  phone?: unknown;
  consent?: unknown;
}

export const reservationPayloadIsComplete = ({
  date,
  stylist,
  time,
  name,
  phone,
  consent,
}: ReservationSelection): RuleResult => {
  if (!date) return 'Selecciona una fecha';
  if (!stylist) return 'Selecciona un estilista';
  if (!time) return 'Selecciona una hora';
  if (minTrimmedLength(3)(typeof name === 'string' ? name : '') !== true)
    return 'Escribe tu nombre (mínimo 3 caracteres)';
  if (minTrimmedLength(7)(typeof phone === 'string' ? phone : '') !== true)
    return 'Escribe un teléfono válido (mínimo 7 dígitos)';
  if (consent !== true)
    return 'Debes aceptar la política de tratamiento de datos';
  return true;
};
