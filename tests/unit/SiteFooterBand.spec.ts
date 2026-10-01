import { mount } from '@vue/test-utils';
import SiteFooterBand from 'src/components/index/SiteFooterBand.vue';

describe('SiteFooterBand', () => {
  it('muestra dirección y horario', () => {
    const texto = mount(SiteFooterBand).text();

    expect(texto).toContain('Sopó');
    expect(texto).toMatch(/8:00|08:00/);
  });

  it('el teléfono no se escribe: en su lugar va el botón de WhatsApp', () => {
    const wrapper = mount(SiteFooterBand);

    expect(wrapper.text()).not.toMatch(/\+?57\s?3\d{2}/);
    expect(wrapper.get('[data-test="whatsapp"]').attributes('href')).toContain('wa.me/');
  });

  it('el botón de WhatsApp lleva texto visible, no solo icono', () => {
    expect(mount(SiteFooterBand).get('[data-test="whatsapp"]').text()).toContain('WhatsApp');
  });
});
