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

  it('ningún chip de disponibilidad pide un rango: la herramienta consulta UN día', () => {
    // `consultarDisponibilidad` exige una única `fecha`. Un chip que hable de
    // «esta semana» obliga al modelo a encadenar consultas, y puede agotar las
    // vueltas del turno: la clienta acabaría leyendo la respuesta de cortesía
    // después de tocar un botón que le ofrecimos nosotros. Que la herramienta
    // exista no basta; la promesa tiene que caber en una llamada.
    const RANGOS = /semana|mes|rango|pr[oó]ximos|entre el|varios d[ií]as/i;
    const disponibilidad = [
      ...INTENT_CHIPS,
      ...followUpChips([
        {
          tipo: 'servicios',
          servicios: [],
        } as unknown as AssistantPresentation,
      ]),
    ].filter((c) => c.tool === 'consultarDisponibilidad');

    expect(disponibilidad).not.toHaveLength(0);
    for (const chip of disponibilidad) {
      expect(chip.prompt).not.toMatch(RANGOS);
    }
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
