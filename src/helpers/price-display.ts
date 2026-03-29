const copFormatter = new Intl.NumberFormat('es-CO', {
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

/** Solo para UI (ej. 50000 → "50.000"). El valor de negocio sigue siendo numérico. */
export function formatCopDisplay(value: number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const n = Number(value);
  if (Number.isNaN(n)) return '';
  return copFormatter.format(Math.trunc(n));
}

/** Interpreta lo que el usuario escribe: solo dígitos → entero. */
export function parseCopInputToNumber(input: string): number | null {
  const digits = String(input ?? '').replace(/\D/g, '');
  if (!digits) return null;
  const n = parseInt(digits, 10);
  return Number.isNaN(n) ? null : n;
}

/** Para reglas de q-input que reciben el texto formateado o un número. */
export function copNumericValue(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number' && !Number.isNaN(val)) return Math.trunc(val);
  return parseCopInputToNumber(String(val));
}
