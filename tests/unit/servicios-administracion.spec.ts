/**
 * Pruebas de fuente de la fase E.
 *
 * El SCSS está mapeado a `tests/styleMock.js`: montar un componente no dice
 * nada de su color. Lo que se vigila aquí es el contrato visual —tokens, nada
 * de hexadecimales, foco visible, área táctil— y los invariantes que una
 * remodelación descuidada se lleva por delante.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ = join(__dirname, '../..');
const leer = (ruta: string) => readFileSync(join(RAIZ, ruta), 'utf8');

/** Todo el código fuente, concatenado. */
function fuentes(dir: string, acumulado: string[] = []): string[] {
  for (const entrada of readdirSync(dir, { withFileTypes: true })) {
    const ruta = join(dir, entrada.name);
    if (entrada.isDirectory()) fuentes(ruta, acumulado);
    else if (/\.(vue|ts|js|scss)$/.test(entrada.name))
      acumulado.push(readFileSync(ruta, 'utf8'));
  }
  return acumulado;
}

const TOKENS = leer('src/css/tokens.scss');
const ICONOS = leer('src/components/shared/StrokeIcon.vue');

const valorDe = (token: string) =>
  TOKENS.match(new RegExp(`--${token}:\\s*([^;]+);`))?.[1]?.trim() ?? '';

describe('tokens de la administración de servicios', () => {
  /** D6: la paleta no tiene rojo y un botón de borrar necesita leerse como tal. */
  it('declara el color de peligro y su texto', () => {
    expect(valorDe('m-peligro')).toBe('#8e3b5c');
    expect(valorDe('m-peligro-texto')).toBe('#f6f1ea');
  });

  /**
   * El velo bajo los tres botones de la dueña es tinta al 72 %: sin token,
   * el componente tendría que escribir `rgba(22, 19, 15, 0.72)` a mano.
   */
  it('declara el velo de las acciones sobre la foto', () => {
    expect(valorDe('m-velo-accion')).toBe('rgba(22, 19, 15, 0.72)');
  });
});

describe('trazos de la administración', () => {
  it.each(['lapiz', 'etiqueta', 'papelera'])(
    'el icono «%s» existe y dibuja trazos',
    (nombre) => {
      const bloque = ICONOS.slice(ICONOS.indexOf(`  ${nombre}: [`));

      expect(bloque.slice(0, 400)).toMatch(/'M[\d\s.,a-zA-Z-]+'/);
    }
  );
});

/**
 * Los tres componentes nuevos de la fase, medidos por fuente: color solo por
 * token, foco visible, área táctil de 44 px y las dos familias.
 */
const NUEVOS = [
  'src/components/servicePage/ServiceCardAdminActions.vue',
  'src/components/dialogs/ServicePromotionDialog.vue',
  'src/components/dialogs/ServiceDeleteDialog.vue',
] as const;

describe('contrato visual de los componentes nuevos', () => {
  it.each(NUEVOS)('%s no pinta con colores escritos a mano', (ruta) => {
    const fuente = leer(ruta);
    const estilos = fuente.slice(fuente.indexOf('<style'));

    expect(estilos).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(estilos).not.toMatch(/\brgba?\(/);
    expect(estilos).toContain('var(--m-');
  });

  it.each(NUEVOS)('%s deja ver el foco', (ruta) => {
    expect(leer(ruta)).toContain(':focus-visible');
  });

  it.each(NUEVOS)('%s respeta el área táctil mínima', (ruta) => {
    expect(leer(ruta)).toContain('var(--m-tactil-min)');
  });

  it.each(NUEVOS)('%s usa las dos familias por token', (ruta) => {
    const fuente = leer(ruta);

    expect(fuente).toContain('var(--m-font-sans)');
    expect(fuente).toContain('var(--m-font-display)');
  });
});

describe('el botón que borra se lee como tal', () => {
  it('usa el color de peligro y su texto, por token', () => {
    const fuente = leer('src/components/dialogs/ServiceDeleteDialog.vue');
    const regla = fuente.slice(fuente.indexOf('.borrado__boton--peligro {'));

    expect(regla.slice(0, 320)).toContain('var(--m-peligro)');
    expect(regla.slice(0, 320)).toContain('var(--m-peligro-texto)');
  });

  it('y es el único sitio de la fase donde aparece ese color', () => {
    expect(
      leer('src/components/servicePage/ServiceCardAdminActions.vue')
    ).not.toContain('var(--m-peligro');
  });
});

describe('ServicePage ya no administra por su cuenta', () => {
  const PAGINA = leer('src/pages/ServicePage.vue');

  it('delega en el composable de administración', () => {
    expect(PAGINA).toContain(
      "from 'src/composables/services/useServiceAdminActions'"
    );
    expect(PAGINA).toContain('useServiceAdminActions({');
  });

  it('se ha quedado sin los manejadores que tenía dentro', () => {
    for (const resto of [
      'askPromotionPercentage',
      'askPromotionRemoval',
      'handlePromotionAction',
      'applyPromotionToService',
      'buildPromotionPayload',
      'normalizeServiceTags',
      'confirmDeleteService',
      'openEditService',
    ]) {
      expect(PAGINA).not.toContain(resto);
    }
  });

  it('ya no abre diálogos ni avisa con los colores de Quasar', () => {
    expect(PAGINA).not.toContain('$q.dialog');
    expect(PAGINA).not.toContain('$q.notify');
    expect(PAGINA).not.toContain('$q.loading');
  });

  /** La deuda D-B6 de la fase B se salda aquí: sin manejadores huérfanos. */
  it('ya no silencia al linter ni arrastra la nota de la deuda', () => {
    expect(PAGINA).not.toContain('eslint-disable');
    expect(PAGINA).not.toContain('D-B6');
  });

  /**
   * La rejilla reexpone una sola ranura `acciones` con `{ servicio, compacto }`:
   * `compacto` es `true` dentro del renglón de móvil y `false` en la tarjeta.
   * La página la rellena una vez y deja que la rejilla diga cuál de las dos es.
   */
  it('rellena la ranura de acciones de la rejilla con los controles de la dueña', () => {
    const rejilla = PAGINA.slice(PAGINA.indexOf('<ServiceCardsGrid'));

    expect(rejilla.slice(0, 900)).toContain(
      '#acciones="{ servicio, compacto }"'
    );
    expect(rejilla.slice(0, 900)).toContain('<ServiceCardAdminActions');
  });

  /** La vista que faltaba: la lista de móvil en modo administración. */
  it('pasa a los controles si van en un renglón (compacto) o en una tarjeta', () => {
    const rejilla = PAGINA.slice(PAGINA.indexOf('<ServiceCardsGrid'));

    expect(rejilla.slice(0, 900)).toMatch(
      /<ServiceCardAdminActions[\s\S]{0,260}:compacto="compacto"/
    );
    // Y la rejilla manda los dos valores: renglón y tarjeta.
    const GRID = leer('src/components/servicePage/ServiceCardsGrid.vue');
    expect(GRID).toMatch(
      /<ServiceRow[\s\S]*?name="acciones"[^>]*:compacto="true"[\s\S]*?<\/ServiceRow>/
    );
    expect(GRID).toMatch(
      /<ServiceCard\b[\s\S]*?name="acciones"[^>]*:compacto="false"[\s\S]*?<\/ServiceCard>/
    );
  });

  /** Review Focus 1: borrar el último de la página no puede dejarla en blanco. */
  it('al borrar retrocede de página si hacía falta', () => {
    expect(PAGINA).toContain('paginaTrasBorrado');
    expect(PAGINA).toContain("motivo === 'borrado'");
  });
});

describe('ServicePromoButton', () => {
  it('ya no existe: la píldora la pinta la tarjeta y el control es el de la dueña', () => {
    expect(() =>
      leer('src/components/servicePage/ServicePromoButton.vue')
    ).toThrow();
  });

  it('y nadie lo nombra', () => {
    const codigo = fuentes(join(RAIZ, 'src')).join('\n');

    expect(codigo).not.toContain('ServicePromoButton');
  });
});

/**
 * Los diálogos propios ya declaran `persistent` en su `q-dialog`. Un
 * `persistent` suelto en las opciones de `$q.dialog({ component })` no llega a
 * ninguna parte: el plugin lo ignora cuando hay componente.
 */
describe('useServiceAdminActions no pasa opciones muertas al plugin', () => {
  it('no repite `persistent` junto al componente', () => {
    const fuente = leer('src/composables/services/useServiceAdminActions.ts');

    expect(fuente).not.toMatch(/component:[\s\S]{0,120}persistent: true/);
  });
});

describe('el formulario de crear y editar, restilado', () => {
  const FORM = leer('src/components/dialogs/serviceCreateEdit.vue');
  const ESTILOS = FORM.slice(FORM.indexOf('<style'));
  /** Toda la plantilla: del primer `<template>` al ÚLTIMO `</template>`. */
  const PLANTILLA = FORM.slice(
    FORM.indexOf('<template>'),
    FORM.lastIndexOf('</template>')
  );

  it('los tres pasos se llaman como se llaman, con sus tildes', () => {
    expect(FORM).toContain('title="Información general"');
    expect(FORM).toContain('title="Selección de imágenes"');
    expect(FORM).toContain('title="Listado de servicios"');
  });

  it('la cabecera del stepper va en versalitas y los números en círculo de oro', () => {
    expect(ESTILOS).toContain('var(--m-tracking-etiqueta)');
    expect(ESTILOS).toContain('.q-stepper__dot');
    expect(ESTILOS).toContain('var(--m-oro)');
  });

  /** El precio inválido se lee junto al campo, por las reglas del q-input. */
  it('el precio conserva sus reglas en el campo', () => {
    const campo = FORM.slice(FORM.indexOf('data-test="precio"') - 400);

    expect(campo.slice(0, 700)).toContain(':rules="priceRules"');
    expect(FORM).toContain('const priceRules');
  });

  /** El del paso 2 ya no es solo un aviso flotante. */
  it('el error de las imágenes se pinta junto al campo', () => {
    expect(FORM).toContain('data-test="error-imagenes"');
    expect(FORM).toContain('validarPasoImagenes');
    expect(FORM).toContain('ERROR_SIN_IMAGENES');
  });

  it('los avisos pasan por el envoltorio de la paleta, no por Quasar directo', () => {
    expect(FORM).toContain("from 'src/composables/shared/useAviso'");
    expect(FORM).not.toContain("type: 'negative'");
  });

  it('la navegación del stepper son botones de verdad', () => {
    for (const gancho of ['cancelar', 'continuar', 'atras']) {
      expect(FORM).toContain(`data-test="${gancho}"`);
    }
    expect(FORM).not.toContain('<q-stepper-navigation');
  });

  /** §6.1: si se pierde esta llamada, la bolsa se queda con el precio viejo. */
  it('tras editar sigue sincronizando la bolsa', () => {
    expect(FORM).toContain('bookStore.syncBookingWithService(fresh)');
  });

  /** El reparto nuevas / existentes es lo que no se puede romper al restilar. */
  it('conserva el reparto de imágenes nuevas y existentes', () => {
    expect(FORM).toContain('files.value.filter((f) => f instanceof File)');
    expect(FORM).toContain('prepareImagesForUpload');
  });

  it('el formulario no pinta con colores escritos a mano', () => {
    expect(ESTILOS).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(ESTILOS).not.toMatch(/\brgba?\(/);
  });

  it('y tampoco en los atributos de estilo de la plantilla', () => {
    expect(PLANTILLA.length).toBeGreaterThan(FORM.indexOf('</q-stepper>'));
    expect(PLANTILLA).not.toMatch(/#[0-9a-fA-F]{3,6}\b/);
    expect(PLANTILLA).not.toContain('bg-grey-3');
    expect(PLANTILLA).not.toContain('bg-white');
    expect(PLANTILLA).not.toContain('light-blue-1');
    expect(PLANTILLA).not.toContain('color="red"');
  });

  /** `--m-peligro` es solo del botón que borra el servicio (R13'). */
  it('el error y quitar foto no usan el token de peligro', () => {
    expect(ESTILOS).toContain('var(--m-rosa-profundo)');
    expect(ESTILOS).not.toContain('--m-peligro');
  });
});
