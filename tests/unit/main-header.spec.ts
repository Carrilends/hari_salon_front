/**
 * Prueba de fuente: montar `MainLayout` entero exigiría media aplicación, y lo
 * que se vigila aquí es que el rótulo, las entradas y la pintura de la
 * cabecera sean los acordados.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createMemoryHistory, createRouter } from 'vue-router';
import routes from 'src/router/routes';

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
  it('el flotante verde de reseña lo decide la ruta, por su `meta`', () => {
    const flotante = LAYOUT.slice(LAYOUT.indexOf('class="review-fab"') - 300);
    expect(flotante.slice(0, 300)).toContain('mostrarFabResena');

    const regla = LAYOUT.slice(LAYOUT.indexOf('const mostrarFabResena'));
    expect(regla.slice(0, 160)).toMatch(
      /showReviewButton\.value && !route\.meta\.sinFabResena/
    );
    // Comparar `route.path` falla con la barra final: ver la prueba de abajo.
    expect(LAYOUT).not.toContain('RUTAS_SIN_FAB_RESENA');
  });

  /**
   * Tampoco en `/services`: allí el pie con el paginador está siempre a la
   * vista y la burbuja, abajo a la izquierda, se le sentaba encima (sobre
   * «Siguiente» a 390 px, sobre el resumen a 1280). Mismo criterio que en el
   * inicio: un solo flotante por pantalla, el del asistente.
   *
   * Por `meta` y no por `route.path`: `build:ssg` publica
   * `services/index.html` y Netlify sirve `/services/` (redirige la de sin
   * barra), así que en una visita directa en producción `route.path` es
   * `/services/` y una comparación de cadenas dejaba volver la burbuja. El
   * router casa las dos formas con el mismo registro, y su `meta` con él.
   */
  describe('qué rutas llevan la marca de «sin flotante de reseña»', () => {
    const router = createRouter({ history: createMemoryHistory(), routes });
    const sinFab = (ruta: string) =>
      Boolean(router.resolve(ruta).meta.sinFabResena);

    it.each(['/', '/services', '/services/'])('%s la lleva', (ruta) => {
      expect(sinFab(ruta)).toBe(true);
    });

    it.each([
      '/testimonios',
      '/testimonios/',
      '/preguntas-frecuentes',
      '/mi-cuenta',
    ])('%s no la lleva: allí la burbuja sigue saliendo', (ruta) => {
      expect(sinFab(ruta)).toBe(false);
    });
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

  /**
   * El desplegable de «Más» era lo último con la pintura vieja: degradado de
   * rosa a azul, iconos morados y esquinas de 14 px. Ahora habla el idioma de
   * la remodelación, y como todo lo demás, por token y nunca por hexadecimal.
   */
  it('el desplegable de «Más» se pinta con la paleta, no con hexadecimales', () => {
    // El bloque vive fuera de `scoped`: Quasar teletransporta el menú al `body`
    // y su raíz no lleva el atributo de ámbito, así que ninguna regla scoped la
    // alcanzaría. Por eso se mide desde ahí hasta el final del fichero.
    const bloque = LAYOUT.slice(LAYOUT.indexOf('.more-menu {'));

    expect(LAYOUT.indexOf('<style lang="scss">')).toBeGreaterThan(
      LAYOUT.indexOf('<style scoped lang="scss">')
    );

    expect(bloque).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    for (const token of [
      '--m-nieve',
      '--m-filete',
      '--m-tinta',
      '--m-oro-profundo',
      '--m-font-sans',
      '--m-tactil-min',
    ]) {
      expect(bloque).toContain(token);
    }
  });

  it('ya no quedan el degradado ni el icono morado de antes', () => {
    expect(LAYOUT).not.toContain('#5a4f77');
    expect(LAYOUT).not.toContain('linear-gradient(180deg, #fff9fc');
  });
});
