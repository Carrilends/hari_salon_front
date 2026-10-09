/**
 * `escucharConsulta` es el único sitio donde se decide cómo escuchar una
 * consulta de medios. NF06 promete Safari 13.1, donde `MediaQueryList` todavía
 * no es un `EventTarget`: solo trae `addListener`/`removeListener`. Una llamada
 * suelta a `addEventListener` revienta ahí el montaje del componente entero.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { escucharConsulta } from 'src/helpers/escuchar-consulta';

type Escucha = () => void;

function dobleDeConsulta(conEventTarget: boolean) {
  const registro = {
    puestosModernos: [] as Escucha[],
    quitadosModernos: [] as Escucha[],
    puestosObsoletos: [] as Escucha[],
    quitadosObsoletos: [] as Escucha[],
  };
  const consulta = {
    matches: false,
    addEventListener: conEventTarget
      ? (_tipo: string, fn: Escucha) => registro.puestosModernos.push(fn)
      : undefined,
    removeEventListener: conEventTarget
      ? (_tipo: string, fn: Escucha) => registro.quitadosModernos.push(fn)
      : undefined,
    addListener: (fn: Escucha) => registro.puestosObsoletos.push(fn),
    removeListener: (fn: Escucha) => registro.quitadosObsoletos.push(fn),
  } as unknown as MediaQueryList;
  return { consulta, registro };
}

describe('escucharConsulta', () => {
  it('usa addEventListener cuando existe, y lo suelta con removeEventListener', () => {
    const { consulta, registro } = dobleDeConsulta(true);
    const alCambiar = jest.fn();

    const soltar = escucharConsulta(consulta, alCambiar);
    soltar();

    expect(registro.puestosModernos).toEqual([alCambiar]);
    expect(registro.quitadosModernos).toEqual([alCambiar]);
    expect(registro.puestosObsoletos).toEqual([]);
  });

  it('sin addEventListener (Safari 13.1) recurre a addListener y removeListener', () => {
    const { consulta, registro } = dobleDeConsulta(false);
    const alCambiar = jest.fn();

    const soltar = escucharConsulta(consulta, alCambiar);
    soltar();

    expect(registro.puestosObsoletos).toEqual([alCambiar]);
    expect(registro.quitadosObsoletos).toEqual([alCambiar]);
  });

  it('sin ninguno de los dos no revienta y devuelve un soltar inofensivo', () => {
    const consulta = { matches: false } as unknown as MediaQueryList;

    expect(() => escucharConsulta(consulta, jest.fn())()).not.toThrow();
  });
});

/**
 * Quien escucha una consulta de medios pasa por el helper: una llamada suelta
 * a `addEventListener` sobre la consulta es justo el fallo de Safari 13.1.
 */
describe('los que escuchan consultas de medios', () => {
  const CONSUMIDORES = [
    'src/composables/dialogs/useDialogMaximizedBelow.ts',
    'src/composables/shared/useCoarsePointer.ts',
    'src/components/dialogs/serviceFilterDialog.vue',
    'src/components/dialogs/serviceDialog.vue',
    'src/composables/shared/useConsultaMedios.ts',
  ];

  it.each(CONSUMIDORES)('%s usa escucharConsulta y no addEventListener a pelo', (ruta) => {
    const fuente = readFileSync(join(__dirname, '../..', ruta), 'utf8');

    expect(fuente).toContain('escucharConsulta(');
    expect(fuente).not.toMatch(/\.addEventListener\(\s*'change'/);
  });
});
