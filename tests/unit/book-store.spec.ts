import { createPinia, setActivePinia } from 'pinia';
import type Service from 'src/interfaces/service';
import { migrateLegacyBookings, useBookStore } from 'src/stores/book-store';

function makeService(overrides?: Partial<Service>): Service {
  return {
    id: overrides?.id ?? 's1',
    name: overrides?.name ?? 'Corte',
    gender: overrides?.gender ?? 'Unisex',
    type: overrides?.type ?? 'service',
    price: overrides?.price ?? 10_000,
    isSpecial: overrides?.isSpecial ?? false,
    duration: overrides?.duration ?? 30,
    slug: overrides?.slug ?? 'corte',
    tags: overrides?.tags ?? [],
    images: overrides?.images ?? [],
    detail: overrides?.detail ?? {
      id: 'd1',
      description: 'desc',
      specifications: {},
    },
  };
}

describe('book-store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  // El servidor acepta cada servicio una vez por cita, así que la bolsa también:
  // antes guardaba «× 2» y mandaba uno (hallazgo de la F4). Para dos personas,
  // una cita por persona («Reservar para otra persona»).
  test('migrateLegacyBookings deja cada servicio una vez, venga de Service[]…', () => {
    const raw = [makeService({ id: 'a' }), makeService({ id: 'a' }), makeService({ id: 'b' })];
    const migrated = migrateLegacyBookings(raw as unknown);

    expect(migrated.map((l) => l.service.id)).toEqual(['a', 'b']);
    expect(migrated[0]).not.toHaveProperty('quantity');
  });

  test('…o de líneas guardadas con cantidad', () => {
    const migrated = migrateLegacyBookings([
      { service: makeService({ id: 'a' }), quantity: 3 },
    ] as unknown);

    expect(migrated).toEqual([{ service: makeService({ id: 'a' }) }]);
  });

  test('añadir un servicio que ya está no lo duplica ni cambia los totales', () => {
    const store = useBookStore();
    const s1 = makeService({ id: 's1', price: 5000, duration: 30 });
    const s2 = makeService({ id: 's2', price: 7000, duration: 45 });

    expect(store.addBooking(s1)).toBe(true);
    expect(store.addBooking(s1)).toBe(false);
    expect(store.addBooking(s2)).toBe(true);

    expect(store.bookings).toHaveLength(2);
    expect(store.totalBookingQuantity).toBe(2);
    expect(store.bookingsCost).toBe(5000 + 7000);
    expect(store.bookingsDuration).toBe(30 + 45);
    expect(store.hasBooking('s1')).toBe(true);

    store.removeBooking('s2');
    expect(store.hasBooking('s2')).toBe(false);
    expect(store.bookingsCost).toBe(5000);
  });
});
