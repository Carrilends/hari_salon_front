/**
 * Una fila de la bandeja (A2): hora, clienta, servicios, estilista, estado
 * (icono + palabra) y «Confirmar» directo si está pendiente. Sobre tinta.
 */
import { mount } from '@vue/test-utils';
import FilaReserva from 'src/components/admin-reservas/FilaReserva.vue';
import type { ReservationDto } from 'src/interfaces/booking';
import { reserva } from './fixtures/bandeja';

type Props = {
  reserva: ReservationDto;
  seleccionada: boolean;
  nueva: boolean;
  compacta: boolean;
  confirmando: boolean;
  bloqueada: boolean;
  error: string | null;
};

const montar = (props: Partial<Props> = {}) =>
  mount(FilaReserva, { props: { reserva: reserva(), ...props } });

describe('FilaReserva', () => {
  it('pinta hora, duración, clienta, servicios y estilista', () => {
    const fila = montar();

    expect(fila.find('[data-test="fila-hora"]').text()).toBe('10:30');
    expect(fila.text()).toContain('1 h');
    expect(fila.find('[data-test="fila-nombre"]').text()).toBe('Andrea Ruiz');
    expect(fila.find('[data-test="fila-servicios"]').text()).toBe(
      'Wolf cut mujer + Uñas de gel'
    );
    expect(fila.find('[data-test="fila-estilista"]').text()).toBe('con Monica');
  });

  it('dice cuándo la estilista la asignó el sistema (A4), salvo en compacta', () => {
    const repartida = reserva({ workerPinned: false });

    expect(
      montar({ reserva: repartida }).find('[data-test="fila-estilista"]').text()
    ).toBe('con Monica · la asignó el sistema');
    expect(
      montar({ reserva: repartida, compacta: true })
        .find('[data-test="fila-estilista"]')
        .text()
    ).toBe('con Monica');
  });

  it('el estado lleva palabra e icono, nunca solo color', () => {
    const estado = montar().find('[data-test="estado-fila"]');

    expect(estado.text()).toBe('Pendiente');
    expect(estado.findAll('path').length).toBeGreaterThan(0);
    expect(estado.classes()).toContain('estado--pendiente');
  });

  it('«Confirmar» solo en pendientes y solo en la fila ancha', () => {
    expect(montar().find('[data-test="confirmar-fila"]').exists()).toBe(true);
    expect(
      montar({ reserva: reserva({ status: 'confirmada' }) })
        .find('[data-test="confirmar-fila"]')
        .exists()
    ).toBe(false);
    expect(
      montar({ compacta: true }).find('[data-test="confirmar-fila"]').exists()
    ).toBe(false);
  });

  it('«Confirmar» nombra a la clienta para el lector de pantalla', () => {
    expect(
      montar().find('[data-test="confirmar-fila"]').attributes('aria-label')
    ).toBe('Confirmar la reserva de Andrea Ruiz');
  });

  it('abrir y confirmar avisan con el id', async () => {
    const fila = montar();

    await fila.find('[data-test="abrir-reserva"]').trigger('click');
    await fila.find('[data-test="confirmar-fila"]').trigger('click');

    expect(fila.emitted('abrir')).toEqual([['res-1']]);
    expect(fila.emitted('confirmar')).toEqual([['res-1']]);
  });

  it('mientras confirma, el botón se apaga y lo dice', () => {
    const boton = montar({ confirmando: true }).find(
      '[data-test="confirmar-fila"]'
    );

    expect(boton.attributes('disabled')).toBeDefined();
    expect(boton.text()).toBe('Confirmando…');
  });

  it('bloqueada por la acción de otra reserva, se apaga sin decir que confirma', () => {
    const boton = montar({ bloqueada: true }).find(
      '[data-test="confirmar-fila"]'
    );

    expect(boton.attributes('disabled')).toBeDefined();
    expect(boton.text()).toBe('Confirmar');
  });

  it('una reserva recién llegada lleva la etiqueta «Nueva»', () => {
    expect(montar().find('[data-test="etiqueta-nueva"]').exists()).toBe(false);
    expect(
      montar({ nueva: true }).find('[data-test="etiqueta-nueva"]').text()
    ).toBe('Nueva');
  });

  it('la elegida lo dice con aria-current, no solo con el filete', () => {
    const fila = montar({ seleccionada: true });

    expect(
      fila.find('[data-test="abrir-reserva"]').attributes('aria-current')
    ).toBe('true');
    expect(fila.find('[data-test="fila-reserva"]').classes()).toContain(
      'fila--seleccionada'
    );
  });

  it('un error de la acción se lee en la fila, sin anunciarse dos veces', () => {
    const error = montar({
      error: 'Esta reserva ya no estaba pendiente.',
    }).find('[data-test="error-fila"]');

    // Lo anuncia una sola voz: la línea viva de la página (`aviso-accion`),
    // que es la que sobrevive al refresco.
    expect(error.attributes('role')).toBeUndefined();
    expect(error.attributes('aria-live')).toBeUndefined();
    expect(error.text()).toBe('Esta reserva ya no estaba pendiente.');
  });

  it('el nombre accesible no pega la clienta con «Nueva»', () => {
    const texto = montar({ nueva: true })
      .find('[data-test="abrir-reserva"]')
      .text();

    expect(texto).toContain('Andrea Ruiz Nueva');
    expect(texto).not.toContain('Andrea RuizNueva');
  });

  it('el botón de abrir es de texto plano (sin caja de realce)', () => {
    expect(montar().find('[data-test="abrir-reserva"]').classes()).toContain(
      'm-boton-plano'
    );
  });

  it('marca su id para encontrarla en la lista', () => {
    expect(
      montar().find('[data-test="fila-reserva"]').attributes('data-id')
    ).toBe('res-1');
  });
});
