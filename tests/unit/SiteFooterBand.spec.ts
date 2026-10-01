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

  it('ofrece el acceso de administración mientras nadie haya entrado', async () => {
    const wrapper = mount(SiteFooterBand, { props: { mostrarAdmin: true } });

    await wrapper.get('[data-test="admin"]').trigger('click');

    expect(wrapper.emitted('admin')).toHaveLength(1);
  });

  it('con la sesión iniciada no enseña el acceso de administración', () => {
    const wrapper = mount(SiteFooterBand, { props: { mostrarAdmin: false } });

    expect(wrapper.find('[data-test="admin"]').exists()).toBe(false);
  });
});
