/**
 * A3/A4: la ficha de una reserva. Panel claro a la derecha en escritorio;
 * pantalla completa con «← Reservas» y acciones fijas abajo en móvil.
 */
import { mount } from '@vue/test-utils';
import DetalleReserva from 'src/components/admin-reservas/DetalleReserva.vue';
import type { AccionBandeja } from 'src/helpers/acciones-bandeja';
import type { ReservationDto } from 'src/interfaces/booking';
import { reserva } from './fixtures/bandeja';

type Props = {
  reserva: ReservationDto;
  variante: 'panel' | 'pantalla';
  ocupada: AccionBandeja | null;
  error: string | null;
};

const montar = (props: Partial<Props> = {}) =>
  mount(DetalleReserva, { props: { reserva: reserva(), ...props } });

const texto = (w: ReturnType<typeof montar>, gancho: string) =>
  w.find(`[data-test="${gancho}"]`).text().replace(/\s+/g, ' ').trim();

describe('DetalleReserva', () => {
  it('presenta a la clienta con su teléfono y si tiene cuenta', () => {
    const w = montar();

    expect(texto(w, 'detalle-nombre')).toBe('Andrea Ruiz');
    expect(texto(w, 'detalle-contacto')).toBe(
      '3001234567 · sin cuenta en el portal'
    );
  });

  it('con sesión y sin contacto, lo dice en vez de dejarlo en blanco', () => {
    const w = montar({ reserva: reserva({ userId: 'u-9', contact: null }) });

    expect(texto(w, 'detalle-nombre')).toBe('Clienta con cuenta');
    expect(texto(w, 'detalle-contacto')).toBe('con cuenta en el portal');
  });

  it('día, franja y duración en hora del salón', () => {
    const w = montar();

    expect(texto(w, 'detalle-dia')).toBe('Jueves 8 de octubre');
    expect(texto(w, 'detalle-hora')).toContain('10:30 a 11:30');
    expect(texto(w, 'detalle-duracion')).toBe('1 h');
  });

  it('dice quién eligió a la estilista (A4)', () => {
    expect(texto(montar(), 'detalle-asignacion')).toBe('La eligió la clienta');
    expect(
      texto(
        montar({ reserva: reserva({ workerPinned: false }) }),
        'detalle-asignacion'
      )
    ).toBe('La asignó el sistema');
    expect(texto(montar(), 'detalle-estilista')).toContain('Monica');
  });

  it('lista los servicios con su precio y el total', () => {
    const w = montar();
    const servicios = w.findAll('[data-test="detalle-servicio"]');

    expect(servicios).toHaveLength(2);
    expect(servicios[0].text().replace(/\s+/g, ' ')).toBe(
      'Wolf cut mujer $ 37.000'
    );
    expect(texto(w, 'detalle-total')).toBe('$ 85.000');
  });

  it('muestra el estado con la pieza de Mis reservas', () => {
    expect(montar().find('[data-test="estado-reserva"]').exists()).toBe(true);
  });

  it('una pendiente ofrece Confirmar, Mover y Cancelar, y cada uno avisa con el id', async () => {
    const w = montar();

    await w.find('[data-test="confirmar-detalle"]').trigger('click');
    await w.find('[data-test="mover"]').trigger('click');
    await w.find('[data-test="cancelar-detalle"]').trigger('click');

    expect(w.emitted('confirmar')).toEqual([['res-1']]);
    expect(w.emitted('mover')).toEqual([['res-1']]);
    expect(w.emitted('cancelar')).toEqual([['res-1']]);
  });

  it('una confirmada no ofrece Confirmar', () => {
    const w = montar({ reserva: reserva({ status: 'confirmada' }) });

    expect(w.find('[data-test="confirmar-detalle"]').exists()).toBe(false);
    expect(w.find('[data-test="mover"]').exists()).toBe(true);
    expect(w.find('[data-test="cancelar-detalle"]').exists()).toBe(true);
  });

  it('mientras una acción está en curso, no se pulsa nada dos veces', () => {
    const w = montar({ ocupada: 'confirmar' });

    for (const gancho of ['confirmar-detalle', 'mover', 'cancelar-detalle']) {
      expect(
        w.find(`[data-test="${gancho}"]`).attributes('disabled')
      ).toBeDefined();
    }
    expect(texto(w, 'confirmar-detalle')).toBe('Confirmando…');
  });

  it('un error se lee en el panel', () => {
    const error = montar({ error: 'No se pudo confirmar.' }).find(
      '[data-test="error-detalle"]'
    );

    expect(error.attributes('role')).toBe('alert');
    expect(error.text()).toBe('No se pudo confirmar.');
  });

  it('avisa de que la clienta recibe el aviso por WhatsApp', () => {
    expect(texto(montar(), 'nota-avisos')).toBe(
      'Al confirmar, al mover o al cancelar, la clienta recibe el aviso por WhatsApp si dejó su teléfono.'
    );
  });

  it('en pantalla completa trae «← Reservas» y vuelve a la lista', async () => {
    const w = montar({ variante: 'pantalla' });

    expect(w.find('[data-test="detalle-antetitulo"]').exists()).toBe(false);
    expect(w.find('[data-test="volver-a-la-lista"]').classes()).toContain(
      'm-boton-plano'
    );
    await w.find('[data-test="volver-a-la-lista"]').trigger('click');
    expect(w.emitted('volver')).toHaveLength(1);
  });

  it('en el panel lateral no hay «volver»', () => {
    const w = montar({ variante: 'panel' });

    expect(w.find('[data-test="volver-a-la-lista"]').exists()).toBe(false);
    expect(texto(w, 'detalle-antetitulo')).toBe('Reserva');
  });
});
