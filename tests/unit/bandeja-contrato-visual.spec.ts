/**
 * Lo que la bandeja promete y que montando no se ve: el CSS está mockeado en
 * Jest (`tests/styleMock.js`), así que se lee la fuente.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SRC = join(__dirname, '../../src');
const leer = (ruta: string) => readFileSync(join(SRC, ruta), 'utf8');

const ARCHIVOS = [
  'pages/AdminReservationsPage.vue',
  'components/admin-reservas/FilaReserva.vue',
  'components/admin-reservas/PestanasBandeja.vue',
  'components/admin-reservas/AvisosFijados.vue',
  'components/admin-reservas/DetalleReserva.vue',
  'components/admin-reservas/CancelarReservaBandeja.vue',
];

const estilos = (fuente: string) => fuente.slice(fuente.indexOf('<style'));
const sinComentarios = (texto: string) =>
  texto.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const MEDIA_FINA = '@media (hover: hover) and (pointer: fine)';

describe('la bandeja · contrato visual', () => {
  it.each(ARCHIVOS)('%s no trae colores escritos a mano', (archivo) => {
    const css = sinComentarios(estilos(leer(archivo)));

    expect(css.match(/#[0-9a-fA-F]{3,8}\b/g)).toBeNull();
    expect(css.match(/\brgba?\(/g)).toBeNull();
  });

  it.each(ARCHIVOS)('%s no usa piezas ni avisos de Quasar', (archivo) => {
    const fuente = leer(archivo);

    expect(fuente).not.toMatch(
      /<q-(btn|input|select|card|badge|banner|spinner|icon|tooltip|space)\b/
    );
    expect(fuente).not.toMatch(/useQuasar|\$q\.|\.notify\(/);
  });

  it.each(ARCHIVOS)('%s tiene foco visible de 2 px', (archivo) => {
    const css = estilos(leer(archivo));

    expect(css).toMatch(
      /:focus-visible[^{]*\{[^}]*outline: 2px solid var\(--m-/
    );
  });

  it.each(ARCHIVOS)(
    '%s pone el color de :hover solo con puntero fino',
    (archivo) => {
      const css = sinComentarios(estilos(leer(archivo)));
      const corte = css.indexOf(MEDIA_FINA);
      const antes = corte === -1 ? css : css.slice(0, corte);

      expect(antes).not.toMatch(/:hover/);
    }
  );

  it.each(ARCHIVOS)('%s respeta Safari 13.1 (sin inset ni :has)', (archivo) => {
    const css = sinComentarios(estilos(leer(archivo)));

    expect(css).not.toMatch(/\binset\s*:/);
    expect(css).not.toMatch(/:has\(/);
    for (const m of Array.from(css.matchAll(/(\S+):\s*100dvh/g))) {
      const previo = css.slice(0, m.index);
      expect(previo).toMatch(new RegExp(`${m[1]}:\\s*100vh;\\s*$`));
    }
  });

  it('A3 queda fijado: Mover no ofrece estilista mientras el backend no lo acepte', () => {
    expect(leer('pages/AdminReservationsPage.vue')).toContain(
      ':permitir-estilista="false"'
    );
  });

  it('el único aviso flotante que queda lleva la paleta', () => {
    const despachador = leer(
      'composables/notifications/useAdminNotifications.ts'
    );

    expect(despachador.match(/\$q\.notify\(/g)).toHaveLength(1);
    expect(despachador).toContain('ESTILO_AVISO.logro');
    expect(despachador).not.toMatch(
      /type:\s*'(positive|warning|info|negative)'/
    );
  });

  it('el título del día fija su interlineado (el h2 de Quasar trae 60 px)', () => {
    const css = sinComentarios(
      estilos(leer('pages/AdminReservationsPage.vue'))
    );
    const regla = css.match(/\.bandeja__dia \{[^}]*\}/);

    expect(regla).not.toBeNull();
    expect(regla?.[0]).toMatch(/line-height: [0-9.]+;/);
  });

  it('el lanzador del asistente no tapa el final de la lista ni las acciones de la ficha', () => {
    const css = sinComentarios(
      estilos(leer('pages/AdminReservationsPage.vue'))
    );
    const principal = css.match(/\n\.bandeja__principal \{[^}]*\}/)?.[0];
    const detalle = css.match(/\n\.bandeja__detalle \{[^}]*\}/)?.[0];

    expect(principal).toMatch(/padding:[^;]*var\(--m-flotante-despeje\)/);
    expect(detalle).toMatch(/padding:[^;]*var\(--m-flotante-despeje\)/);
  });

  it('la columna de la hora cabe «08:00» en Marcellus y el error se alinea con ella', () => {
    // Medido en Chromium: «08:00» ocupa 73,4 px a 23 px y 60,6 px a 19 px;
    // con 70 y 52 px la cifra invadía el hueco y casi tocaba el nombre.
    const css = sinComentarios(
      estilos(leer('components/admin-reservas/FilaReserva.vue'))
    );
    const px = (regla: RegExp) => {
      const m = css.match(regla);
      if (!m) throw new Error(`Falta ${regla}`);
      return Number(m[1]);
    };
    const hora = px(/\n\.fila__hora \{[^}]*width: (\d+)px/);
    const horaCompacta = px(
      /\.fila--compacta \.fila__hora \{[^}]*width: (\d+)px/
    );
    const error = px(/\n\.fila__error \{[^}]*margin: -?\d+px 0 \d+px (\d+)px/);
    const errorCompacta = px(
      /\.fila--compacta \.fila__error \{[^}]*margin-left: (\d+)px/
    );

    expect(hora).toBeGreaterThanOrEqual(74);
    expect(horaCompacta).toBeGreaterThanOrEqual(61);
    // Hora + hueco de `.fila__abrir` (20 px; 14 px en compacta).
    expect(error).toBe(hora + 20);
    expect(errorCompacta).toBe(horaCompacta + 14);
  });

  it('nadie usa ya el filtro viejo del panel', () => {
    const fuentes = (dir: string): string[] =>
      readdirSync(dir).flatMap((nombre) => {
        const ruta = join(dir, nombre);
        if (statSync(ruta).isDirectory()) return fuentes(ruta);
        return /\.(vue|ts)$/.test(nombre) ? [readFileSync(ruta, 'utf8')] : [];
      });

    for (const texto of fuentes(SRC)) {
      expect(texto).not.toMatch(
        /ADMIN_RESERVATION_FILTERS|filterAdminReservations/
      );
    }
  });
});
