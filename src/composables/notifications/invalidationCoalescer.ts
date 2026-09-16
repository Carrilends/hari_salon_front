import type { QueryKey } from '@tanstack/vue-query';

export interface CoalescerOptions {
  /** Cuánto se espera a que lleguen más eventos antes de invalidar. */
  windowMs?: number;
  /** Se inyectan para poder probar sin reloj real. */
  schedule?: (fn: () => void, ms: number) => unknown;
  cancel?: (handle: unknown) => void;
}

export interface InvalidationCoalescer {
  add(keys: readonly QueryKey[]): void;
  flushNow(): void;
  dispose(): void;
}

/**
 * Junta las claves a invalidar que lleguen en una ventana corta y las entrega
 * una sola vez. Sin esto, una ráfaga —la dueña cancela tres citas seguidas
 * desde WhatsApp— dispararía un refetch por evento y por clave. Es lo único
 * que una librería de flujos aportaría aquí, y sale en quince líneas.
 */
export function createInvalidationCoalescer(
  flush: (keys: QueryKey[]) => void,
  {
    windowMs = 250,
    schedule = (fn, ms) => setTimeout(fn, ms),
    cancel = (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
  }: CoalescerOptions = {}
): InvalidationCoalescer {
  // Dedupe por forma, no por identidad: dos `['reservations']` son la misma clave.
  const pending = new Map<string, QueryKey>();
  let timer: unknown = null;

  function drain() {
    timer = null;
    if (pending.size === 0) return;
    const keys = [...pending.values()];
    pending.clear();
    flush(keys);
  }

  function clearTimer() {
    if (timer === null) return;
    cancel(timer);
    timer = null;
  }

  return {
    add(keys) {
      for (const key of keys) pending.set(JSON.stringify(key), key);
      if (pending.size > 0 && timer === null) timer = schedule(drain, windowMs);
    },
    flushNow() {
      clearTimer();
      drain();
    },
    dispose() {
      clearTimer();
      pending.clear();
    },
  };
}
