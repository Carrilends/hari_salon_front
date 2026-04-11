import type { BookingLine } from 'src/interfaces/booking';
import type Service from 'src/interfaces/service';
import {
  buildWhatsAppUrl,
  generateBookingWhatsAppMessage,
} from 'src/helpers/whatsappBooking';

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

describe('whatsapp booking helpers', () => {
  test('buildWhatsAppUrl encodes message', () => {
    const url = buildWhatsAppUrl('573200000000', 'hola mundo + ñ');
    expect(url).toContain('https://wa.me/573200000000?text=');
    expect(url).toContain(encodeURIComponent('hola mundo + ñ'));
  });

  test('generateBookingWhatsAppMessage includes services, quantities, images and totals', () => {
    const bookings: BookingLine[] = [
      {
        service: makeService({
          id: 'a',
          name: 'Servicio A',
          images: [{ id: 'i1', url: 'http://img/a.jpg', isPrincipal: true, publicId: 'p1', version: '1' }],
        }),
        quantity: 2,
      },
      { service: makeService({ id: 'b', name: 'Servicio B' }), quantity: 1 },
    ];

    const msg = generateBookingWhatsAppMessage({
      bookings,
      bookingsCost: 25000,
      formattedDateTime: '1 de Enero de 2026 a las 10:00',
    });

    expect(msg).toContain('*Reserva - Hari Salon*');
    expect(msg).toContain('• Servicio A (×2): http://img/a.jpg');
    expect(msg).toContain('• Servicio B');
    expect(msg).toContain('*Costo Total:*');
    expect(msg).toContain('*Fecha y Hora:* 1 de Enero de 2026 a las 10:00');
  });
});

