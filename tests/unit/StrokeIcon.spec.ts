/**
 * Los iconos de trazo del portal. Existen porque el proyecto solo carga la
 * variante RELLENA de Material y no la de contorno: los de Material desentonan
 * con el resto, que es todo trazo fino, y añadir otro set serían kilobytes de
 * más para NF02.
 */
import { mount } from '@vue/test-utils';
import StrokeIcon from 'src/components/shared/StrokeIcon.vue';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const LAYOUT = readFileSync(
  join(__dirname, '../../src/layouts/MainLayout.vue'),
  'utf8'
);

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

  /** Cada icono que pide el menú de «Más» tiene que existir de verdad. */
  it('cubre todos los iconos que el menú de «Más» nombra', () => {
    const pedidos = [...LAYOUT.matchAll(/^\s+icon: '([a-z-]+)',$/gm)].map(
      (m) => m[1]
    );

    expect(pedidos.length).toBeGreaterThanOrEqual(10);
    for (const nombre of pedidos) {
      expect(montar(nombre).findAll('path').length).toBeGreaterThan(0);
    }
  });

  /** La ficha del servicio marca con una elipse la línea de los rostros. */
  it('trae la elipse de rostro que usa la ficha del servicio', () => {
    const trazos = montar('rostro').findAll('path');

    expect(trazos).toHaveLength(1);
    expect(trazos[0].attributes('d')).toContain('a6.4 8.6');
  });
});
