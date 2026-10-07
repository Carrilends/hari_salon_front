/**
 * La píldora del precio, con la rebaja a la vista (D3).
 *
 * Hoy la lista pinta el precio **base** y la bolsa cobra el **efectivo**: la
 * clienta ve dos cifras distintas para el mismo servicio. La píldora aprende a
 * pintar las dos juntas, con la vieja tachada. Lo que no cambia es su API: la
 * usan la ficha del servicio y el diálogo de reserva, que no se tocan en esta
 * fase.
 */
import { mount } from '@vue/test-utils';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import PriceDisplayPill from 'src/components/shared/PriceDisplayPill.vue';

const FUENTE = readFileSync(
  join(__dirname, '../../src/components/shared/PriceDisplayPill.vue'),
  'utf8'
);

describe('PriceDisplayPill', () => {
  it('pinta el importe en pesos, con separador de miles', () => {
    const pildora = mount(PriceDisplayPill, { props: { amount: 45000 } });

    expect(pildora.get('[data-test="precio"]').text()).toContain('45.000');
  });

  it('con un precio base mayor lo pinta al lado, tachado', () => {
    const pildora = mount(PriceDisplayPill, {
      props: { amount: 36000, amountBase: 45000 },
    });

    expect(pildora.get('[data-test="precio"]').text()).toContain('36.000');
    expect(pildora.get('[data-test="precio-base"]').text()).toContain('45.000');
  });

  it('sin precio base no pinta una segunda cifra', () => {
    const pildora = mount(PriceDisplayPill, { props: { amount: 45000 } });

    expect(pildora.find('[data-test="precio-base"]').exists()).toBe(false);
  });

  /** Tachar un precio que no es rebaja sería mentir sobre un descuento. */
  it('un base igual o menor que el importe no se pinta', () => {
    const igual = mount(PriceDisplayPill, {
      props: { amount: 45000, amountBase: 45000 },
    });
    const menor = mount(PriceDisplayPill, {
      props: { amount: 45000, amountBase: 30000 },
    });

    expect(igual.find('[data-test="precio-base"]').exists()).toBe(false);
    expect(menor.find('[data-test="precio-base"]').exists()).toBe(false);
  });

  it('un importe vacío no pinta «NaN»', () => {
    const pildora = mount(PriceDisplayPill, { props: { amount: null } });

    expect(pildora.text()).not.toContain('NaN');
  });

  /** Regresión: `dense` la usan la lista de móvil y la tarjeta del asistente. */
  it('sigue aceptando la variante compacta', () => {
    const pildora = mount(PriceDisplayPill, {
      props: { amount: 45000, dense: true },
    });

    expect(pildora.classes()).toContain('cop-price-pill--dense');
  });

  it('el precio base se tacha de verdad, no solo de nombre', () => {
    expect(FUENTE).toMatch(
      /\.cop-price-pill__base \{[^}]*text-decoration: line-through/
    );
  });
});
