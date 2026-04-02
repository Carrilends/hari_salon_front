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

  test('migrateLegacyBookings converts Service[] to BookingLine[] and merges duplicates', () => {
    const raw = [makeService({ id: 'a' }), makeService({ id: 'a' }), makeService({ id: 'b' })];
    const migrated = migrateLegacyBookings(raw as unknown);

    const byId = new Map(migrated.map((l) => [l.service.id, l.quantity]));
    expect(byId.get('a')).toBe(2);
    expect(byId.get('b')).toBe(1);
  });

  test('add/increment/decrement/update/remove adjust totals correctly', () => {
    const store = useBookStore();
    const s1 = makeService({ id: 's1', price: 5000 });
    const s2 = makeService({ id: 's2', price: 7000 });

    store.addBooking(s1);
    store.addBooking(s1);
    store.addBooking(s2);

    expect(store.totalBookingQuantity).toBe(3);
    expect(store.bookingsCost).toBe(5000 * 2 + 7000);

    store.decrementBookingQuantity('s1');
    expect(store.totalBookingQuantity).toBe(2);
    expect(store.bookingsCost).toBe(5000 + 7000);

    store.updateBookingQuantity('s2', 3);
    expect(store.totalBookingQuantity).toBe(4);
    expect(store.bookingsCost).toBe(5000 + 7000 * 3);

    store.updateBookingQuantity('s2', 0);
    expect(store.bookings.find((l) => l.service.id === 's2')).toBeUndefined();
  });
});

