import { buildWhatsAppUrl } from 'src/helpers/whatsappBooking';

describe('whatsapp booking helpers', () => {
  test('buildWhatsAppUrl encodes message', () => {
    const url = buildWhatsAppUrl('573200000000', 'hola mundo + ñ');
    expect(url).toContain('https://wa.me/573200000000?text=');
    expect(url).toContain(encodeURIComponent('hola mundo + ñ'));
  });
});

