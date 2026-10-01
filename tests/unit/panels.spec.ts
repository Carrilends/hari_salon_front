/**
 * El inicio abre el asistente desde su banda y el diálogo de reseña desde el
 * enlace «Deja la tuya», pero los dos paneles viven en el armazón. El estado
 * se comparte por módulo: si cada importador tuviera el suyo, la banda abriría
 * un panel distinto del que está montado y no pasaría nada en pantalla.
 */
import { useAssistantPanel } from 'src/composables/assistant/useAssistantPanel';
import { useReviewDialog } from 'src/composables/reviews/useReviewDialog';

describe.each([
  ['asistente', useAssistantPanel],
  ['reseña', useReviewDialog],
])('panel de %s', (_nombre, usar) => {
  beforeEach(() => usar().cerrar());

  it('empieza cerrado', () => {
    expect(usar().abierto.value).toBe(false);
  });

  it('abrir y cerrar cambian el estado', () => {
    const panel = usar();
    panel.abrir();
    expect(panel.abierto.value).toBe(true);
    panel.cerrar();
    expect(panel.abierto.value).toBe(false);
  });

  it('alternar va y vuelve', () => {
    const panel = usar();
    panel.alternar();
    expect(panel.abierto.value).toBe(true);
    panel.alternar();
    expect(panel.abierto.value).toBe(false);
  });

  it('dos llamadas comparten el mismo estado', () => {
    const uno = usar();
    const otro = usar();
    uno.abrir();
    expect(otro.abierto.value).toBe(true);
  });
});

/**
 * Un chip del inicio no solo abre el panel: lleva su pregunta. Sin esto, quien
 * toca «Ver disponibilidad» se encuentra una caja vacía y tiene que escribirla.
 * El prompt se consume una sola vez: si el panel se cierra y se vuelve a abrir
 * a mano, no debe repetir la pregunta de hace un rato.
 */
describe('pregunta pendiente del panel del asistente', () => {
  beforeEach(() => {
    const panel = useAssistantPanel();
    panel.cerrar();
    panel.consumirPendiente();
  });

  it('sin chip no hay nada pendiente', () => {
    useAssistantPanel().abrir();
    expect(useAssistantPanel().consumirPendiente()).toBeNull();
  });

  it('abrirCon abre el panel y deja la pregunta', () => {
    useAssistantPanel().abrirCon('¿Qué horarios tienen mañana?');

    expect(useAssistantPanel().abierto.value).toBe(true);
    expect(useAssistantPanel().consumirPendiente()).toBe('¿Qué horarios tienen mañana?');
  });

  it('la pregunta se consume una sola vez', () => {
    useAssistantPanel().abrirCon('¿Qué servicios tienen?');
    useAssistantPanel().consumirPendiente();

    expect(useAssistantPanel().consumirPendiente()).toBeNull();
  });
});

/**
 * Quién puede dejar una reseña lo decide el armazón, que es donde viven la
 * sesión y el router. El diálogo solo ofrece el canal: si nadie registró una
 * política, no se abre solo.
 */
describe('solicitud de reseña', () => {
  beforeEach(() => {
    useReviewDialog().cerrar();
    useReviewDialog().registrarSolicitud(null);
  });

  it('sin política registrada, pedirla no abre nada', () => {
    useReviewDialog().solicitar();

    expect(useReviewDialog().abierto.value).toBe(false);
  });

  it('con política registrada, la llama a ella', () => {
    const politica = jest.fn();
    useReviewDialog().registrarSolicitud(politica);

    useReviewDialog().solicitar();

    expect(politica).toHaveBeenCalledTimes(1);
    expect(useReviewDialog().abierto.value).toBe(false);
  });
});
