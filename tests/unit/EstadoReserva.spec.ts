/**
 * La única pieza que pinta el estado de una reserva (M2). La usan la tarjeta y
 * la fila de «Mis reservas», y la usará la bandeja de la dueña (plan 3).
 *
 * Nunca solo por color: siempre texto + icono. El CSS está mockeado en Jest,
 * así que los colores se afirman leyendo la fuente.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { mount } from '@vue/test-utils';
import EstadoReserva from 'src/components/reservations/EstadoReserva.vue';
import StrokeIcon from 'src/components/shared/StrokeIcon.vue';
import type { ReservationStatus } from 'src/interfaces/booking';

const leer = (ruta: string) =>
  readFileSync(join(__dirname, '../../src', ruta), 'utf8');

const FUENTE = leer('components/reservations/EstadoReserva.vue');
const ESTILOS = FUENTE.slice(FUENTE.indexOf('<style'));

const ESTADOS: ReservationStatus[] = [
  'pendiente',
  'confirmada',
  'cumplida',
  'cancelada',
];

const TEXTOS: Record<ReservationStatus, string> = {
  pendiente: 'Pendiente',
  confirmada: 'Confirmada',
  cumplida: 'Cumplida',
  cancelada: 'Cancelada',
};

describe('EstadoReserva', () => {
  it.each(ESTADOS)('%s lleva su texto, su icono y su clase', (estado) => {
    const wrapper = mount(EstadoReserva, { props: { estado } });
    const raiz = wrapper.get('[data-test="estado-reserva"]');

    expect(raiz.text()).toBe(TEXTOS[estado]);
    expect(raiz.classes()).toContain(`estado--${estado}`);
    expect(raiz.attributes('data-estado')).toBe(estado);
    expect(raiz.findAll('path').length).toBeGreaterThan(0);
  });

  it('por defecto es una píldora; compacto la quita pero conserva texto e icono', () => {
    const pildora = mount(EstadoReserva, { props: { estado: 'confirmada' } });
    const compacto = mount(EstadoReserva, {
      props: { estado: 'confirmada', compacto: true },
    });

    expect(pildora.get('[data-test="estado-reserva"]').classes()).not.toContain(
      'estado--compacto'
    );
    const raiz = compacto.get('[data-test="estado-reserva"]');
    expect(raiz.classes()).toContain('estado--compacto');
    expect(raiz.text()).toBe('Confirmada');
    expect(raiz.findAll('path').length).toBeGreaterThan(0);
  });

  it.each([
    'reloj',
    'check',
    'cumplida',
    'cancelada',
    'actualizar',
    'alerta',
    'cerrar',
    'chevron-abajo',
  ])('StrokeIcon dibuja «%s»', (nombre) => {
    const icono = mount(StrokeIcon, { props: { nombre } });

    expect(icono.findAll('path').length).toBeGreaterThan(0);
  });

  it('los colores de cada estado salen de tokens (M2)', () => {
    expect(ESTILOS).toMatch(
      /\.estado--pendiente\s*\{[^}]*border-color: var\(--m-oro-profundo\);[^}]*color: var\(--m-oro-profundo\);/
    );
    expect(ESTILOS).toMatch(
      /\.estado--confirmada\s*\{[^}]*background: var\(--m-tinta\);[^}]*color: var\(--m-hueso\);/
    );
    expect(ESTILOS).toMatch(
      /\.estado--cumplida\s*\{[^}]*color: var\(--m-piedra\);/
    );
    expect(ESTILOS).toMatch(
      /\.estado--cancelada\s*\{[^}]*border-color: var\(--m-peligro\);[^}]*color: var\(--m-peligro\);/
    );
    expect(ESTILOS.match(/#[0-9a-fA-F]{3,8}\b/g)).toBeNull();
  });

  it('compacta y confirmada no deja texto hueso sobre fondo claro', () => {
    expect(ESTILOS).toMatch(
      /\.estado--compacto\.estado--confirmada\s*\{[^}]*color: var\(--m-tinta\);/
    );
  });

  it('el puente de la bandeja ya no lee un color de Quasar', () => {
    const admin = leer('pages/AdminReservationsPage.vue');

    expect(admin).not.toMatch(/reservationStatusMeta/);
    expect(admin).not.toMatch(/statusMeta\(res\)\.color/);
  });
});
