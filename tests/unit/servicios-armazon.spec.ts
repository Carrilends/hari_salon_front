/**
 * El contrato visual y estructural del armazón de la página de servicios.
 *
 * Se lee la fuente en vez de montar porque las pruebas no tienen CSS: el
 * `moduleNameMapper` manda todo `.scss` a `tests/styleMock.js`, así que un
 * color NO se puede afirmar con `mount`. Y porque esta página arrastra
 * `services-api`, que lee `import.meta.env`.
 *
 * La mitad de abajo es una red contra la remodelación descuidada: la §6 de la
 * hoja de ruta lista lo que ya funciona y una reescritura se lleva por delante
 * sin enterarse.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CONSULTA_PANTALLA_BAJA } from 'src/stores/filters-store';

const leer = (relativa: string) =>
  readFileSync(join(__dirname, '../../', relativa), 'utf8');

/**
 * Los tres archivos que la fase A posee y pinta. Las fases siguientes añaden
 * los suyos a esta lista: la regla «ningún hexadecimal en un componente» es de
 * toda la remodelación, no de esta fase.
 */
const ARCHIVOS: Array<[string, string]> = [
  ['ServiceToolbar.vue', 'src/components/servicePage/ServiceToolbar.vue'],
  ['ServicePagerBar.vue', 'src/components/servicePage/ServicePagerBar.vue'],
  ['ServicePage.vue', 'src/pages/ServicePage.vue'],
];

/** `#8e3b5c`, `#fff`, `#f5f5f5`, `#16130f80`… */
const HEXADECIMAL = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/;

const PAGINA = leer('src/pages/ServicePage.vue');

/**
 * Desde la fase E (Tarea 7) la administración no vive en la página sino en su
 * composable; las guardias que apuntaban a la página se mudaron aquí.
 */
const ADMIN = leer('src/composables/services/useServiceAdminActions.ts');

/** Quienes pintan las fotos de la lista desde la fase B. */
const FOTOS_DE_LA_LISTA = [
  'src/components/servicePage/ServiceCard.vue',
  'src/components/servicePage/ServiceRow.vue',
];

describe('paleta del mostrador', () => {
  it.each(ARCHIVOS)('%s no escribe ni un hexadecimal', (_nombre, ruta) => {
    expect(leer(ruta)).not.toMatch(HEXADECIMAL);
  });

  it.each(ARCHIVOS)('%s pinta con los tokens de la paleta', (_nombre, ruta) => {
    expect(leer(ruta)).toMatch(/var\(--m-[a-z-]+\)/);
  });
});

describe('armazón de la página de servicios', () => {
  /**
   * Mudada el 2026-10-07 (se revierte D4 a petición de Luis): antes fijaba «la
   * página entera desplaza»; ahora fija lo contrario. Cabecera, barra y pie se
   * quedan quietos y solo la lista desplaza, dentro de su caja. Lo que D4 quitó
   * sigue fuera: ni `q-scroll-area` (D8, marcado llano) ni la altura calculada
   * a mano; el alto lo da el `style-fn` de Quasar, que ya descuenta la cabecera.
   */
  it('solo desplaza la lista, con scroll nativo y sin cuentas a mano', () => {
    expect(PAGINA).not.toContain('q-scroll-area');
    expect(PAGINA).not.toContain('desktopScrollBodyPx');
    expect(PAGINA).not.toContain('thumbStyle');
    expect(PAGINA).not.toContain('windowHeight');

    expect(PAGINA).toMatch(/<q-page[^>]*:style-fn="alturaDelMostrador"/);
    expect(PAGINA).toMatch(/calc\(100vh - \$\{offset\}px\)/);
    // El alto viaja en una variable, no en un `height` en línea (que le ganaría
    // a la consulta de pantalla baja).
    expect(PAGINA).toMatch(/return \{ '--mostrador-alto': altura \};/);
    expect(PAGINA).toMatch(
      /\.mostrador \{[^}]*height: var\(--mostrador-alto\);[^}]*min-height: var\(--mostrador-alto\);/
    );
  });

  /**
   * Teléfono tumbado (844×390): cabecera, barra y pie se comían el alto y a la
   * lista le quedaban 80 px. Por debajo de 560 px de alto (el corte de la hoja
   * de filtros) vuelve a desplazar la página entera: alto natural, y ni la
   * lista ni el carril desplazan por su cuenta. En CSS, para que valga también
   * en el HTML prerenderizado.
   */
  it('en una pantalla baja vuelve a desplazar la página entera', () => {
    const estilos = PAGINA.slice(PAGINA.indexOf('<style'));
    // El literal del SCSS sale de la constante del store: si el corte cambia
    // allí y no aquí, esto falla en vez de dejar el SCSS desfasado.
    const inicio = estilos.indexOf(`@media ${CONSULTA_PANTALLA_BAJA} {`);
    expect(inicio).toBeGreaterThan(-1);
    const bloque = estilos.slice(inicio, estilos.indexOf('\n}\n', inicio));

    expect(bloque).toMatch(/\.mostrador \{\s*height: auto;/);
    expect(bloque).toMatch(/\.mostrador__cuerpo \{\s*flex: 1 0 auto;/);
    expect(bloque).toMatch(/\.mostrador__lista \{\s*overflow-y: visible;/);
    const carril = leer('src/components/servicePage/ServiceFilterRail.vue');
    const bloqueCarril = carril.slice(
      carril.indexOf(`@media ${CONSULTA_PANTALLA_BAJA} {`)
    );
    expect(carril).toContain(`@media ${CONSULTA_PANTALLA_BAJA} {`);
    expect(bloqueCarril).toMatch(
      /^@media [^{]+\{\s*\.carril \{\s*overflow-y: visible;/
    );
  });

  /**
   * El lanzador del asistente flota abajo a la derecha (18 px del borde, 48 de
   * alto) y el pie está siempre a la vista: sin despeje, «Siguiente» quedaba
   * debajo de la píldora. El relleno inferior del mostrador es el token del
   * despeje, a todos los anchos; nada de 40/28 px sueltos.
   */
  it('el pie termina por encima del lanzador del asistente', () => {
    expect(PAGINA).toMatch(
      /\.mostrador \{[^}]*padding: 0 var\(--m-banda-margen\) var\(--m-flotante-despeje\);/
    );
    expect(PAGINA).toMatch(
      /padding: 0 var\(--m-banda-margen-movil\) var\(--m-flotante-despeje\);/
    );
    expect(PAGINA).not.toMatch(
      /padding: 0 var\(--m-banda-margen(-movil)?\) \d+px;/
    );
  });

  it('el armazón es una columna: barra y pie quietos, el cuerpo se come el resto', () => {
    expect(PAGINA).toMatch(
      /\.mostrador \{[^}]*display: flex;[^}]*flex-direction: column;/
    );
    expect(PAGINA).toMatch(
      /\.mostrador__barra,\s*\n\.mostrador__pie \{\s*flex: none;/
    );
    expect(PAGINA).toMatch(/<ServiceToolbar\s+class="mostrador__barra"/);
    expect(PAGINA).toMatch(/<ServicePagerBar\s+class="mostrador__pie"/);
    // Sin `min-height: 0` un hijo flexible no encoge por debajo de su
    // contenido y la lista empujaría el pie fuera de la pantalla.
    expect(PAGINA).toMatch(
      /\.mostrador__cuerpo \{[^}]*flex: 1 1 0;[^}]*min-height: 0;[^}]*align-items: stretch;/
    );
  });

  it('la lista es el único contenedor del cuerpo que desplaza', () => {
    const estilos = PAGINA.slice(PAGINA.indexOf('<style'));
    expect(estilos.match(/overflow-y: auto;/g)).toHaveLength(1);
    expect(PAGINA).toMatch(
      /\.mostrador__lista \{[^}]*min-height: 0;[^}]*overflow-y: auto;[^}]*overscroll-behavior: contain;/
    );
    expect(estilos).not.toMatch(/overflow(-y)?: scroll;/);
  });

  it('la barra y el pie quedan fuera de la caja que desplaza', () => {
    const plantilla = PAGINA.slice(0, PAGINA.indexOf('</template>\n\n<script'));
    const inicioLista = plantilla.indexOf(
      'class="mostrador__lista m-riel-oro"'
    );
    const finLista = plantilla.indexOf('</ServiceCardsGrid>');
    const lista = plantilla.slice(inicioLista, finLista);

    expect(inicioLista).toBeGreaterThan(-1);
    expect(lista).not.toContain('ServiceToolbar');
    expect(lista).not.toContain('ServicePagerBar');
    expect(lista).not.toContain('ServiceFilterRail');
    expect(plantilla.indexOf('<ServiceToolbar')).toBeLessThan(inicioLista);
    expect(plantilla.indexOf('<ServicePagerBar')).toBeGreaterThan(finLista);
  });

  it('se quitó la caja gris con sombra lila', () => {
    expect(PAGINA).not.toContain('box-style');
  });

  /**
   * Paleta A (2026-10-11), «banda tinta arriba, carta en hueso»: la página
   * entera en tinta era la única vista oscura del portal. El cuerpo va en
   * hueso y el oscuro aparece una vez, en la banda de la barra.
   */
  it('va sobre hueso, con los márgenes de banda', () => {
    expect(PAGINA).toMatch(
      /\.mostrador \{[^}]*background: var\(--m-hueso\);[^}]*color: var\(--m-tinta\);/
    );
    expect(PAGINA).toContain('var(--m-banda-margen)');
    expect(PAGINA).toContain('var(--m-banda-margen-movil)');
  });

  it('la barra va en una banda tinta a sangre, la única oscura', () => {
    const plantilla = PAGINA.slice(0, PAGINA.indexOf('</template>\n\n<script'));
    const banda = plantilla.indexOf('<div class="mostrador__banda">');

    expect(banda).toBeGreaterThan(-1);
    expect(plantilla.indexOf('<ServiceToolbar')).toBeGreaterThan(banda);
    expect(PAGINA).toMatch(
      /\.mostrador__banda \{[^}]*margin: 0 calc\(-1 \* var\(--m-banda-margen\)\);[^}]*padding: 0 var\(--m-banda-margen\);[^}]*background: var\(--m-tinta\);/
    );
    expect(PAGINA.match(/background: var\(--m-tinta\);/g)).toHaveLength(1);
  });

  it('el riel de la lista corre por el canal claro', () => {
    expect(PAGINA).toMatch(
      /\.mostrador__lista \{[^}]*--m-riel-canal: var\(--m-riel-canal-claro\);/
    );
  });

  /**
   * Mudada el 2026-10-07: antes fijaba que la página encendía `html.m-riel-oro`
   * al montarse y lo apagaba al desmontarse. Con el documento quieto, el riel
   * es de quien desplaza: la lista y el carril llevan la clase de utilidad, y
   * la página ya no toca el `<html>`.
   */
  it('el riel dorado va en la lista y en el carril, no en el documento', () => {
    expect(PAGINA).toContain('class="mostrador__lista m-riel-oro"');
    expect(leer('src/components/servicePage/ServiceFilterRail.vue')).toMatch(
      /<aside[^>]*class="carril m-riel-oro"/
    );
    expect(PAGINA).not.toContain('classList');
    expect(PAGINA).not.toContain('documentElement');
  });

  it('monta la cabecera y el pie, y ya no pagina con Quasar', () => {
    expect(PAGINA).toContain('ServiceToolbar');
    expect(PAGINA).toContain('ServicePagerBar');
    expect(PAGINA).not.toContain('q-pagination');
  });

  it('los cortes de ancho ya no viven aquí', () => {
    expect(PAGINA).toContain('useServiceViewport');
    expect(PAGINA).not.toContain('BREAKPOINT_WIDE');
    expect(PAGINA).not.toContain('BREAKPOINT_COMPACT_SEARCH');
    expect(PAGINA).not.toContain('BREAKPOINT_LIST_LAYOUT');
  });
});

/**
 * La §6 de la hoja de ruta: lo que ya funciona y una reescritura se lleva por
 * delante. Cada aserción es un fallo que nos ha costado encontrar una vez.
 */
describe('lo que la fase A no puede romper', () => {
  /**
   * Mudada en la fase E: la llamada vivía en la página y ahora la hace el
   * composable de administración tras una promoción, y el formulario de
   * edición tras guardar. La página tiene que seguir cableando ambos.
   */
  it('sigue sincronizando la bolsa cuando un servicio cambia', () => {
    expect(ADMIN).toContain('bookStore.syncBookingWithService(fresh)');
    expect(leer('src/components/dialogs/serviceCreateEdit.vue')).toContain(
      'bookStore.syncBookingWithService(fresh)'
    );
    expect(PAGINA).toContain('useServiceAdminActions({');
    expect(PAGINA).toContain('<service-create-edit');
  });

  /**
   * Desde la fase C el atajo abre la hoja solo cuando no hay carril (D1): en
   * escritorio los filtros ya se ven y no hay nada que abrir. La guardia se
   * mudó de «abre siempre» a «abre solo sin carril»; la conducta por anchos la
   * prueba `ServicePage-filtros.spec.ts` montando la página.
   */
  it('sigue atendiendo el atajo del inicio, y abre la hoja solo sin carril', () => {
    expect(PAGINA).toContain('applyShortcutFromIndex');
    const atajo = PAGINA.slice(
      PAGINA.indexOf('function applyShortcutFromIndex'),
      PAGINA.indexOf('watch(', PAGINA.indexOf('function applyShortcutFromIndex'))
    );
    expect(atajo).toMatch(/showFilterDialog\.value = !hayCarril\.value;/);
    expect(atajo).not.toMatch(/showFilterDialog\.value = true;/);
  });

  it('ya no usa la tarjeta vieja, y sigue con la hoja de filtros', () => {
    // La tarjeta la sustituyó la fase B (ServiceCardsGrid). El diálogo de
    // filtros la fase C lo convirtió en la hoja de móvil, y en escritorio lo
    // releva el carril: los dos siguen montados, cada uno decide su ancho.
    expect(PAGINA).not.toContain('TabsByEachService');
    expect(PAGINA).toContain('<ServiceFilterDialog');
    expect(PAGINA).toContain('<ServiceFilterRail');
  });

  it('sigue publicando su SEO y sus datos estructurados', () => {
    expect(PAGINA).toContain('useSeo(');
    expect(PAGINA).toContain('servicesSchema');
  });

  /**
   * Desde la fase B las fotos de la lista las pintan la tarjeta y el renglón, no
   * la página, así que la guardia se mudó con ellas: la página ya no pinta
   * ninguna `<img>`, y quien sí lo hace pasa la URL por los dos ayudantes.
   */
  it('nunca sirve una imagen de Cloudinary sin optimizar', () => {
    expect(PAGINA).not.toMatch(/<img\b/);
    expect(PAGINA).not.toContain('images?.[0]?.url');

    for (const ruta of FOTOS_DE_LA_LISTA) {
      const fuente = leer(ruta);
      // Del módulo sin Axios (ver las restricciones de la fase B).
      expect(fuente).toMatch(
        /import \{\s*buildCloudinarySrcset,\s*optimizeCloudinaryUrl,?\s*\} from 'src\/helpers\/cloudinaryUrl';/
      );
      // La única `<img>` lleva la URL ya optimizada y su `srcset`…
      expect(fuente.match(/<img\b/g)).toHaveLength(1);
      expect(fuente).toContain(':src="foto"');
      expect(fuente).toMatch(
        /const foto = computed\(\(\) => optimizeCloudinaryUrl\(urlOriginal\.value, ANCHO\)\);/
      );
      expect(fuente).toMatch(/buildCloudinarySrcset\(urlOriginal\.value, ANCHOS_SRCSET\)/);
      // …y la original nunca llega a un atributo.
      expect(fuente).not.toMatch(/:src(set)?="urlOriginal"/);
    }
  });

  /**
   * `PLACEHOLDER_IMAGE` sigue siendo el único sustituto de imagen (§6.6). La
   * tarjeta y el renglón no lo usan a propósito (D-B2: sin foto pintan «Sin
   * foto» y no piden ninguna imagen), pero tampoco inventan otro.
   */
  it('sin foto, la lista no pide imagen ni inventa otro sustituto', () => {
    for (const ruta of FOTOS_DE_LA_LISTA) {
      const fuente = leer(ruta);
      expect(fuente).toMatch(/<img\s+v-if="tieneFoto"/);
      expect(fuente).not.toMatch(/:src="[^"]*\|\|/);
      // Ni un `src="…"` estático (el `:src` enlazado es el de arriba).
      expect(fuente).not.toMatch(/(?<![:\w-])src="/);
    }
    expect(leer('src/constants/placeholder-image.ts')).toContain(
      'export const PLACEHOLDER_IMAGE'
    );
  });

  /**
   * Mudada en la fase E: `openEditService`, `confirmDeleteService` y
   * `handlePromotionAction` son ahora `editar`, `eliminar` y `promocionar` del
   * composable, y la página los cablea a los controles de la dueña.
   */
  it('conserva los manejadores de administración', () => {
    expect(ADMIN).toContain('return { editar, promocionar, eliminar };');
    expect(PAGINA).toContain('@editar="admin.editar"');
    expect(PAGINA).toContain('@promocion="admin.promocionar"');
    expect(PAGINA).toContain('@eliminar="admin.eliminar"');
  });
});
