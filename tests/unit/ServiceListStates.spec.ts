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
  /**
   * `/services` se prerenderiza a 1280 px (`ANCHO_SSG`) y en un teléfono el
   * primer render del cliente mide 390: si la forma del esqueleto saliera de
   * clases o estilos atados a ese ancho, la hidratación no los repara y el
   * esqueleto se quedaba en tres columnas en el móvil. La forma la decide el
   * CSS con los cortes de D9; el marcado es el mismo para cualquier ancho.
   */
  const ESTILOS = fuente('ServiceListSkeleton.vue').slice(
    fuente('ServiceListSkeleton.vue').indexOf('<style')
  );
  const PLANTILLA = fuente('ServiceListSkeleton.vue').slice(
    0,
    fuente('ServiceListSkeleton.vue').indexOf('<script')
  );

  it('pinta siempre seis huecos, los de la rejilla de tres columnas', () => {
    const esqueleto = mount(ServiceListSkeleton);

    expect(esqueleto.find('[data-test="esqueleto"]').exists()).toBe(true);
    expect(esqueleto.findAll('[data-test="hueco"]')).toHaveLength(6);
  });

  it('no ata clases ni estilos al ancho medido en JavaScript', () => {
    const raiz = mount(ServiceListSkeleton).get('[data-test="esqueleto"]');

    expect(PLANTILLA).not.toMatch(/:class|:style|v-bind:class|v-bind:style/);
    expect(raiz.attributes('style')).toBeUndefined();
    expect(raiz.classes()).toEqual(['esqueleto-servicios']);
  });

  it('desde 1240 px: tres columnas y los seis huecos', () => {
    expect(ESTILOS).toMatch(
      /\.esqueleto-servicios \{[^}]*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/
    );
  });

  it('entre 760 y 1239 px: dos columnas y cuatro huecos (dos filas)', () => {
    expect(ESTILOS).toMatch(
      /@media \(max-width: 1239px\) \{[^@]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)[^@]*__hueco:nth-child\(n \+ 5\) \{\s*display: none;/
    );
  });

  it('entre 501 y 759 px: una columna de tarjetas, no de renglones, y dos huecos', () => {
    const tramo = ESTILOS.slice(ESTILOS.indexOf('@media (max-width: 759px)'));
    const bloque = tramo.slice(0, tramo.indexOf('@media', 1));

    expect(bloque).toMatch(/grid-template-columns:\s*minmax\(0, 1fr\)/);
    expect(bloque).toMatch(/__hueco:nth-child\(n \+ 3\) \{\s*display: none;/);
    // La forma de renglón (104 px) es solo de la franja estrecha.
    expect(bloque).not.toContain('104px');
  });

  it('por debajo de 501 px: cuatro renglones de 104 px', () => {
    const tramo = ESTILOS.slice(ESTILOS.indexOf('@media (max-width: 500px)'));
    const bloque = tramo.slice(0, tramo.indexOf('@media', 1));

    expect(bloque).toMatch(/__hueco \{\s*height: 104px;/);
    expect(bloque).toMatch(/__hueco:nth-child\(n \+ 3\) \{\s*display: block;/);
    expect(bloque).toMatch(/__hueco:nth-child\(n \+ 5\) \{\s*display: none;/);
  });

  /** Un lector de pantalla tiene que oír que algo está cargando, no seis cajas. */
  it('se anuncia como estado y no lee los huecos', () => {
    const esqueleto = mount(ServiceListSkeleton);
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
    expect(error.find('[data-test="reintentar"]').exists()).toBe(true);
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
