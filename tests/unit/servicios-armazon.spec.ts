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
  it('desplaza la página, no una caja de dentro', () => {
    // D4: fuera el scroll interno y la altura calculada.
    expect(PAGINA).not.toContain('q-scroll-area');
    expect(PAGINA).not.toContain('desktopScrollBodyPx');
    expect(PAGINA).not.toContain('thumbStyle');
    expect(PAGINA).not.toContain('windowHeight');
  });

  it('se quitó la caja gris con sombra lila', () => {
    expect(PAGINA).not.toContain('box-style');
  });

  it('va sobre tinta, con los márgenes de banda', () => {
    expect(PAGINA).toMatch(/background: var\(--m-tinta\);/);
    expect(PAGINA).toMatch(/color: var\(--m-hueso\);/);
    expect(PAGINA).toContain('var(--m-banda-margen)');
    expect(PAGINA).toContain('var(--m-banda-margen-movil)');
  });

  it('enciende el riel dorado al entrar y lo apaga al salir', () => {
    expect(PAGINA).toContain("classList.add('m-riel-oro')");
    expect(PAGINA).toContain("classList.remove('m-riel-oro')");
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
  it('sigue sincronizando la bolsa cuando un servicio cambia', () => {
    expect(PAGINA).toContain('bookStore.syncBookingWithService(fresh)');
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

  it('conserva los manejadores de administración', () => {
    expect(PAGINA).toContain('openEditService');
    expect(PAGINA).toContain('confirmDeleteService');
    expect(PAGINA).toContain('handlePromotionAction');
  });
});
