/**
 * `bookingDialog.vue` queda como envoltorio delgado: lo importa
 * `MainLayout.vue` con `v-model:dialog="bookingStore.showDialog"`, y por ese
 * mismo `v-model` lo abren la cabecera, la barra fija de móvil y la ficha de
 * un servicio. Este contrato no cambia.
 */
jest.mock('src/components/reserva/CajonReserva.vue', () => ({
  __esModule: true,
  default: {
    name: 'CajonReserva',
    props: ['abierto'],
    emits: ['update:abierto'],
    template: '<div data-test="cajon-doble" />',
  },
}));

import { mount } from '@vue/test-utils';
import BookingDialog from 'src/components/dialogs/bookingDialog.vue';

describe('bookingDialog', () => {
  it('pasa su v-model:dialog al cajón', () => {
    const wrapper = mount(BookingDialog, { props: { dialog: true } });

    expect(
      wrapper.getComponent({ name: 'CajonReserva' }).props('abierto')
    ).toBe(true);
  });

  it('devuelve el cierre del cajón como update:dialog', () => {
    const wrapper = mount(BookingDialog, { props: { dialog: true } });

    wrapper
      .getComponent({ name: 'CajonReserva' })
      .vm.$emit('update:abierto', false);

    expect(wrapper.emitted('update:dialog')?.[0]).toEqual([false]);
  });
});
