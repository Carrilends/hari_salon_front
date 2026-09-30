import type { AssistantPresentation } from 'src/api/assistant-api';

/**
 * Una sugerencia clicable del widget.
 *
 * `tool` no lo usa el código: está para que la regla se pueda comprobar. Cada
 * chip debe corresponder a una herramienta que el asistente tiene de verdad;
 * uno que prometa algo que ninguna sabe hacer es una promesa falsa, y la
 * clienta lo descubre después de escribir. La prueba `intentChips.spec.ts`
 * contrasta este campo con las nueve herramientas publicadas.
 */
export interface IntentChip {
  label: string;
  /** Lo que se envía al chat al tocarlo. */
  prompt: string;
  /** Herramienta del asistente que lo atiende. */
  tool: string;
  /** Solo se muestra con sesión iniciada. */
  requiresAuth?: boolean;
}

/**
 * Lo que se ofrece antes del primer mensaje. Hasta ahora ahí solo había un
 * texto no clicable, que empuja a escribir cualquier cosa en vez de encauzar
 * hacia lo que el asistente sabe hacer.
 *
 * Son cuatro y no ocho a propósito: en un panel de 380 px, una parrilla de
 * sugerencias deja de leerse y vuelve a ser ruido.
 *
 * Aviso de alcance: esto reduce el off-topic accidental, no el abuso. El abuso
 * se ataja en el endpoint (NF14), no en el widget.
 */
export const INTENT_CHIPS: IntentChip[] = [
  {
    label: 'Ver servicios',
    prompt: '¿Qué servicios tienen?',
    tool: 'listarServicios',
  },
  {
    label: 'Ver disponibilidad',
    prompt: '¿Qué horarios tienen disponibles esta semana?',
    tool: 'consultarDisponibilidad',
  },
  {
    label: 'Paquete para un evento',
    prompt: 'Quiero armar un paquete para un evento.',
    tool: 'componerPaquete',
  },
  {
    label: 'Mis reservas',
    prompt: '¿Cuáles son mis reservas?',
    tool: 'misReservas',
    requiresAuth: true,
  },
];

/** La continuación obvia de un listado de servicios: cuándo se puede ir. */
const TRAS_SERVICIOS: IntentChip = {
  label: 'Ver disponibilidad',
  prompt: '¿Qué horarios tienen disponibles?',
  tool: 'consultarDisponibilidad',
};

/**
 * Qué ofrecer después de una respuesta, **deducido del dato presentado** y no
 * del texto: adivinar la intención leyendo lo que escribió el modelo sería
 * inventar. Un turno que no presentó nada no recibe sugerencias.
 *
 * Una propuesta de paquete tampoco: su tarjeta ya trae el botón de reservar, y
 * poner al lado otro camino solo reparte la atención.
 */
export function followUpChips(
  presentaciones: AssistantPresentation[] | undefined
): IntentChip[] {
  if (!presentaciones?.length) return [];
  const hayServicios = presentaciones.some((p) => p.tipo === 'servicios');
  return hayServicios ? [TRAS_SERVICIOS] : [];
}
