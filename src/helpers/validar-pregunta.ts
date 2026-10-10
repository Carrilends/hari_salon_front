/**
 * Validación de una pregunta frecuente, igual a la del backend
 * (`hair_salon_back/src/faqs/dto/create-faq.dto.ts`, F4).
 */
export const LIMITES_PREGUNTA = {
  pregunta: { min: 5, max: 180 },
  respuesta: { min: 5, max: 5000 },
} as const;

export type CampoPregunta = keyof typeof LIMITES_PREGUNTA;
export type ErroresPregunta = Partial<Record<CampoPregunta, string>>;

const VACIO: Record<CampoPregunta, string> = {
  pregunta: 'Escribe la pregunta.',
  respuesta: 'Escribe la respuesta.',
};

/** El error de un campo, o `null` si vale. Se mide sobre el texto recortado. */
export function errorDeCampo(
  campo: CampoPregunta,
  valor: string
): string | null {
  const { min, max } = LIMITES_PREGUNTA[campo];
  const limpio = valor.trim();
  if (!limpio) return VACIO[campo];
  if (limpio.length < min) return `Escribe al menos ${min} caracteres.`;
  if (limpio.length > max) return `Máximo ${max} caracteres.`;
  return null;
}

export function erroresDePregunta(valores: {
  pregunta: string;
  respuesta: string;
}): ErroresPregunta {
  const errores: ErroresPregunta = {};
  const pregunta = errorDeCampo('pregunta', valores.pregunta);
  const respuesta = errorDeCampo('respuesta', valores.respuesta);
  if (pregunta) errores.pregunta = pregunta;
  if (respuesta) errores.respuesta = respuesta;
  return errores;
}
