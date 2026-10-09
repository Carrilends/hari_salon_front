/**
 * «Realce y hundido»: la respuesta global de los botones al pasar y al pulsar.
 *
 * Luis: «muchos botones al hacer hover y click no retroalimentan, parece que
 * clico sobre papel». La respuesta se reparte en dos sitios a propósito:
 *
 * - `app.scss` da el MOVIMIENTO a todo `<button>` (y a los `<a class="m-boton">`):
 *   sube 1 px con una sombra muy suave al pasar —solo con puntero fino—, se
 *   hunde a 0,96 al pulsar —con cualquier puntero— y vuelve con un rebote corto.
 * - Cada componente da el COLOR, porque el «aclarado hacia el oro» depende de
 *   cómo es cada botón: borde → `--m-oro`, oro macizo → `--m-oro-claro`, tinta
 *   maciza → rótulo en `--m-oro`, texto sobre hueso → `--m-oro-profundo`.
 *
 * Las excepciones también se vigilan: los botones estirados sobre una tarjeta
 * no se mueven (la respuesta va en la tarjeta, a 0,99), y los `q-btn` de Quasar
 * solo se hunden.
 *
 * El CSS está mockeado en Jest: todo se afirma leyendo la fuente.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { mount } from '@vue/test-utils';
import ServiceCard from 'src/components/servicePage/ServiceCard.vue';
import ServiceRow from 'src/components/servicePage/ServiceRow.vue';
import { servicio } from './fixtures/servicios';

const leer = (ruta: string) =>
  readFileSync(join(__dirname, '../../src', ruta), 'utf8');

const APP = leer('css/app.scss');
const TOKENS = leer('css/tokens.scss');

const valorDe = (token: string) =>
  TOKENS.match(new RegExp(`--${token}:\\s*([^;]+);`))?.[1]?.trim() ?? '';

/** El bloque de `app.scss` que va de «Realce y hundido» al siguiente comentario de sección. */
const REALCE = (() => {
  const desde = APP.lastIndexOf('/**', APP.indexOf('Realce y hundido'));
  const hasta = APP.indexOf('/**', APP.indexOf('*/', desde) + 2);
  return APP.slice(desde, hasta === -1 ? undefined : hasta);
})();

/** El CSS sin comentarios: un `;` o una llave dentro de uno partiría las reglas. */
const sinComentarios = (css: string) =>
  css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/** Cuerpos de las reglas (anidadas o no) cuyo selector casa con `patron`. */
const cuerposDe = (css: string, patron: RegExp) =>
  [...sinComentarios(css).matchAll(/([^{};]+)\{([^{}]*)\}/g)]
    .filter((r) => patron.test(r[1]))
    .map((r) => r[2])
    .join('\n');

describe('los tokens del movimiento', () => {
  it('la duración del pulsado es corta', () => {
    expect(valorDe('m-transicion-pulsar')).toBe('150ms');
  });

  /**
   * El rebote: el segundo punto de control pasa de 1 —por eso rebota— pero poco.
   * Con 1,4 la escala de 0,96 → 1 se pasa a ~1,003: se siente, no se ve.
   */
  it('la curva rebota, pero sin pasarse de forma llamativa', () => {
    const curva = valorDe('m-curva-pulsar');
    const [, , y1] =
      curva.match(/cubic-bezier\(([\d.]+),\s*([\d.]+),/) ?? [];
    const puntos = curva.match(/cubic-bezier\(([^)]+)\)/)?.[1].split(',');

    expect(puntos).toHaveLength(4);
    expect(Number(y1)).toBeGreaterThan(1);
    expect(Number(y1)).toBeLessThanOrEqual(1.6);
  });

  it('la sombra del realce usa los canales de la tinta, y es suave', () => {
    expect(valorDe('m-sombra-realce')).toMatch(/rgba\(22, 19, 15, 0\.1\d\)/);
  });

  it('el oro claro anota su contraste y que no es texto sobre hueso', () => {
    const [, comentario] =
      TOKENS.match(/((?:\s*\/\/\/[^\n]*\n)+)\s*--m-oro-claro:/) ?? [];

    expect(valorDe('m-oro-claro')).toMatch(/^#[0-9a-f]{6}$/);
    expect(comentario).toMatch(/7,8:1/);
    expect(comentario).toMatch(/no es color de texto/i);
  });

  it('el verde realzado de WhatsApp sigue llevando texto oscuro', () => {
    const [, comentario] =
      TOKENS.match(/((?:\s*\/\/\/[^\n]*\n)+)\s*--m-whatsapp-realce:/) ?? [];

    expect(comentario).toMatch(/8,5:1/);
  });
});

describe('la regla global · app.scss', () => {
  it('todo botón anima transform, sombra, borde, fondo y color con los tokens', () => {
    const cuerpo = cuerposDe(REALCE, /^\s*button,\s*\n?\s*\.m-boton\s*$/);

    expect(cuerpo).toMatch(
      /transform var\(--m-transicion-pulsar\) var\(--m-curva-pulsar\)/
    );
    for (const propiedad of [
      'box-shadow',
      'border-color',
      'background-color',
      'color',
    ]) {
      expect(cuerpo).toMatch(
        new RegExp(`(^|[\\s,])${propiedad} var\\(--m-transicion-pulsar\\)`)
      );
    }
  });

  it('al pasar sube 1 px con la sombra suave, y solo con puntero fino', () => {
    const fino = REALCE.slice(
      REALCE.indexOf('@media (hover: hover) and (pointer: fine)')
    );
    const bloque = fino.slice(0, fino.indexOf('\n}\n'));

    expect(bloque).toMatch(
      /button:hover,\s*\.m-boton:hover\s*\{[^}]*transform: translateY\(-1px\);[^}]*box-shadow: var\(--m-sombra-realce\);/
    );
  });

  it('al pulsar se hunde a 0,96 con cualquier puntero', () => {
    // Fuera de la consulta de puntero: una pantalla táctil también pulsa.
    expect(REALCE).toMatch(
      /^button:active,\s*\.m-boton:active\s*\{[^}]*transform: scale\(0\.96\);/m
    );
  });

  it('un botón deshabilitado ni sube ni se hunde', () => {
    expect(cuerposDe(REALCE, /^\s*button:disabled\s*$/)).toMatch(
      /transform: none;[\s\S]*box-shadow: none;/
    );
  });

  it('los q-btn de Quasar solo se hunden: ni suben ni se sombrean', () => {
    expect(cuerposDe(REALCE, /button\.q-btn:hover/)).toMatch(
      /transform: none;[\s\S]*box-shadow: none;/
    );
  });

  it('los botones estirados sobre una tarjeta no se mueven nunca', () => {
    expect(cuerposDe(REALCE, /button\.m-boton-estirado/)).toMatch(
      /transform: none;[\s\S]*box-shadow: none;/
    );
  });

  it('los botones de puro texto suben sin sombra (una caja sombreada alrededor de una palabra)', () => {
    expect(cuerposDe(REALCE, /button\.m-boton-plano/)).toMatch(
      /box-shadow: none;/
    );
  });

  it('la tarjeta pulsable se hunde a 0,99, sin subir', () => {
    expect(cuerposDe(REALCE, /\.m-tarjeta-pulsable:active/)).toMatch(
      /transform: scale\(0\.99\);/
    );
    expect(cuerposDe(REALCE, /button\.m-tarjeta-pulsable:hover/)).toMatch(
      /transform: none;/
    );
  });

  it('con movimiento reducido no hay transform, pero sí color y sombra', () => {
    const reducido = REALCE.slice(
      REALCE.indexOf('@media (prefers-reduced-motion: reduce)')
    );
    const bloque = reducido.slice(0, reducido.indexOf('\n}\n'));

    expect(bloque).toMatch(/button:hover/);
    expect(bloque).toMatch(/button:active/);
    expect(bloque).toMatch(/\.m-tarjeta-pulsable:active/);
    expect(bloque).toMatch(/transform: none;/);
    expect(bloque).not.toMatch(/box-shadow: none/);
    expect(bloque).not.toMatch(/transition: none/);
  });

  /** Que nada cambie de caja al pasar o pulsar: solo `transform`. */
  it('ni la regla global ni sus excepciones cambian medidas de caja', () => {
    expect(REALCE).not.toMatch(
      /(^|\s)(width|height|padding|margin|border-width|border):/m
    );
  });

  it('Safari 13.1: ni `:has()` ni `inset` ni `:where()`', () => {
    expect(REALCE).not.toMatch(/:has\(|:where\(|\binset:/);
  });

  it('no toca el foco de teclado', () => {
    expect(REALCE).not.toMatch(/focus-visible|outline/);
  });
});

describe('los botones estirados de la tarjeta y el renglón', () => {
  it('la tarjeta es pulsable y su botón estirado se queda quieto', () => {
    const tarjeta = mount(ServiceCard, { props: { servicio: servicio() } });

    expect(tarjeta.get('[data-test="tarjeta"]').classes()).toContain(
      'm-tarjeta-pulsable'
    );
    expect(tarjeta.get('[data-test="tarjeta-enlace"]').classes()).toContain(
      'm-boton-estirado'
    );
  });

  it('el renglón es pulsable y su botón estirado se queda quieto', () => {
    const fila = mount(ServiceRow, { props: { servicio: servicio() } });

    expect(fila.get('[data-test="fila"]').classes()).toContain(
      'm-tarjeta-pulsable'
    );
    expect(fila.get('[data-test="fila-enlace"]').classes()).toContain(
      'm-boton-estirado'
    );
  });

  it('en hover, el borde de la tarjeta y del renglón se realza a oro', () => {
    expect(
      cuerposDe(leer('components/servicePage/ServiceCard.vue'), /\.tarjeta-servicio:hover\s*,/)
    ).toMatch(/border-color: var\(--m-oro\);/);
    expect(
      cuerposDe(leer('components/servicePage/ServiceRow.vue'), /\.fila-servicio:hover\s*,/)
    ).toMatch(/border-color: var\(--m-oro\);/);
  });
});

/**
 * El repaso, botón por botón, de las piezas remodeladas. Cada uno tiene que
 * cambiar de color al pasar —con un token—, dentro de la consulta de puntero
 * fino. `claro` marca los botones cuya PROPIA superficie es hueso, nieve o
 * transparente sobre claro: ahí el oro claro NO es color de texto (2,8:1). Un
 * botón tinta macizo dentro de una zona clara no es `claro`: su rótulo se lee
 * sobre la tinta, donde el oro da 5,8:1.
 */
type Boton = { archivo: string; clase: string; claro?: boolean };

const BOTONES: Boton[] = [
  // Página de servicios: barra, paginador, carril, chips, estados.
  { archivo: 'components/servicePage/ServiceToolbar.vue', clase: 'barra__boton' },
  { archivo: 'components/servicePage/ServiceToolbar.vue', clase: 'barra__boton--oro' },
  { archivo: 'components/servicePage/ServiceToolbar.vue', clase: 'barra__redondo' },
  { archivo: 'components/servicePage/ServicePagerBar.vue', clase: 'pie__numero' },
  { archivo: 'components/servicePage/ServicePagerBar.vue', clase: 'pie__numero--activa' },
  { archivo: 'components/servicePage/ServicePagerBar.vue', clase: 'pie__siguiente' },
  { archivo: 'components/servicePage/ServiceFilterRail.vue', clase: 'carril__limpiar' },
  { archivo: 'components/servicePage/ServiceFilterFields.vue', clase: 'campos__chip' },
  { archivo: 'components/servicePage/ServiceFilterFields.vue', clase: 'campos__chip--activo' },
  { archivo: 'components/servicePage/ServiceListEmpty.vue', clase: 'vacio-servicios__limpiar' },
  { archivo: 'components/servicePage/ServiceListError.vue', clase: 'error-lista__reintentar' },
  { archivo: 'components/servicePage/ServiceCardAdminActions.vue', clase: 'acciones-admin__boton' },
  { archivo: 'components/servicePage/ServiceCardAdminActions.vue', clase: 'acciones-admin__boton--oro' },
  // Hoja de filtros (móvil) y caja de etiquetas.
  { archivo: 'components/dialogs/serviceFilterDialog.vue', clase: 'hoja__cerrar' },
  { archivo: 'components/dialogs/serviceFilterDialog.vue', clase: 'hoja__limpiar' },
  { archivo: 'components/dialogs/serviceFilterDialog.vue', clase: 'hoja__ver' },
  { archivo: 'components/shared/ServicesBox.vue', clase: 'caja__chip' },
  { archivo: 'components/shared/ServicesBox.vue', clase: 'caja__chip--activo' },
  { archivo: 'components/shared/ServicesBox.vue', clase: 'caja__limpiar' },
  // Ficha.
  { archivo: 'components/dialogs/serviceDialog.vue', clase: 'ficha__cerrar' },
  { archivo: 'components/dialogs/serviceDialog.vue', clase: 'ficha__miniatura' },
  { archivo: 'components/dialogs/serviceDialog.vue', clase: 'ficha__miniatura--elegida' },
  { archivo: 'components/dialogs/serviceDialog.vue', clase: 'ficha__anadir' },
  { archivo: 'components/dialogs/serviceDialog.vue', clase: 'ficha__cerrar-pie' },
  // Diálogos de la dueña: promoción, borrado, alta/edición.
  { archivo: 'components/dialogs/ServicePromotionDialog.vue', clase: 'promo__boton', claro: true },
  { archivo: 'components/dialogs/ServicePromotionDialog.vue', clase: 'promo__boton--oro', claro: true },
  { archivo: 'components/dialogs/ServiceDeleteDialog.vue', clase: 'borrado__boton', claro: true },
  { archivo: 'components/dialogs/ServiceDeleteDialog.vue', clase: 'borrado__boton--peligro', claro: true },
  { archivo: 'components/dialogs/serviceCreateEdit.vue', clase: 'paso__boton', claro: true },
  { archivo: 'components/dialogs/serviceCreateEdit.vue', clase: 'paso__boton--oro', claro: true },
  { archivo: 'components/dialogs/serviceCreateEdit.vue', clase: 'paso__boton-foto', claro: true },
  { archivo: 'components/dialogs/serviceCreateEdit.vue', clase: 'paso__quitar-foto', claro: true },
  // Cabecera del portal y bandas del inicio.
  { archivo: 'layouts/MainLayout.vue', clase: 'main-header__link', claro: true },
  { archivo: 'layouts/MainLayout.vue', clase: 'main-header__cta' },
  { archivo: 'components/index/HeroBand.vue', clase: 'hero-band__enlace', claro: true },
  { archivo: 'components/index/CatalogBand.vue', clase: 'catalog-band__ver-todo' },
  { archivo: 'components/index/CatalogBand.vue', clase: 'catalog-band__seccion' },
  { archivo: 'components/index/ReviewAssistantBand.vue', clase: 'review-band__dejar', claro: true },
  { archivo: 'components/index/ReviewAssistantBand.vue', clase: 'review-band__chip', claro: true },
  { archivo: 'components/index/ReviewAssistantBand.vue', clase: 'review-band__chip--solido' },
  { archivo: 'components/index/SiteFooterBand.vue', clase: 'footer-band__admin' },
  { archivo: 'components/index/SiteFooterBand.vue', clase: 'footer-band__whatsapp' },
  { archivo: 'components/index/MobileActionBar.vue', clase: 'mobile-bar__reservar' },
  { archivo: 'components/index/MobileActionBar.vue', clase: 'mobile-bar__whatsapp' },
  // Panel del asistente.
  { archivo: 'components/assistant/AssistantLauncher.vue', clase: 'assistant-launcher__fab' },
  { archivo: 'components/assistant/AssistantPanel.vue', clase: 'assistant-panel__volver' },
  { archivo: 'components/assistant/AssistantComposer.vue', clase: 'assistant-composer__chip', claro: true },
  { archivo: 'components/assistant/AssistantComposer.vue', clase: 'assistant-composer__enviar' },
  { archivo: 'components/assistant/ServiceListCard.vue', clase: 'service-card__anadir' },
  { archivo: 'components/assistant/PackageProposalCard.vue', clase: 'package-card__anadir' },
  // Menú «Más»: las filas, el pie y los dos botones de la cuenta.
  { archivo: 'components/shared/MenuMasContenido.vue', clase: 'menu-mas__entrada', claro: true },
  { archivo: 'components/shared/MenuMasContenido.vue', clase: 'menu-mas__entrada--pie', claro: true },
  { archivo: 'components/shared/MenuMasContenido.vue', clase: 'menu-mas__boton--macizo' },
  { archivo: 'components/shared/MenuMasContenido.vue', clase: 'menu-mas__boton--contorno', claro: true },
  { archivo: 'components/shared/MenuMasHoja.vue', clase: 'menu-hoja__cerrar', claro: true },
  // Acceso: botón común, secundario, enlace y la X del armazón; el ojo; el diálogo de Google.
  { archivo: 'auth/layouts/AuthLayout.vue', clase: 'acceso-boton' },
  { archivo: 'auth/layouts/AuthLayout.vue', clase: 'acceso-secundario', claro: true },
  { archivo: 'auth/layouts/AuthLayout.vue', clase: 'acceso-enlace', claro: true },
  { archivo: 'auth/layouts/AuthLayout.vue', clase: 'acceso__cerrar', claro: true },
  { archivo: 'components/auth/CampoAcceso.vue', clase: 'campo-acceso__ojo', claro: true },
  { archivo: 'components/auth/ConsentimientoGoogle.vue', clase: 'consentimiento__boton', claro: true },
  { archivo: 'components/auth/ConsentimientoGoogle.vue', clase: 'consentimiento__boton--macizo' },
];

/** El bloque de estilos de un SFC dentro de las consultas de puntero fino. */
const bloquesFinos = (archivo: string) => {
  const fuente = leer(archivo);
  const estilos = fuente.slice(fuente.indexOf('<style'));
  const bloques: string[] = [];
  let desde = estilos.indexOf('@media (hover: hover) and (pointer: fine)');
  while (desde !== -1) {
    // Equilibra llaves: el bloque acaba donde se cierra la de la consulta.
    let nivel = 0;
    let i = estilos.indexOf('{', desde);
    const inicio = i;
    for (; i < estilos.length; i += 1) {
      if (estilos[i] === '{') nivel += 1;
      if (estilos[i] === '}') nivel -= 1;
      if (nivel === 0) break;
    }
    bloques.push(estilos.slice(inicio, i + 1));
    desde = estilos.indexOf('@media (hover: hover) and (pointer: fine)', i);
  }
  return bloques.join('\n');
};

describe('cada botón remodelado cambia de color al pasar', () => {
  it.each(BOTONES)('$clase ($archivo)', ({ archivo, clase, claro }) => {
    const finos = bloquesFinos(archivo);
    // El selector nombra la clase exacta (no un prefijo suyo) y lleva `:hover`.
    const patron = new RegExp(`\\.${clase}(?![\\w-])[^,{]*:hover`);
    const cuerpo = cuerposDe(finos, patron);

    expect(cuerpo).toMatch(
      /(^|\s)(color|border-color|border-bottom-color|background|background-color): var\(--m-[\w-]+\);/
    );
    if (claro) {
      // El oro claro no es color de texto sobre hueso ni sobre nieve.
      expect(cuerpo).not.toMatch(/(^|\s)color: var\(--m-oro\);/);
    }
  });
});

describe('las piezas que ya tenían su propio realce, unificadas', () => {
  /**
   * `ServiceCardAdminActions` subía 1 px por su cuenta, con su propia
   * transición. Ahora el movimiento es el global; la pieza solo pone el color.
   */
  it('las acciones de la dueña no duplican el movimiento', () => {
    const fuente = leer('components/servicePage/ServiceCardAdminActions.vue');
    const estilos = fuente.slice(fuente.indexOf('<style'));

    expect(estilos).not.toMatch(/translateY/);
    expect(estilos).not.toMatch(/(^|\s)transition:/m);
  });
});

describe('los enlaces con aspecto de botón', () => {
  it.each([
    ['components/index/SiteFooterBand.vue', 'footer-band__whatsapp'],
    ['components/index/MobileActionBar.vue', 'mobile-bar__whatsapp'],
  ])('%s lleva la clase común m-boton', (archivo, clase) => {
    const plantilla = leer(archivo).split('<script')[0];

    expect(plantilla).toMatch(new RegExp(`class="${clase} m-boton"`));
  });
});

/**
 * Revisión de código, 2026-10-07: cinco ajustes de cascada y de puntería.
 */
describe('la revisión · la cascada de Quasar', () => {
  /**
   * Una pulsación siempre es también un `:hover` (y en táctil el `:hover` se
   * queda pegado). La excepción `button.q-btn:hover` (0,2,1) ganaba a
   * `button:active` (0,1,1): «Reservar» y «Más» no se hundían nunca.
   */
  it('los q-btn se hunden: su `:active` va después de su excepción de `:hover`', () => {
    const limpio = sinComentarios(REALCE);
    const excepcion = limpio.search(/button\.q-btn:hover\s*\{/);
    const pulsado = limpio.search(/button\.q-btn:active\s*\{/);

    expect(excepcion).toBeGreaterThan(-1);
    expect(pulsado).toBeGreaterThan(excepcion);
    expect(cuerposDe(REALCE, /^\s*button\.q-btn:active\s*$/)).toMatch(
      /transform: scale\(0\.96\);/
    );
  });

  it('con movimiento reducido, tampoco se hunden los q-btn', () => {
    const reducido = REALCE.slice(
      REALCE.indexOf('@media (prefers-reduced-motion: reduce)')
    );
    const bloque = reducido.slice(0, reducido.indexOf('\n}\n'));

    expect(bloque).toMatch(/button\.q-btn:active/);
  });
});

describe('la revisión · los botones anchos no encogen al pulsar', () => {
  /**
   * `scale(0.96)` encoge hacia el centro: un `mousedown` en el borde de un botón
   * ancho y el `mouseup` 100 ms después cae en el padre, y el navegador manda el
   * `click` al antepasado común — el `@click` del botón no corre. En un botón de
   * 340 px son ~7 px muertos por lado. Los anchos se hunden 1 px hacia abajo.
   */
  it('un botón ancho se hunde 1 px en vez de encoger', () => {
    const limpio = sinComentarios(REALCE);

    expect(cuerposDe(REALCE, /button\.m-boton--ancho:active/)).toMatch(
      /transform: translateY\(1px\);/
    );
    // Después de la regla general, para ganarle por orden además de por peso.
    expect(limpio.search(/button\.m-boton--ancho:active/)).toBeGreaterThan(
      limpio.search(/^button:active/m)
    );
  });

  it('con movimiento reducido, tampoco se hunden los anchos', () => {
    const reducido = REALCE.slice(
      REALCE.indexOf('@media (prefers-reduced-motion: reduce)')
    );
    const bloque = reducido.slice(0, reducido.indexOf('\n}\n'));

    expect(bloque).toMatch(/button\.m-boton--ancho:active/);
  });

  it.each([
    ['components/dialogs/serviceDialog.vue', 'ficha__anadir'],
    ['components/dialogs/serviceFilterDialog.vue', 'hoja__ver'],
    ['components/dialogs/serviceCreateEdit.vue', 'paso__boton'],
    ['components/dialogs/serviceCreateEdit.vue', 'paso__boton-foto'],
    ['components/servicePage/ServiceListError.vue', 'error-lista__reintentar'],
    ['components/index/MobileActionBar.vue', 'mobile-bar__reservar'],
    ['components/dialogs/ServiceDeleteDialog.vue', 'borrado__boton--peligro'],
    ['components/dialogs/ServicePromotionDialog.vue', 'promo__boton--oro'],
    ['components/assistant/PackageProposalCard.vue', 'package-card__anadir'],
    ['components/shared/MenuMasContenido.vue', 'menu-mas__entrada'],
    ['components/auth/ConsentimientoGoogle.vue', 'consentimiento__boton'],
  ])('%s · %s lleva m-boton--ancho', (archivo, clase) => {
    const plantilla = leer(archivo).split('<script')[0];
    const clases = [...plantilla.matchAll(/\sclass="([^"]*)"/g)]
      .map((c) => c[1].split(/\s+/))
      .filter((lista) => lista.includes(clase));

    expect(clases.length).toBeGreaterThan(0);
    for (const lista of clases) {
      expect(lista).toContain('m-boton--ancho');
    }
  });

  /**
   * La tarjeta se queda en 0,99 a propósito (lo pidió Luis): el botón estirado
   * encoge CON ella, así que dentro de la tarjeta no hay banda muerta. Fuera,
   * la banda es ~1,3 px por lado en una tarjeta de 282 px —el grosor de su
   * filete—.
   */
  it('la tarjeta pulsable sigue en 0,99', () => {
    expect(cuerposDe(REALCE, /\.m-tarjeta-pulsable:active/)).toMatch(
      /transform: scale\(0\.99\);/
    );
  });
});

describe('la revisión · los contadores se mueven con su botón', () => {
  it('el contador de filtros va dentro del botón de filtros', () => {
    const plantilla = leer('components/servicePage/ServiceToolbar.vue').split(
      '<script'
    )[0];
    const desde = plantilla.indexOf('data-test="boton-filtros"');
    const boton = plantilla.slice(desde, plantilla.indexOf('</button>', desde));

    expect(boton).toContain('data-test="contador-filtros"');
  });

  it('el botón de filtros posiciona su contador', () => {
    expect(
      cuerposDe(leer('components/servicePage/ServiceToolbar.vue'), /^\s*\.barra__boton\s*$/)
    ).toMatch(/position: relative;/);
  });

  it('la cuenta de la bolsa va dentro de «Reservar»', () => {
    const plantilla = leer('layouts/MainLayout.vue').split('<script')[0];
    const desde = plantilla.indexOf('class="main-header__cta"');
    const boton = plantilla.slice(desde, plantilla.indexOf('</q-btn>', desde));

    expect(boton).toContain('<q-badge');
  });
});

describe('la revisión · iOS Safari y el `:active` táctil', () => {
  it('el arranque `main` activa el `:active` táctil', () => {
    const arranque = leer('boot/main.ts');

    expect(arranque).toMatch(/activarActiveTactil\(/);
  });
});

/**
 * Plan 1 de las vistas: los botones del cajón de reserva. Mismo repaso que
 * `BOTONES`: color al pasar con un token, dentro del puntero fino; los
 * `claro` (superficie hueso, nieve o transparente sobre claro) nunca en oro
 * claro. Y los anchos, con `m-boton--ancho`.
 */
const BOTONES_RESERVA: Boton[] = [
  { archivo: 'components/reserva/CajonReserva.vue', clase: 'cajon__cerrar' },
  { archivo: 'components/reserva/CajonReserva.vue', clase: 'cajon__atras', claro: true },
  { archivo: 'components/reserva/CajonReserva.vue', clase: 'cajon__continuar' },
  { archivo: 'components/reserva/CajonReserva.vue', clase: 'cajon-enlace', claro: true },
  { archivo: 'components/reserva/TiraDeDias.vue', clase: 'tira__dia', claro: true },
  { archivo: 'components/reserva/TiraDeDias.vue', clase: 'tira__flecha', claro: true },
  { archivo: 'components/reserva/FichasDeHora.vue', clase: 'horas__ficha', claro: true },
  { archivo: 'components/reserva/FichasDeEstilista.vue', clase: 'estilistas__ficha', claro: true },
  { archivo: 'components/reserva/PasoServicios.vue', clase: 'bolsa__quitar', claro: true },
  { archivo: 'components/reserva/PasoServicios.vue', clase: 'bolsa__anadir', claro: true },
  { archivo: 'components/reserva/PasoServicios.vue', clase: 'bolsa__ver', claro: true },
  { archivo: 'components/reserva/PasoServicios.vue', clase: 'bolsa__asistente', claro: true },
  { archivo: 'components/reserva/PasoCuando.vue', clase: 'cuando__aviso-boton' },
  { archivo: 'components/reserva/PasoCuando.vue', clase: 'cuando__aviso-enlace', claro: true },
  { archivo: 'components/reserva/PasoCuando.vue', clase: 'cuando__reintentar', claro: true },
  { archivo: 'components/reserva/PantallaExito.vue', clase: 'exito__whatsapp' },
  { archivo: 'components/reserva/PantallaExito.vue', clase: 'exito__seguir', claro: true },
  { archivo: 'components/reserva/PantallaExito.vue', clase: 'exito__principal' },
];

describe('plan 1 · cada botón del cajón de reserva cambia de color al pasar', () => {
  it.each(BOTONES_RESERVA)('$clase ($archivo)', ({ archivo, clase, claro }) => {
    const finos = bloquesFinos(archivo);
    const patron = new RegExp(`\\.${clase}(?![\\w-])[^,{]*:hover`);
    const cuerpo = cuerposDe(finos, patron);

    expect(cuerpo).toMatch(
      /(^|\s)(color|border-color|border-bottom-color|background|background-color): var\(--m-[\w-]+\);/
    );
    if (claro) {
      expect(cuerpo).not.toMatch(/(^|\s)color: var\(--m-oro\);/);
    }
  });

  it.each([
    ['components/reserva/PasoServicios.vue', 'bolsa__ver'],
    ['components/reserva/PantallaExito.vue', 'exito__whatsapp'],
  ])('%s · %s lleva m-boton--ancho', (archivo, clase) => {
    const plantilla = leer(archivo).split('<script')[0];
    const clases = Array.from(plantilla.matchAll(/\sclass="([^"]*)"/g))
      .map((c) => c[1].split(/\s+/))
      .filter((lista) => lista.includes(clase));

    expect(clases.length).toBeGreaterThan(0);
    for (const lista of clases) {
      expect(lista).toContain('m-boton--ancho');
    }
  });

  it('el enlace verde de WhatsApp lleva la clase común m-boton', () => {
    const plantilla = leer('components/reserva/PantallaExito.vue').split(
      '<script'
    )[0];

    expect(plantilla).toMatch(/class="exito__whatsapp m-boton m-boton--ancho"/);
  });
});

/**
 * Revisión final del plan 1: los botones del cajón que son puro texto o un
 * icono sin fondo («← Atrás», «Cambiar», «Entra», «Reintentar», la X…) suben
 * sin sombra, como el resto del portal: la sombra dibujaría una caja
 * alrededor de una palabra.
 */
describe('plan 1 · los botones de puro texto del cajón llevan m-boton-plano', () => {
  it.each([
    ['components/reserva/CajonReserva.vue', 'cajon__cerrar'],
    ['components/reserva/CajonReserva.vue', 'cajon__atras'],
    ['components/reserva/PasoDatos.vue', 'cajon-enlace'],
    ['components/reserva/PasoServicios.vue', 'bolsa__quitar'],
    ['components/reserva/PasoServicios.vue', 'bolsa__anadir'],
    ['components/reserva/PasoServicios.vue', 'bolsa__asistente'],
    ['components/reserva/PasoCuando.vue', 'cuando__aviso-enlace'],
    ['components/reserva/PasoCuando.vue', 'cuando__reintentar'],
    ['components/reserva/TiraDeDias.vue', 'tira__flecha'],
    ['components/reserva/PantallaExito.vue', 'exito__seguir'],
  ])('%s · %s', (archivo, clase) => {
    // Solo los <button>: un <a> en línea no hereda el movimiento de app.scss.
    const plantilla = leer(archivo).split('<script')[0];
    const clases = (plantilla.match(/<button\b[^>]*>/g) ?? [])
      .map((boton) => /\sclass="([^"]*)"/.exec(boton)?.[1].split(/\s+/) ?? [])
      .filter((lista) => lista.includes(clase));

    expect(clases.length).toBeGreaterThan(0);
    for (const lista of clases) {
      expect(lista).toContain('m-boton-plano');
    }
  });
});

/**
 * Plan 2 de las vistas: «Mis reservas» (tarjeta, fila pasada, página y sus dos
 * diálogos). Mismo repaso que `BOTONES`: color al pasar con un token, dentro
 * del puntero fino; los `claro` nunca en oro claro.
 */
const BOTONES_MIS_RESERVAS: Boton[] = [
  { archivo: 'components/reservations/TarjetaReserva.vue', clase: 'tarjeta-reserva__cancelar', claro: true },
  { archivo: 'components/reservations/TarjetaReserva.vue', clase: 'tarjeta-reserva__mover', claro: true },
  { archivo: 'components/reservations/FilaPasada.vue', clase: 'fila-pasada__resena', claro: true },
  { archivo: 'pages/MyReservationsPage.vue', clase: 'mis-reservas__actualizar', claro: true },
  { archivo: 'pages/MyReservationsPage.vue', clase: 'mis-reservas__descartar', claro: true },
  { archivo: 'pages/MyReservationsPage.vue', clase: 'mis-reservas__reintentar', claro: true },
  { archivo: 'pages/MyReservationsPage.vue', clase: 'mis-reservas__plegar', claro: true },
  { archivo: 'components/reservations/CancelarReservaDialog.vue', clase: 'cancelar-reserva__confirmar', claro: true },
  { archivo: 'components/reservations/CancelarReservaDialog.vue', clase: 'cancelar-reserva__volver', claro: true },
  { archivo: 'components/reservations/CambiarFechaDialog.vue', clase: 'cambiar-fecha__cerrar' },
  { archivo: 'components/reservations/CambiarFechaDialog.vue', clase: 'cambiar-fecha__volver', claro: true },
  { archivo: 'components/reservations/CambiarFechaDialog.vue', clase: 'cambiar-fecha__reintentar', claro: true },
  { archivo: 'components/reservations/CambiarFechaDialog.vue', clase: 'cambiar-fecha__guardar' },
];

describe('plan 2 · cada botón de «Mis reservas» cambia de color al pasar', () => {
  it.each(BOTONES_MIS_RESERVAS)('$clase ($archivo)', ({ archivo, clase, claro }) => {
    const finos = bloquesFinos(archivo);
    const patron = new RegExp(`\\.${clase}(?![\\w-])[^,{]*:hover`);
    const cuerpo = cuerposDe(finos, patron);

    expect(cuerpo).toMatch(
      /(^|\s)(color|border-color|border-bottom-color|background|background-color): var\(--m-[\w-]+\);/
    );
    if (claro) {
      expect(cuerpo).not.toMatch(/(^|\s)color: var\(--m-oro\);/);
    }
  });

  it.each([
    ['components/reservations/CancelarReservaDialog.vue', 'cancelar-reserva__confirmar'],
    ['components/reservations/CancelarReservaDialog.vue', 'cancelar-reserva__volver'],
    ['pages/MyReservationsPage.vue', 'mis-reservas__plegar'],
  ])('%s · %s lleva m-boton--ancho', (archivo, clase) => {
    const plantilla = leer(archivo).split('<script')[0];
    const clases = Array.from(plantilla.matchAll(/\sclass="([^"]*)"/g))
      .map((c) => c[1].split(/\s+/))
      .filter((lista) => lista.includes(clase));

    expect(clases.length).toBeGreaterThan(0);
    for (const lista of clases) {
      expect(lista).toContain('m-boton--ancho');
    }
  });

  it.each([
    ['components/reservations/TarjetaReserva.vue', 'tarjeta-reserva__cancelar'],
    ['components/reservations/FilaPasada.vue', 'fila-pasada__resena'],
    ['components/reservations/CambiarFechaDialog.vue', 'cambiar-fecha__cerrar'],
    ['components/reservations/CambiarFechaDialog.vue', 'cambiar-fecha__volver'],
    ['pages/MyReservationsPage.vue', 'mis-reservas__descartar'],
    ['pages/MyReservationsPage.vue', 'mis-reservas__plegar'],
  ])('%s · %s (puro texto o icono) lleva m-boton-plano', (archivo, clase) => {
    const plantilla = leer(archivo).split('<script')[0];
    const clases = (plantilla.match(/<button\b[^>]*>/g) ?? [])
      .map((boton) => /\sclass="([^"]*)"/.exec(boton)?.[1].split(/\s+/) ?? [])
      .filter((lista) => lista.includes(clase));

    expect(clases.length).toBeGreaterThan(0);
    for (const lista of clases) {
      expect(lista).toContain('m-boton-plano');
    }
  });

  it.each([
    ['components/reservations/TarjetaReserva.vue', 'tarjeta-reserva__mover'],
    ['pages/MyReservationsPage.vue', 'mis-reservas__actualizar'],
    ['components/reservations/CancelarReservaDialog.vue', 'cancelar-reserva__volver'],
  ])('%s · %s (con borde o relleno) NO lleva m-boton-plano', (archivo, clase) => {
    const plantilla = leer(archivo).split('<script')[0];
    const clases = (plantilla.match(/<button\b[^>]*>/g) ?? [])
      .map((boton) => /\sclass="([^"]*)"/.exec(boton)?.[1].split(/\s+/) ?? [])
      .filter((lista) => lista.includes(clase));

    expect(clases.length).toBeGreaterThan(0);
    for (const lista of clases) {
      expect(lista).not.toContain('m-boton-plano');
    }
  });
});
