/**
 * Prueba de fuente: montar `MainLayout` entero exigiría media aplicación, y lo
 * que se vigila aquí es que el rótulo, las entradas y la pintura de la
 * cabecera sean los acordados.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const LAYOUT = readFileSync(join(__dirname, '../../src/layouts/MainLayout.vue'), 'utf8');

describe('cabecera del portal', () => {
  it('ofrece un único botón de reserva, rotulado «Reservar»', () => {
    expect(LAYOUT).toContain('label="Reservar"');
    expect(LAYOUT).not.toContain("'Tus reservas'");
  });

  it('la entrada de estilistas sigue siendo solo de administración', () => {
    const entrada = LAYOUT.slice(LAYOUT.indexOf('Mis estilistas'));
    expect(entrada.slice(0, 200)).toContain('authStore.isAdmin');
  });

  it('la cabecera se pinta con los tokens, no con hexadecimales sueltos', () => {
    const cabecera = LAYOUT.slice(LAYOUT.indexOf('<q-header'), LAYOUT.indexOf('</q-header>'));
    expect(cabecera).not.toMatch(/#[0-9a-fA-F]{3,6}/);
  });

  /**
   * El inicio ya ofrece «Deja la tuya» en su banda de reseñas, y la regla
   * acordada es un solo flotante en pantalla: el del asistente. Dos burbujas
   * compiten y, en el inicio, tapaban el pie y la barra fija de móvil.
   */
  it('el flotante verde de reseña no sale en el inicio', () => {
    const flotante = LAYOUT.slice(LAYOUT.indexOf('class="review-fab"') - 300);
    expect(flotante.slice(0, 300)).toContain('mostrarFabResena');
    expect(LAYOUT).toContain("route.path !== '/'");
  });

  /**
   * El flotante del asistente no sale en el inicio, igual que ya no sale el de
   * reseñas: allí la banda de reseñas ofrece el asistente con sus chips. Lo
   * decide el armazón por ruta y se lo pasa al lanzador, que así no necesita
   * saber de rutas.
   */
  it('oculta el flotante del asistente en el inicio', () => {
    expect(LAYOUT).toContain(':mostrar-flotante="mostrarFlotanteAsistente"');

    const regla = LAYOUT.slice(LAYOUT.indexOf('const mostrarFlotanteAsistente'));
    expect(regla.slice(0, 160)).toContain("route.path !== '/'");
  });
});
