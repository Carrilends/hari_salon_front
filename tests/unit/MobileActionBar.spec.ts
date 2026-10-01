import { mount } from '@vue/test-utils';
import MobileActionBar from 'src/components/index/MobileActionBar.vue';

describe('MobileActionBar', () => {
  it('«Reservar» avisa a la página, no navega por su cuenta', async () => {
    const wrapper = mount(MobileActionBar);

    await wrapper.get('[data-test="reservar"]').trigger('click');

    expect(wrapper.emitted('reservar')).toHaveLength(1);
  });

  it('el botón de WhatsApp lleva al número del salón y se abre fuera', () => {
    const enlace = mount(MobileActionBar).get('[data-test="whatsapp"]');

    expect(enlace.attributes('href')).toContain('wa.me/573208977471');
    expect(enlace.attributes('target')).toBe('_blank');
    expect(enlace.attributes('rel')).toContain('noopener');
  });

  it('el botón de WhatsApp es solo icono, así que lleva nombre accesible', () => {
    const enlace = mount(MobileActionBar).get('[data-test="whatsapp"]');

    expect(enlace.attributes('aria-label')).toMatch(/whatsapp/i);
  });

  it('no muestra el número de teléfono escrito', () => {
    expect(mount(MobileActionBar).text()).not.toMatch(/\d{3}\s?\d{3}\s?\d{2}\s?\d{2}/);
  });
});
