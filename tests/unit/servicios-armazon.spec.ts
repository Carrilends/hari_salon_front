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

  it('sigue atendiendo el atajo del inicio, y sigue abriendo el diálogo', () => {
    // El carril de la fase C es quien deja de abrirlo en escritorio.
    expect(PAGINA).toContain('applyShortcutFromIndex');
    expect(PAGINA).toMatch(
      /function applyShortcutFromIndex[\s\S]*?showFilterDialog\.value = true;/
    );
  });

  it('sigue usando la tarjeta y el diálogo de filtros de siempre', () => {
    // Las sustituyen las fases B y C, no esta.
    expect(PAGINA).toContain('TabsByEachService');
    expect(PAGINA).toContain('ServiceFilterDialog');
  });

  it('sigue publicando su SEO y sus datos estructurados', () => {
    expect(PAGINA).toContain('useSeo(');
    expect(PAGINA).toContain('servicesSchema');
  });

  it('nunca sirve una imagen de Cloudinary sin optimizar', () => {
    expect(PAGINA).toContain('optimizeCloudinaryUrl');
    expect(PAGINA).toContain('buildCloudinarySrcset');
    expect(PAGINA).toContain('PLACEHOLDER_IMAGE');
  });

  it('conserva los manejadores de administración', () => {
    expect(PAGINA).toContain('openEditService');
    expect(PAGINA).toContain('confirmDeleteService');
    expect(PAGINA).toContain('handlePromotionAction');
  });
});
