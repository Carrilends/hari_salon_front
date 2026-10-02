import { mount } from '@vue/test-utils';
import CatalogBand from 'src/components/index/CatalogBand.vue';
import type { IndexSection } from 'src/constants/index-sections';

const SECCIONES: IndexSection[] = [
  { imgPath: '/people/a.jpg', title: 'Cortes de barbería', description: 'Clásicos y degradados' },
  { imgPath: '/people/b.jpg', title: 'Peinados y recogidos', description: 'Ondas y trenzas' },
];

const montar = () => mount(CatalogBand, { props: { secciones: SECCIONES } });

describe('CatalogBand', () => {
  it('pinta una tarjeta por sección, con su foto y su nombre', () => {
    const wrapper = montar();

    expect(wrapper.findAll('[data-test="seccion"]')).toHaveLength(2);
    expect(wrapper.text()).toContain('Cortes de barbería');
    expect(wrapper.findAll('img')[0].attributes('alt')).toBe('Cortes de barbería');
  });

  it('cada tarjeta es un botón real y avisa con su sección', async () => {
    const wrapper = montar();
    const tarjetas = wrapper.findAll('[data-test="seccion"]');

    expect(tarjetas[0].element.tagName).toBe('BUTTON');
    await tarjetas[1].trigger('click');

    expect(wrapper.emitted('abrir')?.[0]).toEqual([SECCIONES[1]]);
  });

  it('sin secciones no deja la banda con una rejilla vacía', () => {
    const wrapper = mount(CatalogBand, { props: { secciones: [] } });

    expect(wrapper.find('[data-test="rejilla"]').exists()).toBe(false);
  });
});
