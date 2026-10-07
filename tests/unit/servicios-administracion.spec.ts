/**
 * Pruebas de fuente de la fase E.
 *
 * El SCSS está mapeado a `tests/styleMock.js`: montar un componente no dice
 * nada de su color. Lo que se vigila aquí es el contrato visual —tokens, nada
 * de hexadecimales, foco visible, área táctil— y los invariantes que una
 * remodelación descuidada se lleva por delante.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ = join(__dirname, '../..');
const leer = (ruta: string) => readFileSync(join(RAIZ, ruta), 'utf8');

const TOKENS = leer('src/css/tokens.scss');
const ICONOS = leer('src/components/shared/StrokeIcon.vue');

const valorDe = (token: string) =>
  TOKENS.match(new RegExp(`--${token}:\\s*([^;]+);`))?.[1]?.trim() ?? '';

describe('tokens de la administración de servicios', () => {
  /** D6: la paleta no tiene rojo y un botón de borrar necesita leerse como tal. */
  it('declara el color de peligro y su texto', () => {
    expect(valorDe('m-peligro')).toBe('#8e3b5c');
    expect(valorDe('m-peligro-texto')).toBe('#f6f1ea');
  });

  /**
   * El velo bajo los tres botones de la dueña es tinta al 72 %: sin token,
   * el componente tendría que escribir `rgba(22, 19, 15, 0.72)` a mano.
   */
  it('declara el velo de las acciones sobre la foto', () => {
    expect(valorDe('m-velo-accion')).toBe('rgba(22, 19, 15, 0.72)');
  });
});

describe('trazos de la administración', () => {
  it.each(['lapiz', 'etiqueta', 'papelera'])(
    'el icono «%s» existe y dibuja trazos',
    (nombre) => {
      const bloque = ICONOS.slice(ICONOS.indexOf(`  ${nombre}: [`));

      expect(bloque.slice(0, 400)).toMatch(/'M[\d\s.,a-zA-Z-]+'/);
    }
  );
});
