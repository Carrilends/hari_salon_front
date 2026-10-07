/**
 * iOS Safari solo aplica `:active` a un toque si el documento tiene algún oyente
 * de `touchstart`. Sin él, el hundido de «Realce y hundido» no se ve en un
 * iPhone, que es justo donde más se pulsa.
 */
import { activarActiveTactil } from 'src/helpers/activar-active-tactil';

describe('activarActiveTactil', () => {
  it('ata un `touchstart` pasivo que no hace nada', () => {
    const doc = { addEventListener: jest.fn() };

    activarActiveTactil(doc as unknown as Document);

    expect(doc.addEventListener).toHaveBeenCalledTimes(1);
    const [evento, oyente, opciones] = doc.addEventListener.mock.calls[0];
    expect(evento).toBe('touchstart');
    expect(opciones).toEqual({ passive: true });
    expect(() => oyente()).not.toThrow();
  });

  it('lo ata una sola vez por documento', () => {
    const doc = { addEventListener: jest.fn() };

    activarActiveTactil(doc as unknown as Document);
    activarActiveTactil(doc as unknown as Document);

    expect(doc.addEventListener).toHaveBeenCalledTimes(1);
  });

  /** `quasar ssg generate` evalúa los arranques en Node, sin `document`. */
  it('sin documento (SSG) no hace nada ni revienta', () => {
    expect(() => activarActiveTactil(null)).not.toThrow();
  });
});
