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

/**
 * Los tres componentes nuevos de la fase, medidos por fuente: color solo por
 * token, foco visible, área táctil de 44 px y las dos familias.
 */
const NUEVOS = [
  'src/components/servicePage/ServiceCardAdminActions.vue',
  'src/components/dialogs/ServicePromotionDialog.vue',
  'src/components/dialogs/ServiceDeleteDialog.vue',
] as const;

describe('contrato visual de los componentes nuevos', () => {
  it.each(NUEVOS)('%s no pinta con colores escritos a mano', (ruta) => {
    const fuente = leer(ruta);
    const estilos = fuente.slice(fuente.indexOf('<style'));

    expect(estilos).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(estilos).not.toMatch(/\brgba?\(/);
    expect(estilos).toContain('var(--m-');
  });

  it.each(NUEVOS)('%s deja ver el foco', (ruta) => {
    expect(leer(ruta)).toContain(':focus-visible');
  });

  it.each(NUEVOS)('%s respeta el área táctil mínima', (ruta) => {
    expect(leer(ruta)).toContain('var(--m-tactil-min)');
  });

  it.each(NUEVOS)('%s usa las dos familias por token', (ruta) => {
    const fuente = leer(ruta);

    expect(fuente).toContain('var(--m-font-sans)');
    expect(fuente).toContain('var(--m-font-display)');
  });
});

describe('el botón que borra se lee como tal', () => {
  it('usa el color de peligro y su texto, por token', () => {
    const fuente = leer('src/components/dialogs/ServiceDeleteDialog.vue');
    const regla = fuente.slice(fuente.indexOf('.borrado__boton--peligro {'));

    expect(regla.slice(0, 320)).toContain('var(--m-peligro)');
    expect(regla.slice(0, 320)).toContain('var(--m-peligro-texto)');
  });

  it('y es el único sitio de la fase donde aparece ese color', () => {
    expect(
      leer('src/components/servicePage/ServiceCardAdminActions.vue')
    ).not.toContain('var(--m-peligro');
  });
});
