/**
 * Las fotos del inicio llegan tarde —`public/people/` pesa unos 10 MB sin
 * optimizar— y hasta ahora dejaban un rectángulo vacío. Ahora el hueco espera
 * con vida y se apaga cuando la foto llega.
 */
import { mount } from '@vue/test-utils';
import CatalogBand from 'src/components/index/CatalogBand.vue';
import HeroBand from 'src/components/index/HeroBand.vue';

const SECCIONES = [
  { title: 'Corte de caballero', imgPath: '/people/a.jpg', filterId: '1' },
  { title: 'Maquillaje', imgPath: '/people/b.jpg', filterId: '2' },
] as never[];

describe('las fotos de la carta', () => {
  it('esperan marcadas, y dejan de hacerlo cuando llegan', async () => {
    const wrapper = mount(CatalogBand, { props: { secciones: SECCIONES } });
    const fotos = wrapper.findAll('.catalog-band__foto');

    expect(fotos).toHaveLength(2);
    expect(fotos[0].classes()).toContain('m-foto--esperando');

    // El `load` se dispara en el `<img>` de dentro del `<picture>`: no burbujea,
    // así que lanzarlo sobre el `<picture>` no llegaría al manejador.
    await wrapper.findAll('.catalog-band__foto img')[0].trigger('load');

    expect(wrapper.findAll('.catalog-band__foto')[0].classes()).not.toContain(
      'm-foto--esperando'
    );
    // La otra sigue esperando: el estado es por foto, no por banda.
    expect(wrapper.findAll('.catalog-band__foto')[1].classes()).toContain(
      'm-foto--esperando'
    );
  });

  it('las de la carta sí se aplazan: están bajo el pliegue', () => {
    const wrapper = mount(CatalogBand, { props: { secciones: SECCIONES } });

    expect(wrapper.findAll('img')[0].attributes('loading')).toBe('lazy');
    expect(wrapper.findAll('source')).toHaveLength(2);
  });

  /** Una foto rota no puede quedarse palpitando para siempre. */
  it('una foto que falla también deja de esperar', async () => {
    const wrapper = mount(CatalogBand, { props: { secciones: SECCIONES } });

    await wrapper.findAll('.catalog-band__foto img')[0].trigger('error');

    expect(wrapper.findAll('.catalog-band__foto')[0].classes()).not.toContain(
      'm-foto--esperando'
    );
  });
});

describe('la foto de la portada', () => {
  it('espera marcada, y deja de hacerlo cuando llega', async () => {
    const wrapper = mount(HeroBand, {
      props: { foto: '/people/portada.jpg', fotoAlt: 'Clienta' },
    });

    expect(wrapper.get('.hero-band__foto').classes()).toContain(
      'm-foto--esperando'
    );

    // El `load` se dispara en el `<img>` de dentro del `<picture>`: no burbujea,
    // así que lanzarlo sobre el `<picture>` no llegaría al manejador.
    await wrapper.get('.hero-band__foto img').trigger('load');

    expect(wrapper.get('.hero-band__foto').classes()).not.toContain(
      'm-foto--esperando'
    );
  });

  it('la foto de la portada no se aplaza: es la que marca la velocidad', () => {
    const wrapper = mount(HeroBand, {
      props: { foto: '/people/women-hair-cut.jpg', fotoAlt: 'Clienta' },
    });

    expect(wrapper.get('img').attributes('loading')).toBe('eager');
    expect(wrapper.get('source').attributes('type')).toBe('image/webp');
  });
});
