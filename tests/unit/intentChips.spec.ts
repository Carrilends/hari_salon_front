import {
  INTENT_CHIPS,
  followUpChips,
} from 'src/composables/assistant/intentChips';
import type { AssistantPresentation } from 'src/api/assistant-api';

/**
 * Las nueve herramientas que el asistente publica. La lista se fija aquí a
 * propósito: un chip que prometa algo que ninguna herramienta sabe hacer es una
 * promesa falsa, y la clienta la descubre después de escribir.
 */
const HERRAMIENTAS = [
  'listarServicios',
  'consultarDisponibilidad',
  'crearReserva',
  'misReservas',
  'cancelarReserva',
  'reprogramarReserva',
  'recomendarServicios',
  'componerPaquete',
  'reservarPaquete',
];

describe('intentChips', () => {
  it('cada chip de arranque corresponde a una herramienta que existe', () => {
    expect(INTENT_CHIPS.length).toBeGreaterThan(0);
    for (const chip of INTENT_CHIPS) {
      expect(HERRAMIENTAS).toContain(chip.tool);
      expect(chip.label.length).toBeGreaterThan(0);
      expect(chip.prompt.length).toBeGreaterThan(0);
    }
  });

  it('solo «mis reservas» exige sesión: consultar el catálogo es público', () => {
    const conSesion = INTENT_CHIPS.filter((c) => c.requiresAuth);

    expect(conSesion.map((c) => c.tool)).toEqual(['misReservas']);
  });

  it('tras un listado de servicios ofrece consultar disponibilidad', () => {
    const presentaciones: AssistantPresentation[] = [
      {
        tipo: 'servicios',
        servicios: [{ id: 's1', nombre: 'Corte', precio: 25000, minutos: 30 }],
      },
    ];

    expect(followUpChips(presentaciones).map((c) => c.tool)).toEqual([
      'consultarDisponibilidad',
    ]);
  });

  it('tras una propuesta de paquete no ofrece nada: la tarjeta ya tiene su botón', () => {
    const presentaciones = [
      { tipo: 'paquete', evento: 'boda' },
    ] as unknown as AssistantPresentation[];

    expect(followUpChips(presentaciones)).toEqual([]);
  });

  it('sin presentaciones no se inventa una continuación', () => {
    expect(followUpChips(undefined)).toEqual([]);
    expect(followUpChips([])).toEqual([]);
  });
});
