/**
 * Lo que el cajón de reserva (plan 1 de las vistas) añade a los dos ficheros
 * que comparten todos los planes. `tokens.scss` exige que cada token lleve su
 * contraste o la razón de que no sea color de texto; los iconos tienen que
 * pintar trazos de verdad (un nombre desconocido no pinta nada, en silencio).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { mount } from '@vue/test-utils';
import StrokeIcon from 'src/components/shared/StrokeIcon.vue';

const TOKENS = readFileSync(
  join(__dirname, '../../src/css/tokens.scss'),
  'utf8'
);

const valorDe = (token: string) =>
  TOKENS.match(new RegExp(`--${token}:\\s*([^;]+);`))?.[1]?.trim() ?? '';

const comentarioDe = (token: string) =>
  TOKENS.match(new RegExp(`((?:\\s*///[^\\n]*\\n)+)\\s*--${token}:`))?.[1] ??
  '';

describe('tokens del cajón de reserva', () => {
  it('van al final, en su propio bloque del plan 1', () => {
    const bloque = TOKENS.indexOf('/// Plan 1 — reserva');

    expect(bloque).toBeGreaterThan(TOKENS.indexOf('--m-flotante-despeje'));
    expect(TOKENS.indexOf('--m-esqueleto')).toBeGreaterThan(bloque);
    expect(TOKENS.indexOf('--m-sombra-cajon')).toBeGreaterThan(bloque);
  });

  it('declara el hueco del esqueleto de las horas, que no es color de texto', () => {
    expect(valorDe('m-esqueleto')).toBe('#ece5db');
    expect(comentarioDe('m-esqueleto')).toMatch(/no es color de texto/i);
  });

  it('declara la sombra del cajón con los canales de la tinta', () => {
    expect(valorDe('m-sombra-cajon')).toBe(
      '-18px 0 44px rgba(22, 19, 15, 0.25)'
    );
    expect(comentarioDe('m-sombra-cajon')).toMatch(/no es color de texto/i);
  });
});

describe('iconos del cajón de reserva', () => {
  it.each([
    'cerrar',
    'check',
    'calendario',
    'sin-preferencia',
    'alerta',
    'whatsapp',
    'bolsa',
    'mas',
    'anterior',
    'siguiente',
  ])('«%s» dibuja trazos', (nombre) => {
    const icono = mount(StrokeIcon, { props: { nombre } });

    expect(icono.findAll('path').length).toBeGreaterThan(0);
  });

  it('el check es el trazo de los tableros', () => {
    const icono = mount(StrokeIcon, { props: { nombre: 'check' } });

    expect(icono.get('path').attributes('d')).toBe('M5 12.5l4.5 4.5L19 7.5');
  });
});
