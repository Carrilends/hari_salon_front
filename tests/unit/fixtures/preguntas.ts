/**
 * Preguntas de prueba, con los textos del tablero. Solo datos: no se usan
 * dentro de las fábricas de `jest.mock`, que se elevan sobre los `import`.
 */
import type { FaqItem } from 'src/api/apiTypes';

export function pregunta(
  id: string,
  question: string,
  sortOrder: number,
  answer = 'Una respuesta de prueba.'
): FaqItem {
  return {
    id,
    question,
    answer,
    sortOrder,
    createdAt: '2026-10-01T12:00:00.000Z',
    updatedAt: '2026-10-01T12:00:00.000Z',
  };
}

export const PREGUNTAS: FaqItem[] = [
  pregunta(
    'p-reservar',
    '¿Cómo reservo una cita?',
    0,
    'Pulsa «Reservar», elige tus servicios, el día y la hora.'
  ),
  pregunta(
    'p-cambiar',
    '¿Puedo cambiar o cancelar mi cita?',
    1,
    'Sí. Entra en «Mis reservas» con tu cuenta y muévela o cancélala desde ahí.'
  ),
  pregunta(
    'p-horario',
    '¿Cuál es el horario?',
    2,
    'De lunes a viernes de 8:00 a 20:00; sábados, domingos y festivos de 9:00 a 19:00.'
  ),
];

export const idsDe = (lista: FaqItem[]) => lista.map((item) => item.id);
