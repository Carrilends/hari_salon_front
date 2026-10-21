/**
 * El puente entre lo que el asistente enseña y lo que la bolsa guarda. Lo que
 * más importa es el fallo: un botón que no hace nada y no lo dice es peor que
 * un error en pantalla.
 */
import { createPinia, setActivePinia } from 'pinia';
import type Service from 'src/interfaces/service';
import { useBookStore } from 'src/stores/book-store';
import { useAddToBag } from 'src/composables/booking/useAddToBag';

const traer = jest.fn();
jest.mock('src/composables/services/useService', () => ({
  getService: (id: string) => traer(id),
}));

const servicio = (id: string): Service =>
  ({ id, name: `Servicio ${id}`, price: 30000, duration: 30 } as Service);

beforeEach(() => {
  setActivePinia(createPinia());
  traer.mockReset();
});

describe('useAddToBag', () => {
  it('añade un servicio a la bolsa trayéndolo por su id', async () => {
    traer.mockResolvedValue(servicio('s1'));

    const resultado = await useAddToBag().añadirServicio('s1');

    expect(traer).toHaveBeenCalledWith('s1');
    expect(resultado).toEqual({ ok: true, añadidos: 1, yaEstaban: 0 });
    expect(useBookStore().bookings).toHaveLength(1);
  });

  it('añadir dos veces el mismo servicio no lo duplica y dice que ya estaba', async () => {
    traer.mockResolvedValue(servicio('s1'));
    const bolsa = useAddToBag();

    await bolsa.añadirServicio('s1');
    const segunda = await bolsa.añadirServicio('s1');

    expect(segunda).toEqual({ ok: true, añadidos: 0, yaEstaban: 1 });
    expect(useBookStore().bookings).toHaveLength(1);
  });

  it('un paquete con un servicio que ya estaba añade solo los que faltan', async () => {
    traer.mockImplementation((id: string) => Promise.resolve(servicio(id)));
    const bolsa = useAddToBag();
    await bolsa.añadirServicio('s1');

    const resultado = await bolsa.añadirVarios(['s1', 's2']);

    expect(resultado).toEqual({ ok: true, añadidos: 1, yaEstaban: 1 });
    expect(useBookStore().bookings.map((l) => l.service.id)).toEqual([
      's1',
      's2',
    ]);
  });

  it('un paquete añade todas sus líneas', async () => {
    traer.mockImplementation((id: string) => Promise.resolve(servicio(id)));

    const resultado = await useAddToBag().añadirVarios(['s1', 's2']);

    expect(resultado).toEqual({ ok: true, añadidos: 2, yaEstaban: 0 });
    expect(useBookStore().bookings).toHaveLength(2);
  });

  it('si el servicio ya no existe lo dice, y no deja la bolsa a medias', async () => {
    traer.mockRejectedValue(new Error('404'));

    const resultado = await useAddToBag().añadirServicio('fantasma');

    expect(resultado).toEqual({
      ok: false,
      motivo: 'Ese servicio ya no está disponible.',
    });
    expect(useBookStore().bookings).toHaveLength(0);
  });

  it('si falla una línea del paquete, no añade ninguna', async () => {
    traer.mockImplementation((id: string) =>
      id === 's2'
        ? Promise.reject(new Error('404'))
        : Promise.resolve(servicio(id))
    );

    const resultado = await useAddToBag().añadirVarios(['s1', 's2']);

    expect(resultado.ok).toBe(false);
    expect(useBookStore().bookings).toHaveLength(0);
  });
});
