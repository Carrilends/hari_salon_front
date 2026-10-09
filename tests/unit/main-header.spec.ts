/**
 * Prueba de fuente: montar `MainLayout` entero exigiría media aplicación, y lo
 * que se vigila aquí es que el rótulo, las entradas y la pintura de la
 * cabecera sean los acordados. El contenido del menú «Más» se prueba montando
 * en `MenuMasContenido.spec.ts` y `MenuMasHoja.spec.ts`, y su regla de
 * visibilidad en `menuMas.spec.ts`.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createMemoryHistory, createRouter } from 'vue-router';
import routes from 'src/router/routes';

const LAYOUT = readFileSync(
  join(__dirname, '../../src/layouts/MainLayout.vue'),
  'utf8'
);
const PLANTILLA = LAYOUT.split('<script')[0];
const SCRIPT = LAYOUT.slice(
  LAYOUT.indexOf('<script setup'),
  LAYOUT.indexOf('</script>')
);
const ESTILO_SCOPED = LAYOUT.slice(
  LAYOUT.indexOf('<style scoped lang="scss">'),
  LAYOUT.indexOf('</style>')
);
const ESTILO_LIBRE = LAYOUT.slice(LAYOUT.indexOf('<style lang="scss">'));

/** El cuerpo de una función del script, de su firma a la siguiente función de primer nivel. */
const funcion = (firma: string) => {
  const desde = SCRIPT.indexOf(firma);
  const hasta = SCRIPT.indexOf('\nfunction ', desde + firma.length);
  const hastaAsync = SCRIPT.indexOf('\nasync function ', desde + firma.length);
  const fin = [hasta, hastaAsync, SCRIPT.length]
    .filter((i) => i > desde)
    .sort((a, b) => a - b)[0];
  return SCRIPT.slice(desde, fin);
};

/** El disparador de «Más»: del `<q-btn` que lleva su etiqueta hasta su `<q-menu`. */
const DISPARADOR = (() => {
  const i = PLANTILLA.indexOf('aria-label="Más opciones"');
  return PLANTILLA.slice(
    PLANTILLA.lastIndexOf('<q-btn', i),
    PLANTILLA.indexOf('<q-menu', i)
  );
})();

const MENU = PLANTILLA.slice(
  PLANTILLA.indexOf('<q-menu'),
  PLANTILLA.indexOf('</q-menu>')
);

describe('cabecera del portal', () => {
  it('ofrece un único botón de reserva, rotulado «Reservar»', () => {
    expect(LAYOUT).toContain('label="Reservar"');
    expect(LAYOUT).not.toContain("'Tus reservas'");
  });

  it('la cabecera se pinta con los tokens, no con hexadecimales sueltos', () => {
    const cabecera = LAYOUT.slice(
      LAYOUT.indexOf('<q-header'),
      LAYOUT.indexOf('</q-header>')
    );
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
    expect(LAYOUT).not.toContain('RUTAS_SIN_FAB_RESENA');
  });

  /**
   * Tampoco en `/services`: allí el pie con el paginador está siempre a la
   * vista y la burbuja, abajo a la izquierda, se le sentaba encima. Por `meta`
   * y no por `route.path`: Netlify sirve `/services/` con barra final.
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

  it('oculta el flotante del asistente en el inicio', () => {
    expect(LAYOUT).toContain(':mostrar-flotante="mostrarFlotanteAsistente"');

    const regla = LAYOUT.slice(
      LAYOUT.indexOf('const mostrarFlotanteAsistente')
    );
    expect(regla.slice(0, 160)).toContain("route.path !== '/'");
  });

  it('ya no quedan el degradado ni el icono morado de antes', () => {
    expect(LAYOUT).not.toContain('#5a4f77');
    expect(LAYOUT).not.toContain('linear-gradient(180deg, #fff9fc');
  });
});

describe('menú «Más» · el modelo', () => {
  /**
   * Movida: antes se buscaba «Mis estilistas» junto a `authStore.isAdmin` en
   * este archivo. La regla vive ahora en `menuMas.ts` (y la prueban los casos
   * «El salón, solo para la dueña» de `menuMas.spec.ts`); aquí se vigila que el
   * armazón le pase el estado de sesión del store y la ruta actual.
   */
  it('el menú se arma con seccionesDelMenu, con la sesión del store y la ruta actual', () => {
    expect(SCRIPT).toMatch(
      /seccionesDelMenu\(\{\s*isLoggedIn: authStore\.isLoggedIn,\s*isAdmin: authStore\.isAdmin,\s*redirect: route\.fullPath \|\| '\/services',?\s*\}\)/
    );
  });

  it('ya no lista entradas a mano: la visibilidad se escribe una sola vez', () => {
    expect(LAYOUT).not.toContain('moreMenuItems');
    expect(LAYOUT).not.toContain('Mis estilistas');
    expect(LAYOUT).not.toContain('visible: () =>');
    expect(LAYOUT).not.toContain('function onLogin');
  });
});

describe('menú «Más» · el disparador', () => {
  it('conserva su nombre y anuncia lo que abre (M8, M12)', () => {
    expect(DISPARADOR).toContain('aria-label="Más opciones"');
    expect(DISPARADOR).toContain('aria-haspopup="dialog"');
    expect(DISPARADOR).toContain(
      ":aria-expanded=\"menuAbierto || hojaAbierta ? 'true' : 'false'\""
    );
  });

  it('por debajo de 700 px es una hamburguesa (M6)', () => {
    expect(DISPARADOR).toMatch(/<StrokeIcon\s+v-if="esMovil"\s+nombre="menu"/);
  });

  it('desde 700 px, «Más» con un chevrón propio, y ya no el icono relleno de Material', () => {
    expect(DISPARADOR).toContain('main-header__chevron');
    expect(DISPARADOR).toContain('>Más<');
    expect(DISPARADOR).not.toContain('expand_more');
  });

  it('abierto se pinta en nieve con filete y el chevrón mira arriba (M6)', () => {
    expect(DISPARADOR).toContain("'main-header__mas--abierto': menuAbierto");
    expect(ESTILO_SCOPED).toMatch(
      /\.main-header__mas--abierto\s*\{[^}]*background: var\(--m-nieve\);[^}]*border-color: var\(--m-filete\);/
    );
    expect(ESTILO_SCOPED).toMatch(
      /\.main-header__mas--abierto \.main-header__chevron\s*\{[^}]*transform: rotate\(180deg\);/
    );
  });

  /** El filete transparente reserva su píxel: al abrirse, el botón no crece. */
  it('el borde existe siempre, transparente, para que abrir no mueva la cabecera', () => {
    expect(ESTILO_SCOPED).toMatch(
      /\.main-header__mas\s*\{[^}]*border: var\(--m-filete-grosor\) solid transparent;/
    );
  });

  /** §8: 44 px mínimo también para el disparador; en móvil, 44 × 44. */
  it('el disparador mide al menos 44 px, y la hamburguesa 44 × 44', () => {
    expect(ESTILO_SCOPED).toMatch(
      /\.main-header__mas\s*\{[^}]*min-height: var\(--m-tactil-min\);/
    );
    const movil = ESTILO_SCOPED.slice(
      ESTILO_SCOPED.indexOf('@media (max-width: 699px)')
    );
    expect(movil).toMatch(
      /\.main-header__mas\s*\{[^}]*min-width: var\(--m-tactil-min\);/
    );
  });

  it('en móvil abre la hoja y calcula el horario antes', () => {
    const cuerpo = funcion('function alPulsarMas');

    expect(cuerpo).toMatch(/if \(!esMovil\.value\) return;/);
    expect(cuerpo.indexOf('refrescarHorario()')).toBeGreaterThan(-1);
    expect(cuerpo.indexOf('refrescarHorario()')).toBeLessThan(
      cuerpo.indexOf('hojaAbierta.value = true')
    );
  });
});

describe('menú «Más» · el desplegable de escritorio', () => {
  it('es un q-menu solo desde 700 px, gobernado por menuAbierto', () => {
    expect(MENU).toContain('v-if="!esMovil"');
    expect(MENU).toContain('v-model="menuAbierto"');
  });

  /** M12: `index-layout.spec.ts` lo busca por estas clases. */
  it('conserva .more-menu en la raíz y .more-menu__list en el contenido', () => {
    expect(MENU).toContain('class="more-menu"');
    expect(MENU).toMatch(/<MenuMasContenido[^>]*class="more-menu__list"/);
    expect(MENU).toMatch(/<MenuMasContenido[^>]*variante="desplegable"/);
    expect(MENU).not.toContain('<q-list');
  });

  /** QMenu trae `role="menu"`; M8 pide semántica de navegación. */
  it('sobrescribe el role="menu" de Quasar', () => {
    expect(MENU).toContain('role="dialog"');
    expect(MENU).toContain('aria-label="Menú"');
  });

  it('calcula el horario al abrirse, no en setup (M9)', () => {
    expect(MENU).toContain('@before-show="refrescarHorario"');
    expect(SCRIPT).toContain("const horarioHoy = ref('')");
    expect(SCRIPT.match(/horarioDeHoy\(/g)).toHaveLength(1);
    expect(funcion('function refrescarHorario')).toContain('horarioDeHoy()');
  });

  it('lo cierra quien elige, no el auto-close de Quasar', () => {
    expect(MENU).not.toContain('auto-close');
    expect(MENU).toMatch(/<MenuMasContenido[^>]*@elegir="alElegirEntrada"/);
  });

  /**
   * Movida: el bloque `.more-menu {` es ahora solo el MARCO. Los tokens que
   * pedía y ya no son del marco (`--m-tinta`, `--m-oro-profundo`,
   * `--m-font-sans`, `--m-tactil-min`) los exige `MenuMasContenido.spec.ts`.
   */
  it('el marco se pinta con la paleta, sin hexadecimales, fuera de scoped', () => {
    const marco = /\.more-menu\s*\{([^}]*)\}/.exec(ESTILO_LIBRE)?.[1] ?? '';

    expect(LAYOUT.indexOf('<style lang="scss">')).toBeGreaterThan(
      LAYOUT.indexOf('<style scoped lang="scss">')
    );
    expect(ESTILO_LIBRE).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(marco).toMatch(/width: 344px;/);
    expect(marco).toMatch(/background: var\(--m-nieve\);/);
    expect(marco).toMatch(
      /border: var\(--m-filete-grosor\) solid var\(--m-filete\);/
    );
    expect(marco).toMatch(/border-radius: var\(--m-radio-tarjeta\);/);
    expect(marco).toMatch(/box-shadow: var\(--m-sombra-flotante\);/);
    expect(marco).not.toMatch(/rgba\(/);
  });

  /** Foco de revisión 5: en una ventana baja el desplegable no se sale por abajo. */
  it('el marco tiene techo de alto', () => {
    const marco = /\.more-menu\s*\{([^}]*)\}/.exec(ESTILO_LIBRE)?.[1] ?? '';

    expect(marco).toMatch(/max-height: calc\(100vh - 88px\);/);
  });
});

describe('menú «Más» · la hoja y elegir', () => {
  it('monta la hoja de móvil con el mismo contenido', () => {
    const hoja = PLANTILLA.slice(PLANTILLA.indexOf('<MenuMasHoja'));
    const etiqueta = hoja.slice(0, hoja.indexOf('/>'));

    expect(etiqueta).toContain('v-model:abierta="hojaAbierta"');
    expect(etiqueta).toContain(':secciones="seccionesMenu"');
    expect(etiqueta).toContain(':horario-hoy="horarioHoy"');
    expect(etiqueta).toContain('@elegir="alElegirEntrada"');
  });

  /** Foco de revisión 3: cierra ANTES de mirar la acción, también para los enlaces. */
  it('elegir cierra los dos envoltorios y luego resuelve la acción', () => {
    const cuerpo = funcion('function alElegirEntrada');
    const cierres = Math.max(
      cuerpo.indexOf('menuAbierto.value = false'),
      cuerpo.indexOf('hojaAbierta.value = false')
    );

    expect(cuerpo.indexOf('menuAbierto.value = false')).toBeGreaterThan(-1);
    expect(cuerpo.indexOf('hojaAbierta.value = false')).toBeGreaterThan(-1);
    expect(cierres).toBeLessThan(cuerpo.indexOf("'quienes-somos'"));
    expect(cuerpo).toMatch(
      /'quienes-somos'[\s\S]*whoWeAreDialogComponent\.value = true/
    );
    expect(cuerpo).toMatch(/'horarios'[\s\S]*ourContactDialog\.value = true/);
    expect(cuerpo).toMatch(/'cerrar-sesion'[\s\S]*onLogout\(\)/);
  });

  /** Spec §7.5. */
  it('cerrar sesión revoca en el servidor antes de limpiar, y tolera el fallo', () => {
    const cuerpo = funcion('async function onLogout');

    expect(cuerpo).toMatch(/try \{\s*await authApi\.logout\(\);\s*\} catch/);
    expect(cuerpo.indexOf('authApi.logout()')).toBeLessThan(
      cuerpo.indexOf('authStore.logout()')
    );
    expect(cuerpo).toContain("router.push({ path: '/' })");
  });

  /** Foco de revisión 2: girar el teléfono con el menú abierto. */
  it('al cruzar los 700 px se cierran el desplegable y la hoja', () => {
    const vigia = SCRIPT.slice(SCRIPT.indexOf('watch(esMovil'));
    const cuerpo = vigia.slice(0, vigia.indexOf('});') + 3);

    expect(cuerpo).toContain('menuAbierto.value = false');
    expect(cuerpo).toContain('hojaAbierta.value = false');
  });
});

describe('cabecera · consultas de medios (M11)', () => {
  /** Foco de revisión 1: el primer render del cliente es el del SSG. */
  it('los rótulos y el corte de móvil arrancan en el valor del SSG', () => {
    // Con `\s*`: la línea pasa de 80 columnas y prettier la parte.
    expect(SCRIPT).toMatch(
      /const showButtonLabels = useConsultaMedios\(\s*`\(min-width: \$\{BREAKPOINT_LABELS_PX\}px\)`,\s*true,?\s*\);/
    );
    expect(SCRIPT).toContain(
      'const esMovil = useConsultaMedios(CONSULTA_MENU_MOVIL, false);'
    );
  });

  it('el corte de móvil es el mismo que cambia la cabecera en CSS', () => {
    expect(SCRIPT).toContain(
      "const CONSULTA_MENU_MOVIL = '(max-width: 699px)';"
    );
    expect(ESTILO_SCOPED).toContain('@media (max-width: 699px)');
  });

  it('ya no consulta matchMedia a mano ni escucha con addEventListener (Safari 13.1)', () => {
    expect(LAYOUT).not.toContain('window.matchMedia');
    expect(LAYOUT).not.toMatch(/\.addEventListener\(\s*'change'/);
  });
});
