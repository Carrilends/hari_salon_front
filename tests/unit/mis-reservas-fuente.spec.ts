/**
 * Guardas de fuente de «Mis reservas» (hoja de ruta §2). El CSS está mockeado
 * en Jest (`tests/styleMock.js`) y jsdom no calcula estilos, así que lo que
 * una remodelación descuidada se lleva por delante —un hexadecimal, un aviso
 * flotante de Quasar, el foco, Safari 13.1, el SSG— se vigila leyendo la
 * fuente.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SRC = join(__dirname, '../../src');
const leer = (ruta: string) => readFileSync(join(SRC, ruta), 'utf8');

const ARCHIVOS = [
  'pages/MyReservationsPage.vue',
  'components/reservations/TarjetaReserva.vue',
  'components/reservations/FilaPasada.vue',
  'components/reservations/EstadoReserva.vue',
  'components/reservations/CancelarReservaDialog.vue',
  'components/reservations/CambiarFechaDialog.vue',
];

const estilos = (fuente: string) => fuente.slice(fuente.indexOf('<style'));
const plantilla = (fuente: string) =>
  fuente.slice(0, fuente.indexOf('<script'));
const guion = (fuente: string) =>
  fuente.slice(fuente.indexOf('<script'), fuente.indexOf('</script>'));

/** Todo el código del front, para buscar referencias a lo que se borró. */
const fuentes = (dir: string): string[] =>
  readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) return fuentes(ruta);
    return /\.(vue|ts|js)$/.test(nombre) ? [readFileSync(ruta, 'utf8')] : [];
  });

describe('Mis reservas · guardas de fuente', () => {
  it.each(ARCHIVOS)('%s no trae un solo hexadecimal de color', (ruta) => {
    expect(estilos(leer(ruta)).match(/#[0-9a-fA-F]{3,8}\b/g)).toBeNull();
  });

  it.each(ARCHIVOS)(
    '%s no usa los avisos ni los diálogos de plugin de Quasar',
    (ruta) => {
      expect(leer(ruta)).not.toMatch(/\$q\.notify|\$q\.dialog|useQuasar/);
    }
  );

  it.each(ARCHIVOS)(
    '%s no trae piezas de Quasar fuera de q-page y q-dialog',
    (ruta) => {
      expect(plantilla(leer(ruta))).not.toMatch(
        /<q-(btn|input|card|banner|spinner|icon|date|time|badge|tooltip|space)\b/
      );
    }
  );

  it.each(ARCHIVOS)(
    '%s respeta Safari 13.1 (sin inset, :has ni :where)',
    (ruta) => {
      const css = estilos(leer(ruta));

      expect(css).not.toMatch(/(^|[\s;{])inset\s*:|:has\(|:where\(/);
      const lineas = css.split('\n');
      lineas.forEach((linea, i) => {
        if (/100dvh/.test(linea)) expect(lineas[i - 1]).toMatch(/100vh/);
      });
    }
  );

  it.each(ARCHIVOS.filter((ruta) => /<button/.test(leer(ruta))))(
    '%s da foco visible a sus botones',
    (ruta) => {
      expect(estilos(leer(ruta))).toMatch(
        /:focus-visible[^{]*\{[^}]*outline: 2px solid var\(--m-(tinta|hueso)\);[^}]*outline-offset: -?2px;/
      );
    }
  );

  it.each(ARCHIVOS)(
    '%s no toca la ventana ni el documento en su guion (SSG)',
    (ruta) => {
      expect(guion(leer(ruta))).not.toMatch(
        /\bwindow\b|\bdocument\b|matchMedia/
      );
    }
  );

  /**
   * El oro claro no es color de texto sobre hueso ni nieve (2,8:1). Solo el
   * diálogo de cambiar fecha lo usa como texto, y es en su cabecera tinta.
   */
  it.each(ARCHIVOS.filter((ruta) => !ruta.endsWith('CambiarFechaDialog.vue')))(
    '%s no escribe en oro claro',
    (ruta) => {
      expect(estilos(leer(ruta))).not.toMatch(/(^|\s)color: var\(--m-oro\);/m);
    }
  );

  it.each(ARCHIVOS)('%s da 44 px a los controles', (ruta) => {
    const fuente = leer(ruta);
    if (!/<button/.test(fuente)) return;
    expect(estilos(fuente)).toMatch(
      /(min-height|height): (var\(--m-tactil-min\)|4[4-9]px|50px);/
    );
  });

  it('las piezas viejas se fueron y nadie las nombra', () => {
    expect(
      existsSync(join(SRC, 'components/reservations/ReservationCard.vue'))
    ).toBe(false);
    expect(
      existsSync(join(SRC, 'components/reservations/RescheduleDialog.vue'))
    ).toBe(false);
    for (const texto of fuentes(SRC)) {
      expect(texto).not.toMatch(/ReservationCard|RescheduleDialog/);
    }
  });

  it('la página ya no ofrece un segundo «Reservar» (M5)', () => {
    expect(plantilla(leer('pages/MyReservationsPage.vue'))).not.toMatch(
      /Reservar/
    );
  });

  it('la reseña se pide por la política del armazón, no abriendo a pelo', () => {
    const pagina = leer('pages/MyReservationsPage.vue');

    expect(pagina).toMatch(/solicitar: pedirResena/);
    expect(pagina).not.toMatch(/\babrir\(\)/);
  });
});
