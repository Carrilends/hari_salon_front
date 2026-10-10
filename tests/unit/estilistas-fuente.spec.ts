/**
 * «Mis estilistas»: lo que no se puede comprobar montando.
 *
 * `workers-api.ts` lee `import.meta.env`, que ts-jest no compila a CommonJS:
 * ninguna prueba lo importa sin doblarlo. Lo que el plan promete de él —que
 * `fetchWorkersWeek` va con el Bearer a la ruta del contrato §4.5 y que
 * `fetchWorkerAvailability`, que usa el diálogo de reserva, no cambió— se lee
 * de la fuente.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const leer = (ruta: string) =>
  readFileSync(join(__dirname, '../../src', ruta), 'utf8');

describe('workers-api · la semana', () => {
  const API = leer('api/workers-api.ts');

  it('declara el contrato §4.5 con sus nombres', () => {
    expect(API).toMatch(/export interface WorkersWeekResponse \{/);
    expect(API).toMatch(
      /export async function fetchWorkersWeek\(\s*start: string\s*\): Promise<WorkersWeekResponse>/
    );
  });

  it('pide la semana con el Bearer de la dueña, a la ruta del contrato', () => {
    expect(API).toMatch(
      /adminServiceApi\.get<WorkersWeekResponse>\(\s*'\/workers\/availability\/week',\s*\{\s*params:\s*\{\s*start\s*\}\s*\}/
    );
  });

  it('no cambia fetchWorkerAvailability (la usa el diálogo de reserva)', () => {
    expect(API).toMatch(
      /export async function fetchWorkerAvailability\(\s*dateYmd: string,?\s*\): Promise<WorkerAvailabilityResponse> \{\s*const \{ data \} = await workersApi\.get<WorkerAvailabilityResponse>\(\s*'\/workers\/availability',\s*\{ params: \{ date: dateYmd \} \},?\s*\);\s*return data;\s*\}/
    );
  });
});

import { mount } from '@vue/test-utils';
import StrokeIcon from 'src/components/shared/StrokeIcon.vue';

describe('los iconos de «Mis estilistas»', () => {
  it.each([
    'mas',
    'cerrar',
    'anterior',
    'siguiente',
    'candado',
    'sin-preferencia',
  ])('StrokeIcon dibuja «%s»', (nombre) => {
    const icono = mount(StrokeIcon, { props: { nombre } });
    expect(icono.findAll('path').length).toBeGreaterThan(0);
  });
});

/** Los archivos de este plan que pintan algo. */
const PINTAN = [
  'pages/WorkersPage.vue',
  'components/estilistas/BarraCarga.vue',
  'components/estilistas/TablaSemana.vue',
  'components/estilistas/TarjetasSemana.vue',
  'components/estilistas/PanelEstilista.vue',
];
const estilosDe = (fuente: string) => fuente.slice(fuente.indexOf('<style'));

describe('«Mis estilistas» · contrato visual', () => {
  it.each(PINTAN)('%s no trae un solo hexadecimal', (archivo) => {
    expect(leer(archivo).match(/#[0-9a-fA-F]{3,8}\b/g)).toBeNull();
  });

  it.each(PINTAN)('%s no usa piezas de Quasar ni su plugin de avisos', (archivo) => {
    const fuente = leer(archivo);
    expect(fuente).not.toMatch(
      /<q-(btn|input|card|chip|avatar|icon|skeleton|scroll-area|form|separator)\b/
    );
    expect(fuente).not.toMatch(/\$q\.|useQuasar/);
  });

  it.each(PINTAN)('%s: Safari 13.1 — ni `inset` ni `:has()`', (archivo) => {
    const estilos = estilosDe(leer(archivo));
    expect(estilos).not.toMatch(/\binset\s*:/);
    expect(estilos).not.toMatch(/:has\(/);
  });

  it.each([
    'pages/WorkersPage.vue',
    'components/estilistas/TablaSemana.vue',
    'components/estilistas/TarjetasSemana.vue',
    'components/estilistas/PanelEstilista.vue',
  ])('%s tiene foco visible en hueso (todo es sobre oscuro)', (archivo) => {
    expect(estilosDe(leer(archivo))).toMatch(
      /:focus-visible[^{]*\{[^}]*outline: 2px solid var\(--m-hueso\);[^}]*outline-offset: 2px;/
    );
  });

  it('el rosa solo marca hoy: un acento por pantalla', () => {
    for (const archivo of PINTAN) {
      const usos = estilosDe(leer(archivo)).match(/var\(--m-rosa\)/g) ?? [];
      const permitido =
        archivo.endsWith('TablaSemana.vue') || archivo.endsWith('TarjetasSemana.vue')
          ? 1
          : 0;
      expect({ archivo, usos: usos.length }).toEqual({ archivo, usos: permitido });
    }
  });

  it('solo «Sí, eliminar» se pinta en peligro', () => {
    for (const archivo of PINTAN) {
      const usos = estilosDe(leer(archivo)).match(/var\(--m-peligro\)/g) ?? [];
      const esperados = archivo.endsWith('PanelEstilista.vue') ? 2 : 0; // borde + fondo
      expect({ archivo, usos: usos.length }).toEqual({ archivo, usos: esperados });
    }
  });

  it('la página no toca window, document ni matchMedia en setup (SSG): usa useConsultaMedios', () => {
    const pagina = leer('pages/WorkersPage.vue');
    // `recordarFoco()` y `devolverFoco()` leen `document.activeElement` dentro
    // de un manejador (nunca durante el SSG): se quitan las funciones de
    // primer nivel y lo que queda —el setup— no puede tocar `document`.
    expect(pagina).not.toMatch(/\bwindow\.|matchMedia/);
    const setup = pagina.replace(/^function \w+\([^)]*\)[^{]*\{[\s\S]*?^\}/gm, '');
    expect(setup).not.toMatch(/\bdocument\./);
    expect(pagina).toMatch(/useConsultaMedios\('\(max-width: 899px\)', false\)/);
  });

  it('cada control mide al menos el área táctil', () => {
    for (const [archivo, clase] of [
      ['pages/WorkersPage.vue', 'estilistas__flecha'],
      ['pages/WorkersPage.vue', 'estilistas__agregar'],
      ['components/estilistas/TablaSemana.vue', 'tabla-semana__estilista'],
      ['components/estilistas/PanelEstilista.vue', 'panel-estilista__cerrar'],
      ['components/estilistas/PanelEstilista.vue', 'panel-estilista__eliminar'],
      ['components/estilistas/PanelEstilista.vue', 'panel-estilista__enlace'],
    ]) {
      const regla = new RegExp(`\\.${clase}\\s*\\{[^}]*var\\(--m-tactil-min\\)`);
      expect({ archivo, clase, ok: regla.test(estilosDe(leer(archivo))) }).toEqual({
        archivo,
        clase,
        ok: true,
      });
    }
  });
});
