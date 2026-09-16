import type { QueryKey } from '@tanstack/vue-query';
import { createInvalidationCoalescer } from 'src/composables/notifications/invalidationCoalescer';

/** Temporizador de mentira: guarda el callback y la prueba lo dispara a mano. */
function fakeTimer() {
  const scheduled: { fn: () => void; ms: number }[] = [];
  const cancelled: unknown[] = [];
  return {
    scheduled,
    cancelled,
    schedule: (fn: () => void, ms: number) => {
      scheduled.push({ fn, ms });
      return scheduled.length; // id opaco
    },
    cancel: (id: unknown) => {
      cancelled.push(id);
    },
    fire() {
      const last = scheduled[scheduled.length - 1];
      last?.fn();
    },
  };
}

function setup(windowMs?: number) {
  const timer = fakeTimer();
  const flush = jest.fn<void, [QueryKey[]]>();
  const coalescer = createInvalidationCoalescer(flush, {
    windowMs,
    schedule: timer.schedule,
    cancel: timer.cancel,
  });
  return { timer, flush, coalescer };
}

describe('createInvalidationCoalescer', () => {
  it('una ráfaga dentro de la ventana produce un solo flush con claves únicas', () => {
    const { timer, flush, coalescer } = setup();
    coalescer.add([['reservations'], ['reservation-occupancy']]);
    coalescer.add([['reservations'], ['worker-availability']]);
    coalescer.add([['reservations']]);

    expect(flush).not.toHaveBeenCalled();
    timer.fire();
    expect(flush).toHaveBeenCalledTimes(1);
    expect(flush).toHaveBeenCalledWith([
      ['reservations'],
      ['reservation-occupancy'],
      ['worker-availability'],
    ]);
  });

  it('programa un solo temporizador por ventana, con la duración indicada', () => {
    const { timer, coalescer } = setup(250);
    coalescer.add([['a']]);
    coalescer.add([['b']]);
    expect(timer.scheduled).toHaveLength(1);
    expect(timer.scheduled[0]?.ms).toBe(250);
  });

  it('tras vaciar, la siguiente adición abre una ventana nueva', () => {
    const { timer, flush, coalescer } = setup();
    coalescer.add([['a']]);
    timer.fire();
    coalescer.add([['b']]);
    expect(timer.scheduled).toHaveLength(2);
    timer.fire();
    expect(flush).toHaveBeenNthCalledWith(1, [['a']]);
    expect(flush).toHaveBeenNthCalledWith(2, [['b']]);
  });

  it('deduplica por igualdad estructural, no por identidad', () => {
    const { timer, flush, coalescer } = setup();
    coalescer.add([['reservation-occupancy', 2026, 9]]);
    coalescer.add([['reservation-occupancy', 2026, 9]]);
    timer.fire();
    expect(flush).toHaveBeenCalledWith([['reservation-occupancy', 2026, 9]]);
  });

  it('flushNow vacía al instante y cancela el temporizador pendiente', () => {
    const { timer, flush, coalescer } = setup();
    coalescer.add([['a']]);
    coalescer.flushNow();
    expect(flush).toHaveBeenCalledWith([['a']]);
    expect(timer.cancelled).toHaveLength(1);
    timer.fire(); // si el temporizador llegara a dispararse, no hay nada que vaciar
    expect(flush).toHaveBeenCalledTimes(1);
  });

  it('dispose descarta lo pendiente y cancela el temporizador', () => {
    const { timer, flush, coalescer } = setup();
    coalescer.add([['a']]);
    coalescer.dispose();
    expect(timer.cancelled).toHaveLength(1);
    timer.fire();
    expect(flush).not.toHaveBeenCalled();
  });

  it('añadir una lista vacía no programa nada', () => {
    const { timer, flush, coalescer } = setup();
    coalescer.add([]);
    expect(timer.scheduled).toHaveLength(0);
    coalescer.flushNow();
    expect(flush).not.toHaveBeenCalled();
  });
});
