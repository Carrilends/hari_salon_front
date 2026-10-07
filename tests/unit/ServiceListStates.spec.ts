/**
 * Los tres estados que la página no tenía: cargando, sin resultados y error de
 * red. Hasta hoy una búsqueda sin resultados dejaba un hueco en blanco y un
 * fallo de red no se distinguía de un catálogo vacío.
 */
import { mount } from '@vue/test-utils';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import ServiceListSkeleton from 'src/components/servicePage/ServiceListSkeleton.vue';
import ServiceListEmpty from 'src/components/servicePage/ServiceListEmpty.vue';
import ServiceListError from 'src/components/servicePage/ServiceListError.vue';

const fuente = (archivo: string) =>
  readFileSync(
    join(__dirname, `../../src/components/servicePage/${archivo}`),
    'utf8'
  );

describe('ServiceListSkeleton', () => {
  it('pinta seis huecos en la rejilla de tres columnas', () => {
    const esqueleto = mount(ServiceListSkeleton, { props: { columnas: 3 } });

    expect(esqueleto.get('[data-test="esqueleto"]').exists()).toBe(true);
    expect(esqueleto.findAll('[data-test="hueco"]')).toHaveLength(6);
  });

  it('en una columna pinta cuatro renglones', () => {
    const esqueleto = mount(ServiceListSkeleton, { props: { columnas: 1 } });

    expect(esqueleto.findAll('[data-test="hueco"]')).toHaveLength(4);
  });

  /** Un lector de pantalla tiene que oír que algo está cargando, no seis cajas. */
  it('se anuncia como estado y no lee los huecos', () => {
    const esqueleto = mount(ServiceListSkeleton, { props: { columnas: 3 } });
    const raiz = esqueleto.get('[data-test="esqueleto"]');

    expect(raiz.attributes('role')).toBe('status');
    expect(raiz.attributes('aria-label')).toMatch(/cargando/i);
    expect(esqueleto.get('[data-test="hueco"]').attributes('aria-hidden')).toBe(
      'true'
    );
  });

  it('el latido respeta a quien pidió menos movimiento', () => {
    expect(fuente('ServiceListSkeleton.vue')).toMatch(
      /@media \(prefers-reduced-motion: reduce\) \{[^}]*animation: none/
    );
  });
});

describe('ServiceListEmpty', () => {
  it('con filtros puestos dice que son ellos y ofrece limpiarlos', async () => {
    const vacio = mount(ServiceListEmpty, { props: { hayFiltros: true } });

    expect(vacio.get('[data-test="vacio"]').text()).toContain('filtros');
    await vacio.get('[data-test="limpiar-filtros"]').trigger('click');

    expect(vacio.emitted('limpiar-filtros')).toHaveLength(1);
  });

  it('sin filtros no ofrece limpiar nada, y dice otra cosa', () => {
    const vacio = mount(ServiceListEmpty, { props: { hayFiltros: false } });

    expect(vacio.find('[data-test="limpiar-filtros"]').exists()).toBe(false);
    expect(vacio.get('[data-test="vacio"]').text()).toContain(
      'Todavía no hay servicios'
    );
  });

  it('lo que se pulsa es un botón de verdad', () => {
    const boton = mount(ServiceListEmpty, { props: { hayFiltros: true } }).get(
      '[data-test="limpiar-filtros"]'
    );

    expect(boton.element.tagName).toBe('BUTTON');
    expect(boton.attributes('type')).toBe('button');
  });
});

describe('ServiceListError', () => {
  it('dice que falló la carga y ofrece reintentar', async () => {
    const error = mount(ServiceListError);

    expect(error.get('[data-test="error"]').text()).toMatch(
      /no pudimos cargar/i
    );
    await error.get('[data-test="reintentar"]').trigger('click');

    expect(error.emitted('reintentar')).toHaveLength(1);
  });

  it('se anuncia como alerta', () => {
    expect(
      mount(ServiceListError).get('[data-test="error"]').attributes('role')
    ).toBe('alert');
  });

  it('en versión compacta sigue ofreciendo reintentar', () => {
    const error = mount(ServiceListError, { props: { compacto: true } });

    expect(error.get('[data-test="error"]').classes()).toContain(
      'error-lista--compacto'
    );
    expect(error.get('[data-test="reintentar"]').exists()).toBe(true);
  });
});

describe('los tres estados', () => {
  it('no pintan con hexadecimales sueltos', () => {
    for (const archivo of [
      'ServiceListSkeleton.vue',
      'ServiceListEmpty.vue',
      'ServiceListError.vue',
    ]) {
      const texto = fuente(archivo);
      const estilos = texto.slice(texto.indexOf('<style'));

      expect(estilos).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    }
  });
});
