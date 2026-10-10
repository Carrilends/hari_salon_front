import { mount } from '@vue/test-utils';
import BarraCarga from 'src/components/estilistas/BarraCarga.vue';

type Props = InstanceType<typeof BarraCarga>['$props'];

const montar = (props: Record<string, unknown>) =>
  mount(BarraCarga, { props: props as unknown as Props });

describe('BarraCarga', () => {
  it('llena la barra según las horas reservadas sobre el horario', () => {
    const barra = montar({ usados: 180, capacidad: 720 });

    expect(
      barra.get('[data-test="barra-relleno"]').attributes('style')
    ).toContain('height: 25%');
  });

  it('en la tabla es una imagen con su texto, para el lector de pantalla', () => {
    const raiz = montar({ usados: 180, capacidad: 720 }).get(
      '[data-test="barra-carga"]'
    );

    expect(raiz.attributes('role')).toBe('img');
    expect(raiz.attributes('aria-label')).toBe('3 h reservadas de 12 h');
    expect(raiz.attributes('title')).toBe('3 h reservadas de 12 h');
  });

  it('un día sin citas tiene la barra vacía y lo dice', () => {
    const barra = montar({ usados: 0, capacidad: 600 });

    expect(
      barra.get('[data-test="barra-relleno"]').attributes('style')
    ).toContain('height: 0%');
    expect(
      barra.get('[data-test="barra-carga"]').attributes('aria-label')
    ).toBe('Sin citas · 10 h de horario');
  });

  it('por encima del horario no se sale de su caja, pero dice las horas reales', () => {
    const barra = montar({ usados: 780, capacidad: 720 });

    expect(
      barra.get('[data-test="barra-relleno"]').attributes('style')
    ).toContain('height: 100%');
    expect(
      barra.get('[data-test="barra-carga"]').attributes('aria-label')
    ).toBe('13 h reservadas de 12 h');
  });

  it('la mini (tarjeta de móvil) se esconde del lector: la tarjeta ya se nombra', () => {
    const raiz = montar({ usados: 60, capacidad: 720, variante: 'mini' }).get(
      '[data-test="barra-carga"]'
    );

    expect(raiz.attributes('aria-hidden')).toBe('true');
    expect(raiz.attributes('role')).toBeUndefined();
    expect(raiz.classes()).toContain('barra-carga--mini');
  });

  it('sobre carbón cambia el canal a tinta', () => {
    const raiz = montar({ usados: 60, capacidad: 720, sobreCarbon: true }).get(
      '[data-test="barra-carga"]'
    );

    expect(raiz.classes()).toContain('barra-carga--sobre-carbon');
  });
});
