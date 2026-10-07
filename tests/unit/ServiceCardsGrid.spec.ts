/**
 * La rejilla decide qué ve la clienta: las tarjetas, el esqueleto, el vacío o el
 * error. La prueba que más vale es la del parpadeo: con `placeholderData:
 * previousData`, al cambiar de página las filas anteriores siguen puestas, y si
 * se tratara `isFetching` como «cargando» la lista entera se cambiaría por cajas
 * grises en cada página (§6.3).
 */
import { h, nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type Service from 'src/interfaces/service';
import ServiceCardsGrid from 'src/components/servicePage/ServiceCardsGrid.vue';
import { servicio } from './fixtures/servicios';

const FUENTE = readFileSync(
  join(__dirname, '../../src/components/servicePage/ServiceCardsGrid.vue'),
  'utf8'
);
const ESTILOS = FUENTE.slice(FUENTE.indexOf('<style'));

const DOS = [
  servicio(),
  servicio({ id: 's2', name: 'Pixie cut', price: 35000 }),
];

type Props = {
  servicios?: Service[];
  columnas?: 1 | 2 | 3;
  cargando?: boolean;
  error?: boolean;
  hayFiltros?: boolean;
  recargando?: boolean;
  renglones?: boolean;
};

const montar = (props: Props = {}, slots = {}) =>
  mount(ServiceCardsGrid, {
    props: {
      servicios: DOS,
      columnas: 3,
      cargando: false,
      error: false,
      hayFiltros: false,
      ...props,
    },
    slots,
  });

/** El velo fijo depende de `(hover: none)`: por omisión, ratón. */
function conPuntero(grueso: boolean) {
  window.matchMedia = ((consulta: string) => ({
    matches: consulta.includes('hover: none') ? grueso : false,
    media: consulta,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  })) as unknown as typeof window.matchMedia;
}

const matchMediaOriginal = window.matchMedia;
beforeEach(() => conPuntero(false));
afterEach(() => {
  window.matchMedia = matchMediaOriginal;
});

describe('ServiceCardsGrid', () => {
  it('pinta una tarjeta por servicio', () => {
    const rejilla = montar();

    expect(rejilla.find('[data-test="rejilla"]').exists()).toBe(true);
    expect(rejilla.findAll('[data-test="tarjeta"]')).toHaveLength(2);
    expect(rejilla.text()).toContain('Pixie cut');
  });

  it('con una sola columna y renglones pinta renglones, no tarjetas', () => {
    const rejilla = montar({ columnas: 1, renglones: true });

    expect(rejilla.findAll('[data-test="fila"]')).toHaveLength(2);
    expect(rejilla.find('[data-test="tarjeta"]').exists()).toBe(false);
  });

  it('con una columna y sin renglones pinta tarjetas', () => {
    const rejilla = montar({ columnas: 1 });

    expect(rejilla.findAll('[data-test="tarjeta"]')).toHaveLength(2);
    expect(rejilla.find('[data-test="fila"]').exists()).toBe(false);
  });

  it('el número de columnas viaja al CSS, no a tres clases distintas', () => {
    // El valor va en una propiedad personalizada, que es lo que lee la rejilla
    // en su SCSS. jsdom no serializa de forma fiable las propiedades
    // personalizadas en el atributo `style`, así que ese extremo se comprueba en
    // la fuente; lo que sí se puede ver montando es el cambio de modo a una
    // columna.
    expect(FUENTE).toContain("'--columnas': String(columnas)");
    expect(FUENTE).toContain(
      'grid-template-columns: repeat(var(--columnas, 3)'
    );
    expect(
      montar({ columnas: 1 }).get('[data-test="rejilla"]').classes()
    ).toContain('rejilla-servicios__lista--una');
  });

  it('avisa del detalle con el id que le da la tarjeta', async () => {
    const rejilla = montar();

    await rejilla.findAll('[data-test="tarjeta-enlace"]')[1].trigger('click');

    expect(rejilla.emitted('detalle')?.[0]).toEqual(['s2']);
  });

  it('en la primera carga pinta el esqueleto', () => {
    const rejilla = montar({ servicios: [], cargando: true });

    expect(rejilla.find('[data-test="esqueleto"]').exists()).toBe(true);
    expect(rejilla.find('[data-test="rejilla"]').exists()).toBe(false);
    expect(rejilla.find('[data-test="vacio"]').exists()).toBe(false);
  });

  /**
   * El caso del parpadeo: página nueva pedida, filas anteriores en pantalla.
   * Esqueleto NO; aviso discreto SÍ.
   */
  it('al cambiar de página con datos previos no vuelve al esqueleto', () => {
    const rejilla = montar({ cargando: false, recargando: true });

    expect(rejilla.find('[data-test="esqueleto"]').exists()).toBe(false);
    expect(rejilla.findAll('[data-test="tarjeta"]')).toHaveLength(2);
    expect(rejilla.get('[data-test="rejilla"]').attributes('aria-busy')).toBe(
      'true'
    );
    expect(rejilla.find('[data-test="recarga"]').exists()).toBe(true);
  });

  it('sin recarga no deja puesto el aviso ni el aria-busy', () => {
    const rejilla = montar();

    expect(rejilla.find('[data-test="recarga"]').exists()).toBe(false);
    expect(
      rejilla.get('[data-test="rejilla"]').attributes('aria-busy')
    ).toBeUndefined();
  });

  it('sin resultados y con filtros ofrece limpiarlos', async () => {
    const rejilla = montar({ servicios: [], hayFiltros: true });

    expect(rejilla.get('[data-test="vacio"]').text()).toContain('filtros');
    await rejilla.get('[data-test="limpiar-filtros"]').trigger('click');

    expect(rejilla.emitted('limpiar-filtros')).toHaveLength(1);
  });

  it('sin resultados y sin filtros dice otra cosa y no ofrece limpiar nada', () => {
    const rejilla = montar({ servicios: [], hayFiltros: false });

    expect(rejilla.get('[data-test="vacio"]').text()).toContain(
      'Todavía no hay servicios'
    );
    expect(rejilla.find('[data-test="limpiar-filtros"]').exists()).toBe(false);
  });

  it('no pinta una rejilla vacía cuando no hay nada que poner', () => {
    expect(
      montar({ servicios: [] }).find('[data-test="rejilla"]').exists()
    ).toBe(false);
  });

  it('con un fallo de red y sin filas pinta el error y reintenta', async () => {
    const rejilla = montar({ servicios: [], error: true });

    expect(rejilla.find('[data-test="error"]').exists()).toBe(true);
    expect(rejilla.find('[data-test="esqueleto"]').exists()).toBe(false);
    expect(rejilla.find('[data-test="vacio"]').exists()).toBe(false);
    await rejilla.get('[data-test="reintentar"]').trigger('click');

    expect(rejilla.emitted('reintentar')).toHaveLength(1);
  });

  it('el error manda sobre el esqueleto: no se pintan los dos', () => {
    const rejilla = montar({ servicios: [], cargando: true, error: true });

    expect(rejilla.find('[data-test="error"]').exists()).toBe(true);
    expect(rejilla.find('[data-test="esqueleto"]').exists()).toBe(false);
  });

  /**
   * Punto 5 del enfoque de revisión. Un fallo al pasar de página no puede
   * llevarse por delante lo que la clienta ya tenía delante.
   */
  it('con un fallo de red y filas en pantalla avisa sin llevarse la lista', () => {
    const rejilla = montar({ error: true });

    expect(rejilla.get('[data-test="error"]').classes()).toContain(
      'error-lista--compacto'
    );
    expect(rejilla.findAll('[data-test="tarjeta"]')).toHaveLength(2);
  });

  it('la ranura de acciones llega a cada tarjeta con su servicio', () => {
    // Ranura de función, no una cadena con `<template #acciones="…">`: así la
    // prueba no depende de cómo compila `@vue/test-utils` las ranuras con
    // ámbito, y queda escrito qué recibirá la fase E.
    const rejilla = montar(
      {},
      {
        acciones: (params: { servicio: Service }) =>
          h(
            'button',
            { 'data-test': `editar-${params.servicio.id}` },
            'Editar'
          ),
      }
    );

    expect(rejilla.findAll('[data-test="acciones"]')).toHaveLength(2);
    expect(rejilla.find('[data-test="editar-s1"]').exists()).toBe(true);
    expect(rejilla.find('[data-test="editar-s2"]').exists()).toBe(true);
  });

  it('la ranura de acciones dice si va en un renglón (compacto) o en una tarjeta', () => {
    const acciones = (params: { servicio: Service; compacto: boolean }) =>
      h(
        'button',
        { 'data-test': `modo-${params.servicio.id}` },
        String(params.compacto)
      );

    const enTarjetas = montar({}, { acciones });
    expect(enTarjetas.get('[data-test="modo-s1"]').text()).toBe('false');

    const enRenglones = montar({ columnas: 1, renglones: true }, { acciones });
    expect(enRenglones.get('[data-test="modo-s1"]').text()).toBe('true');
  });

  /**
   * Antes el esqueleto seguía a `columnas`/`renglones` con clases y estilos, y
   * eso rompía con SSG: `/services` se prerenderiza a 1280 px y en el teléfono
   * la hidratación no repara clases, así que se quedaba en tres columnas. Ahora
   * su forma es CSS con los mismos cortes de D9 (lo vigila
   * `ServiceListStates.spec.ts`, incluido que entre 501 y 759 px es una columna
   * de tarjetas y no de renglones): el marcado tiene que ser el mismo a
   * cualquier ancho.
   */
  it('el esqueleto pinta el mismo marcado a cualquier ancho: su forma es del CSS', () => {
    const ancho = montar({ servicios: [], cargando: true, columnas: 3 })
      .get('[data-test="esqueleto"]')
      .html();
    const tarjetasEnUna = montar({ servicios: [], cargando: true, columnas: 1 })
      .get('[data-test="esqueleto"]')
      .html();
    const renglones = montar({
      servicios: [],
      cargando: true,
      columnas: 1,
      renglones: true,
    })
      .get('[data-test="esqueleto"]')
      .html();

    expect(tarjetasEnUna).toBe(ancho);
    expect(renglones).toBe(ancho);
    expect(FUENTE).not.toMatch(/<ServiceListSkeleton[^>]*:(columnas|renglones)/);
  });

  /**
   * Punto 4 del enfoque de revisión. El código viejo ya se protegía con
   * `:key="${index}_${service.id}"`: el API puede devolver el mismo id dos veces
   * y una clave repetida colapsa las dos filas en una.
   */
  it('dos servicios con el mismo id no colapsan en uno', () => {
    const rejilla = montar({ servicios: [servicio(), servicio()] });

    expect(rejilla.findAll('[data-test="tarjeta"]')).toHaveLength(2);
  });

  it('en una pantalla táctil las tarjetas muestran su información sin hover', async () => {
    conPuntero(true);

    const rejilla = montar();
    // `useCoarsePointer` consulta `matchMedia` al montar: hace falta un repintado.
    await nextTick();

    expect(rejilla.get('[data-test="velo"]').classes()).toContain(
      'tarjeta-servicio__velo--fijo'
    );
  });

  it('no pinta con hexadecimales sueltos', () => {
    expect(ESTILOS).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});
