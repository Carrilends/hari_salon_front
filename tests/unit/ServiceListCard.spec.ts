import { mount } from '@vue/test-utils';
import ServiceListCard from 'src/components/assistant/ServiceListCard.vue';
import type { PresentedService } from 'src/api/assistant-api';

const contenedor = { template: '<div><slot /></div>' };
const quasar = {
  'q-card': contenedor,
  'q-card-section': contenedor,
  'q-list': contenedor,
  'q-item': {
    emits: ['click'],
    template: '<div class="q-item" @click="$emit(\'click\')"><slot /></div>',
  },
  'q-item-section': contenedor,
  'q-img': {
    props: ['src', 'srcset'],
    template: '<img :src="src" :srcset="srcset" />',
  },
};

const CLOUDINARY = 'https://res.cloudinary.com/demo/image/upload/v1/uno.jpg';

const SERVICIOS: PresentedService[] = [
  { id: 's1', nombre: 'Corte clásico', precio: 25000, minutos: 30 },
  {
    id: 's2',
    nombre: 'Uñas acrílicas',
    precio: 78000,
    minutos: 90,
    imagen: CLOUDINARY,
  },
];

function montar(servicios: PresentedService[] = SERVICIOS) {
  return mount(ServiceListCard, {
    props: { servicios },
    global: { components: quasar },
  });
}

describe('ServiceListCard', () => {
  it('pinta una fila por servicio con nombre, precio y duración', () => {
    const filas = montar().findAll('.service-list-card__row');

    expect(filas).toHaveLength(2);
    expect(filas[0].text()).toContain('Corte clásico');
    // Pesos colombianos, sin decimales: 25.000 con separador de miles.
    expect(filas[0].text()).toContain('25.000');
    expect(filas[0].text()).toContain('30 min');
    expect(filas[1].text()).toContain('1 h 30 min');
  });

  it('optimiza la imagen de Cloudinary para una miniatura, no la sirve cruda', () => {
    const img = montar().findAll('img')[1];

    // El panel mide 380 px como mucho: servir el original sería absurdo.
    expect(img.attributes('src')).toContain('/upload/f_auto,q_auto,w_');
    expect(img.attributes('srcset')).toContain(' 96w');
  });

  it('sin imagen no deja un hueco roto: usa el marcador de posición', () => {
    const img = montar([SERVICIOS[0]]).findAll('img')[0];

    expect(img.attributes('src')).toMatch(/^data:image\/svg\+xml/);
  });

  it('al tocar una fila devuelve el servicio para seguir la conversación', async () => {
    const w = montar();

    await w.findAll('.service-list-card__row')[1].trigger('click');

    expect(w.emitted('select')).toEqual([[SERVICIOS[1]]]);
  });
});
