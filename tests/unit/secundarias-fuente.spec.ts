/**
 * Las reglas de la remodelación que no se pueden comprobar montando, para las
 * cuatro piezas secundarias (plan 4). El CSS está mapeado a `styleMock.js` en
 * Jest, así que se lee la fuente.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const leer = (ruta: string) =>
  readFileSync(join(__dirname, '../../src', ruta), 'utf8');

const ARCHIVOS = [
  'pages/TestimonialsPage.vue',
  'pages/PrivacyPolicyPage.vue',
  'components/dialogs/ourContact.vue',
  'components/dialogs/whoWeAreDialog.vue',
  'components/testimonios/EstrellasValoracion.vue',
  'components/testimonios/TarjetaResena.vue',
];

/** Los que tienen botones o enlaces propios. */
const CON_CONTROLES = ARCHIVOS.slice(0, 4);

const partes = (ruta: string) => {
  const fuente = leer(ruta);
  return {
    fuente,
    plantilla: fuente.slice(0, fuente.indexOf('<script')),
    script: fuente.slice(fuente.indexOf('<script'), fuente.indexOf('<style')),
    estilos: fuente.slice(fuente.indexOf('<style')),
  };
};

/** El CSS sin los bloques `@media (hover: hover) and (pointer: fine)`. */
const sinBloquesFinos = (css: string) => {
  const marca = '@media (hover: hover) and (pointer: fine)';
  let resto = css;
  let desde = resto.indexOf(marca);
  while (desde !== -1) {
    let nivel = 0;
    let i = resto.indexOf('{', desde);
    for (; i < resto.length; i += 1) {
      if (resto[i] === '{') nivel += 1;
      if (resto[i] === '}') nivel -= 1;
      if (nivel === 0) break;
    }
    resto = resto.slice(0, desde) + resto.slice(i + 1);
    desde = resto.indexOf(marca);
  }
  return resto;
};

describe('páginas secundarias · color', () => {
  it.each(ARCHIVOS)('%s: ni hexadecimales ni rgba en sus estilos', (ruta) => {
    const { estilos } = partes(ruta);

    expect(estilos.match(/#[0-9a-fA-F]{3,8}\b/g)).toBeNull();
    expect(estilos).not.toMatch(/rgba\(/);
  });

  it.each(ARCHIVOS)(
    '%s: sus dibujos heredan el color, no lo escriben',
    (ruta) => {
      expect(partes(ruta).plantilla).not.toMatch(/(fill|stroke)="#/);
    }
  );
});

describe('páginas secundarias · marcado llano', () => {
  it.each(ARCHIVOS)(
    '%s: sin piezas de Quasar salvo la página y el diálogo',
    (ruta) => {
      const { fuente } = partes(ruta);

      expect(fuente).not.toMatch(
        /<q-(btn|input|card|rating|icon|img|separator|skeleton|scroll-area)\b/
      );
      expect(fuente).not.toMatch(/\$q\.|useQuasar/);
    }
  );
});

describe('páginas secundarias · Safari 13.1 y SSG', () => {
  it.each(ARCHIVOS)('%s: sin `inset`, `:has()` ni `dvh`', (ruta) => {
    const { estilos } = partes(ruta);

    expect(estilos).not.toMatch(/\binset\s*:|:has\(|dvh/);
  });

  it.each(ARCHIVOS.filter((r) => r !== 'pages/PrivacyPolicyPage.vue'))(
    '%s: su script no toca la ventana ni el documento',
    (ruta) => {
      expect(partes(ruta).script).not.toMatch(/\bwindow\.|\bdocument\./);
    }
  );

  it('la política solo toca la ventana dentro del manejador del índice', () => {
    const { script } = partes('pages/PrivacyPolicyPage.vue');
    const manejador = script.slice(
      script.indexOf('async function irA'),
      script.indexOf('useSeo(')
    );
    const fuera = script.replace(manejador, '');

    expect(manejador).toMatch(/window\.scrollTo/);
    expect(fuera).not.toMatch(/\bwindow\.|\bdocument\./);
  });
});

describe('páginas secundarias · foco y realce', () => {
  it.each(CON_CONTROLES)(
    '%s: foco visible de 2 px con su separación',
    (ruta) => {
      expect(partes(ruta).estilos).toMatch(
        /:focus-visible\s*\{[^}]*outline: 2px solid var\(--m-[\w-]+\);[^}]*outline-offset: 2px;/
      );
    }
  );

  it.each(ARCHIVOS)(
    '%s: todo `:hover` vive en la consulta de puntero fino',
    (ruta) => {
      expect(sinBloquesFinos(partes(ruta).estilos)).not.toMatch(/:hover/);
    }
  );

  it.each(CON_CONTROLES)('%s: los controles llegan a 44 px', (ruta) => {
    expect(partes(ruta).estilos).toMatch(/var\(--m-tactil-min\)/);
  });
});

describe('páginas secundarias · los diálogos conservan su interfaz', () => {
  it.each([
    'components/dialogs/ourContact.vue',
    'components/dialogs/whoWeAreDialog.vue',
  ])(
    '%s: `dialog` entra y `update:dialog` sale, como los abre el armazón',
    (ruta) => {
      const { script } = partes(ruta);

      expect(script).toContain('defineProps<{ dialog: boolean }>()');
      expect(script).toContain('useDialog(props, emit)');
    }
  );
});

describe('páginas secundarias · desborde', () => {
  it.each(ARCHIVOS)('%s: nunca `overflow-wrap: anywhere`', (ruta) => {
    expect(partes(ruta).estilos).not.toMatch(/overflow-wrap:\s*anywhere/);
  });
});
