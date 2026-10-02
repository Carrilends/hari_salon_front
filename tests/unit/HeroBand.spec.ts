import { mount } from '@vue/test-utils';
import HeroBand from 'src/components/index/HeroBand.vue';

const montar = () =>
  mount(HeroBand, {
    props: { foto: '/people/women-hair-cut.jpg', fotoAlt: 'Clienta en el salón' },
  });

describe('HeroBand', () => {
  it('pone el titular como único h1 de la banda', () => {
    const h1 = montar().findAll('h1');

    expect(h1).toHaveLength(1);
    expect(h1[0].text()).toContain('Cortes, color');
  });

  it('no ofrece un segundo botón de reservar: solo el enlace a servicios', () => {
    const texto = montar().text().toLowerCase();

    expect(texto).toContain('ver servicios');
    expect(texto).not.toContain('reservar');
  });

  it('el enlace a servicios avisa, no navega por su cuenta', async () => {
    const wrapper = montar();

    await wrapper.get('[data-test="ver-servicios"]').trigger('click');

    expect(wrapper.emitted('ver-servicios')).toHaveLength(1);
  });

  /**
   * El titular del tablero no nombra el salón, y la cabecera solo pone
   * «MARLENE». Sin esto, «Peluquería Marlene» —el término por el que la busca
   * quien vive en Sopó— desaparece del cuerpo de la única página que se
   * prerenderiza.
   */
  it('nombra el salón en el cuerpo de la página, no solo en el título', () => {
    expect(montar().text()).toContain('Peluquería Marlene');
  });

  it('la foto lleva texto alternativo', () => {
    expect(montar().get('img').attributes('alt')).toBe('Clienta en el salón');
  });
});
