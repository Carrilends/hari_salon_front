/**
 * Contratos de la fase B que no se pueden comprobar montando.
 *
 * El CSS está mockeado en las pruebas (`tests/styleMock.js`), así que la regla
 * «ningún color fuera de `var(--m-*)`» se vigila leyendo la fuente. Y las dos
 * reglas de §6 de la hoja de ruta que una remodelación descuidada se lleva por
 * delante —la llamada que sincroniza la bolsa y el scroll interno— se vigilan
 * igual.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ = join(__dirname, '../..');
const SERVICE_PAGE = readFileSync(
  join(RAIZ, 'src/pages/ServicePage.vue'),
  'utf8'
);

const NUEVOS = [
  'src/components/servicePage/ServiceCard.vue',
  'src/components/servicePage/ServiceRow.vue',
  'src/components/servicePage/ServiceCardsGrid.vue',
  'src/components/servicePage/ServiceListSkeleton.vue',
  'src/components/servicePage/ServiceListEmpty.vue',
  'src/components/servicePage/ServiceListError.vue',
];

/** Todo el código donde podría quedar una referencia a la tarjeta vieja. */
function fuentes(dir: string, acumulado: string[] = []): string[] {
  for (const entrada of readdirSync(dir, { withFileTypes: true })) {
    const ruta = join(dir, entrada.name);
    if (entrada.isDirectory()) fuentes(ruta, acumulado);
    else if (/\.(vue|ts|js|scss)$/.test(entrada.name))
      acumulado.push(readFileSync(ruta, 'utf8'));
  }
  return acumulado;
}

describe('los componentes nuevos de la lista de servicios', () => {
  it('no traen un solo hexadecimal de color', () => {
    for (const archivo of NUEVOS) {
      const texto = readFileSync(join(RAIZ, archivo), 'utf8');
      const estilos = texto.slice(texto.indexOf('<style'));

      expect({ archivo, hex: estilos.match(/#[0-9a-fA-F]{3,8}\b/g) }).toEqual({
        archivo,
        hex: null,
      });
    }
  });

  /**
   * NF06: Safari 13.1 y 14.0 no conocen `inset` (llegó en 14.1). Ahí la regla
   * se descarta entera y el velo, el «Sin foto» y el botón estirado se quedan
   * sin tamaño: la tarjeta deja de abrir el detalle. Los cuatro lados, a mano.
   */
  it('ninguno usa `inset`, que Safari 13.1 y 14.0 descartan', () => {
    const dir = join(RAIZ, 'src/components/servicePage');
    const vues = readdirSync(dir).filter((nombre) => nombre.endsWith('.vue'));

    expect(vues.length).toBeGreaterThan(0);
    for (const nombre of vues) {
      const texto = readFileSync(join(dir, nombre), 'utf8');
      const estilos = texto.slice(texto.indexOf('<style'));

      expect({ nombre, inset: estilos.match(/\binset\s*:/g) }).toEqual({
        nombre,
        inset: null,
      });
    }
  });

  it('todos existen: la rejilla no apunta a un componente que no está', () => {
    for (const archivo of NUEVOS) {
      expect(existsSync(join(RAIZ, archivo))).toBe(true);
    }
  });
});

describe('la página de servicios', () => {
  it('pinta la lista con la rejilla nueva', () => {
    // La etiqueta, no el nombre: un comentario que la mencione no basta.
    expect(SERVICE_PAGE).toContain('<ServiceCardsGrid');
  });

  it('ya no usa la tarjeta vieja, y nadie más la nombra', () => {
    const codigo = fuentes(join(RAIZ, 'src')).join('\n');

    expect(codigo).not.toContain('TabsByEachService');
    expect(
      existsSync(join(RAIZ, 'src/components/servicePage/TabsByEachService.vue'))
    ).toBe(false);
  });

  /**
   * §6.1: al cambiar un servicio hay que avisar a la bolsa, o una reserva en
   * curso se queda con el precio viejo.
   */
  it('sigue sincronizando la bolsa cuando cambia un servicio', () => {
    // Mudada en la fase E: la llamada se fue con los manejadores al composable
    // de administración, y la página lo sigue usando.
    expect(
      readFileSync(
        join(RAIZ, 'src/composables/services/useServiceAdminActions.ts'),
        'utf8'
      )
    ).toContain('bookStore.syncBookingWithService(');
    expect(SERVICE_PAGE).toContain('useServiceAdminActions({');
  });

  /**
   * Mudada el 2026-10-07: antes «D4: la página entera desplaza; fuera el scroll
   * dentro de la lista». Ahora la lista es la que desplaza, pero con scroll
   * nativo: ni `q-scroll-area` ni la altura calculada a mano vuelven.
   */
  it('la lista desplaza por dentro con scroll nativo, sin q-scroll-area', () => {
    expect(SERVICE_PAGE).not.toContain('q-scroll-area');
    expect(SERVICE_PAGE).not.toContain('desktopScrollBodyPx');
    expect(SERVICE_PAGE).toMatch(/\.mostrador__lista \{[^}]*overflow-y: auto;/);
  });

  /**
   * §6.3: la recarga se señala sin volver al esqueleto. Si esto se escribiera
   * `:cargando="isFetching"`, la lista parpadearía entera en cada página.
   */
  it('distingue la primera carga de la recarga', () => {
    expect(SERVICE_PAGE).toContain(':cargando="isLoading"');
    expect(SERVICE_PAGE).toContain(':recargando="recargandoLista"');
    expect(SERVICE_PAGE).toMatch(/isFetching\.value && !isLoading\.value/);
  });

  /**
   * D9: los cortes de ancho son de `useServiceViewport`. Renglones solo por
   * debajo de 501 px (`esListaMovil`); entre 501 y 759 px, una columna de
   * tarjetas, no de renglones.
   */
  it('toma columnas y renglones de los cortes de la fase A', () => {
    expect(SERVICE_PAGE).toContain(':columnas="columnas"');
    expect(SERVICE_PAGE).toContain(':renglones="esListaMovil"');
    expect(SERVICE_PAGE).toMatch(
      /const \{[^}]*\bcolumnas\b[^}]*\} = useServiceViewport\(\)/
    );
  });
});
