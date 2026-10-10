/**
 * Los iconos de trazo del portal. Existen porque el proyecto solo carga la
 * variante RELLENA de Material y no la de contorno: los de Material desentonan
 * con el resto, que es todo trazo fino, y añadir otro set serían kilobytes de
 * más para NF02.
 */
import { mount } from '@vue/test-utils';
import StrokeIcon from 'src/components/shared/StrokeIcon.vue';
import { seccionesDelMenu } from 'src/composables/shared/menuMas';

const montar = (nombre: string) => mount(StrokeIcon, { props: { nombre } });

describe('StrokeIcon', () => {
  it('hereda el color de quien lo coloca, en vez de traer el suyo', () => {
    const svg = montar('horario').get('svg');

    expect(svg.attributes('stroke')).toBe('currentColor');
    expect(svg.attributes('fill')).toBe('none');
  });

  it('se esconde del lector de pantalla: el rótulo va al lado', () => {
    const svg = montar('horario').get('svg');

    expect(svg.attributes('aria-hidden')).toBe('true');
    expect(svg.attributes('focusable')).toBe('false');
  });

  it('dibuja trazos, no texto ni relleno', () => {
    const trazos = montar('reservas').findAll('path');

    expect(trazos.length).toBeGreaterThan(1);
    expect(trazos[0].attributes('d')).toBeTruthy();
  });

  /**
   * Una errata en el nombre no puede tumbar la fila entera del menú: mejor una
   * fila sin icono que un menú sin fila.
   */
  it('un nombre desconocido no pinta nada, y no revienta', () => {
    const wrapper = montar('no-existe');

    expect(wrapper.find('svg').exists()).toBe(true);
    expect(wrapper.findAll('path')).toHaveLength(0);
  });

  /**
   * Cada icono que pide el menú de «Más» tiene que existir de verdad. Antes se
   * leían las líneas `icon: '…'` de `MainLayout.vue`; desde la carta por
   * secciones las entradas viven en `menuMas.ts`, y se recorren los tres
   * estados de sesión para no dejarse los iconos de la dueña.
   */
  it('cubre todos los iconos que el menú de «Más» nombra, en los tres estados', () => {
    const estados = [
      { isLoggedIn: false, isAdmin: false },
      { isLoggedIn: true, isAdmin: false },
      { isLoggedIn: true, isAdmin: true },
    ];
    const pedidos: string[] = [];
    for (const estado of estados) {
      for (const seccion of seccionesDelMenu({ ...estado, redirect: '/' })) {
        for (const entrada of seccion.entradas) pedidos.push(entrada.icono);
      }
    }

    expect(pedidos.length).toBeGreaterThanOrEqual(20);
    for (const nombre of pedidos) {
      expect(montar(nombre).findAll('path').length).toBeGreaterThan(0);
    }
  });

  /** M6: por debajo de 700 px «Más» es una hamburguesa (tablero móvil). */
  it('trae la hamburguesa del disparador de «Más» en móvil', () => {
    const trazos = montar('menu').findAll('path');

    expect(trazos).toHaveLength(1);
    expect(trazos[0].attributes('d')).toBe('M4 7h16M4 12h16M4 17h16');
  });

  /** La ficha del servicio marca con una elipse la línea de los rostros. */
  it('trae la elipse de rostro que usa la ficha del servicio', () => {
    const trazos = montar('rostro').findAll('path');

    expect(trazos).toHaveLength(1);
    expect(trazos[0].attributes('d')).toContain('a6.4 8.6');
  });
});

describe('StrokeIcon · la bandeja de reservas (plan 3)', () => {
  const montarIcono = (nombre: string) => mount(StrokeIcon, { props: { nombre } });

  it('trae mover y cita cancelada', () => {
    for (const nombre of ['mover-cita', 'cita-cancelada']) {
      expect(montarIcono(nombre).findAll('path').length).toBeGreaterThan(0);
    }
  });
});
