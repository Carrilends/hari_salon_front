/**
 * Contrato visual de Mi cuenta (plan 6), leído de la fuente: el SCSS está
 * mapeado a un objeto vacío en Jest, así que un color, un foco o una
 * propiedad de Safari no se pueden afirmar montando.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = join(__dirname, '../../src');
const leer = (ruta: string) => readFileSync(join(SRC, ruta), 'utf8');

const PIEZAS = [
  'components/cuenta/MarcoSeccion.vue',
  'components/cuenta/AccionesCuenta.vue',
  'components/cuenta/IdentidadCuenta.vue',
  'components/cuenta/AvisoVerificacion.vue',
  'components/cuenta/IndiceCuenta.vue',
  'components/cuenta/SeccionPerfil.vue',
  'components/cuenta/SeccionCorreo.vue',
  'components/cuenta/SeccionContrasena.vue',
  'components/cuenta/SeccionSesion.vue',
];
const PAGINA = 'pages/MyAccountPage.vue';
const TODOS = PIEZAS.concat(PAGINA);

/** Los que pintan sus propios botones o enlaces (no solo los de sus hijos). */
const CON_CONTROLES = [
  'components/cuenta/AccionesCuenta.vue',
  'components/cuenta/AvisoVerificacion.vue',
  'components/cuenta/IndiceCuenta.vue',
  'components/cuenta/SeccionCorreo.vue',
  'components/cuenta/SeccionContrasena.vue',
  'components/cuenta/SeccionSesion.vue',
  PAGINA,
];

const plantillaDe = (fuente: string) =>
  fuente.slice(fuente.indexOf('<template>'), fuente.lastIndexOf('</template>'));

const scriptDe = (fuente: string) =>
  fuente.slice(fuente.indexOf('<script'), fuente.indexOf('</script>'));

const estilosDe = (fuente: string) => {
  const i = fuente.indexOf('<style');
  return i === -1
    ? ''
    : fuente
        .slice(i)
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '');
};

describe('Mi cuenta, leída de la fuente', () => {
  it('la lista cubre todos los .vue de src/components/cuenta', () => {
    const reales = readdirSync(join(SRC, 'components', 'cuenta'))
      .filter((nombre) => nombre.endsWith('.vue'))
      .map((nombre) => `components/cuenta/${nombre}`)
      .sort();

    expect(reales).toEqual(PIEZAS.slice().sort());
  });

  it.each(TODOS)('%s no lleva hexadecimales ni rgb()', (archivo) => {
    const fuente = leer(archivo);
    expect(fuente).not.toMatch(/#[0-9a-fA-F]{3,8}(?![\w-])/);
    expect(estilosDe(fuente)).not.toMatch(/rgba?\(/);
  });

  it.each(TODOS)('%s no lleva estilos en línea', (archivo) => {
    expect(plantillaDe(leer(archivo))).not.toMatch(/\sstyle="/);
  });

  it.each(TODOS)('%s no usa piezas ni avisos directos de Quasar', (archivo) => {
    const fuente = leer(archivo);
    expect(fuente).not.toMatch(
      /<q-(btn|input|card|banner|tabs|tab|tab-panels|tab-panel|form|icon|separator|spinner)\b/
    );
    expect(fuente).not.toMatch(/\$q\.|useQuasar/);
  });

  it.each(TODOS)('%s no usa lo que Safari 13.1 no conoce', (archivo) => {
    const estilos = estilosDe(leer(archivo));
    expect(estilos).not.toMatch(/(^|[\s;{])inset:/);
    expect(estilos).not.toMatch(/:has\(/);
    expect(estilos).not.toMatch(/100dvh/);
  });

  it.each(CON_CONTROLES)('%s tiene foco visible en tinta', (archivo) => {
    expect(estilosDe(leer(archivo))).toMatch(
      /:focus-visible[^{]*\{[^}]*outline: 2px solid var\(--m-tinta\);[^}]*outline-offset: 2px;/
    );
  });

  it.each(CON_CONTROLES)('%s pone el color del :hover solo con puntero fino', (archivo) => {
    const estilos = estilosDe(leer(archivo));
    const fuera = estilos.replace(
      /@media \(hover: hover\) and \(pointer: fine\) \{[\s\S]*?\n\}/g,
      ''
    );
    expect(estilos).toContain('@media (hover: hover) and (pointer: fine)');
    expect(fuera).not.toMatch(/:hover/);
  });

  it('la página solo toca document dentro de un watch, nunca en setup', () => {
    const script = scriptDe(leer(PAGINA));
    expect(script).not.toMatch(/matchMedia|window\./);
    const primerDocument = script.indexOf('document.');
    expect(primerDocument).toBeGreaterThan(script.indexOf('watch(seccion'));
  });

  it('la única llamada a un aviso flotante es el logro de «en todos»', () => {
    const script = scriptDe(leer(PAGINA));
    expect(script.match(/aviso\.\w+\(/g)).toEqual(['aviso.logro(']);
    PIEZAS.forEach((archivo) => {
      expect(leer(archivo)).not.toMatch(/useAviso/);
    });
  });

  it('el oro claro no es color de texto en ninguna pieza clara', () => {
    TODOS.forEach((archivo) => {
      const estilos = estilosDe(leer(archivo));
      // Solo se permite dentro de un :hover sobre un botón tinta macizo.
      const sinHoverMacizo = estilos.replace(
        /\.(acciones-cuenta__guardar|contrasena__crear|sesion__boton--macizo)[^{]*:hover\s*\{[^}]*\}/g,
        ''
      );
      expect(sinHoverMacizo).not.toMatch(/(^|[\s;{])color: var\(--m-oro\);/);
    });
  });
});
