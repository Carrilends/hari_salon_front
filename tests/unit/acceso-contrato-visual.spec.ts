/**
 * Contrato visual del flujo de acceso, leído de la fuente.
 *
 * El SCSS está mapeado a un objeto vacío en Jest: un color o una consulta de
 * medios no se pueden afirmar montando. Esta guarda recorre el armazón, las
 * cinco páginas y las siete piezas, y vigila lo que la remodelación acordó
 * (especificación §4, §7 y las restricciones globales del plan).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const SRC = join(__dirname, '../../src');
const leer = (ruta: string) => readFileSync(join(SRC, ruta), 'utf8');

const vues = (dir: string): string[] =>
  readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) return vues(ruta);
    return ruta.endsWith('.vue') ? [ruta] : [];
  });

const LAYOUT = 'auth/layouts/AuthLayout.vue';
const PAGINAS = [
  'auth/pages/LoginPage.vue',
  'auth/pages/RegisterPage.vue',
  'auth/pages/ForgotPasswordPage.vue',
  'auth/pages/ResetPasswordPage.vue',
  'auth/pages/VerifyEmailPage.vue',
];
const PIEZAS = [
  'components/auth/CampoAcceso.vue',
  'components/auth/ReglasContrasena.vue',
  'components/auth/AvisoAcceso.vue',
  'components/auth/SeparadorAcceso.vue',
  'components/auth/EstadoAcceso.vue',
  'components/auth/GoogleSignInButton.vue',
  'components/auth/ConsentimientoGoogle.vue',
];
const TODOS = [LAYOUT].concat(PAGINAS, PIEZAS);
const COMPOSABLES = [
  'composables/auth/useLoginWithGoogle.ts',
  'composables/auth/useFormularioAcceso.ts',
  'composables/auth/useForgotPassword.ts',
  'composables/auth/useResetPassword.ts',
  'composables/auth/useVerifyEmail.ts',
];

const plantillaDe = (fuente: string) =>
  fuente.slice(fuente.indexOf('<template>'), fuente.lastIndexOf('</template>'));

/** Los bloques `<style>` sin sus etiquetas ni comentarios. */
const estilosDe = (fuente: string) => {
  const i = fuente.indexOf('<style');
  if (i === -1) return '';
  return fuente
    .slice(i)
    .replace(/<\/?style[^>]*>/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
};

type Regla = { selector: string; cuerpo: string };

/** Reglas (anidadas o no) como pares selector/cuerpo. */
const reglasDe = (css: string): Regla[] =>
  Array.from(css.matchAll(/([^{};]+)\{([^{}]*)\}/g)).map((r) => ({
    selector: r[1].trim(),
    cuerpo: r[2],
  }));

const reglaDe = (archivo: string, selector: string) =>
  reglasDe(estilosDe(leer(archivo)))
    .filter((r) => r.selector === selector)
    .map((r) => r.cuerpo)
    .join('\n');

const PUNTERO_FINO = '@media (hover: hover) and (pointer: fine)';

/** El CSS sin los bloques de puntero fino (llaves equilibradas). */
const sinPunteroFino = (css: string) => {
  let resto = css;
  let desde = resto.indexOf(PUNTERO_FINO);
  while (desde !== -1) {
    let nivel = 0;
    let i = resto.indexOf('{', desde);
    for (; i < resto.length; i += 1) {
      if (resto[i] === '{') nivel += 1;
      if (resto[i] === '}') nivel -= 1;
      if (nivel === 0) break;
    }
    resto = resto.slice(0, desde) + resto.slice(i + 1);
    desde = resto.indexOf(PUNTERO_FINO);
  }
  return resto;
};

describe('el acceso entero, leído de la fuente', () => {
  it('la lista cubre todos los .vue de src/auth y src/components/auth', () => {
    const reales = vues(join(SRC, 'auth'))
      .concat(vues(join(SRC, 'components', 'auth')))
      .map((ruta) => relative(SRC, ruta).split(sep).join('/'))
      .sort();

    expect(reales).toEqual(TODOS.slice().sort());
  });

  it.each(TODOS)('%s no lleva hexadecimales', (archivo) => {
    expect(leer(archivo)).not.toMatch(/#[0-9a-fA-F]{3,8}(?![\w-])/);
  });

  it.each(TODOS)('%s no lleva estilos en línea', (archivo) => {
    expect(plantillaDe(leer(archivo))).not.toMatch(/\sstyle="/);
  });

  it.each(TODOS.concat(COMPOSABLES))(
    '%s no usa piezas ni avisos de Quasar (A3, A7, A8, A11)',
    (archivo) => {
      const fuente = leer(archivo);
      expect(fuente).not.toMatch(
        /<q-(input|btn|card|form|spinner|icon|separator|checkbox)\b/
      );
      expect(fuente).not.toMatch(/\$q\.|useQuasar/);
    }
  );

  it.each(TODOS)('%s no lee import.meta (Jest no lo compila)', (archivo) => {
    expect(leer(archivo)).not.toMatch(/import\.meta/);
  });

  it.each(PAGINAS)('%s conserva noindex (§7.3)', (archivo) => {
    expect(leer(archivo)).toMatch(/useSeo\(\{[\s\S]*?noindex: true,?\s*\}\);/);
  });

  it('las cinco páginas siguen fuera del SSG (§7.3)', () => {
    const config = readFileSync(
      join(__dirname, '../../quasar.config.js'),
      'utf8'
    );
    const exclusiones = config.slice(config.indexOf('exclude:'));

    expect(exclusiones.slice(0, 300)).toContain('/^\\/auth/');
  });

  it('el diálogo de consentimiento devuelve los clics a su raíz (§7.9)', () => {
    expect(
      reglaDe('components/auth/ConsentimientoGoogle.vue', '.consentimiento')
    ).toMatch(/pointer-events: all;/);
  });

  it.each(TODOS)(
    '%s respeta Safari 13.1: sin inset, sin :has(), 100dvh solo tras 100vh',
    (archivo) => {
      const estilos = estilosDe(leer(archivo));
      expect(estilos).not.toMatch(/(^|[\s;{])inset\s*:/);
      expect(estilos).not.toMatch(/:has\(/);
      expect((estilos.match(/100dvh/g) ?? []).length).toBe(
        (estilos.match(/100vh;\s*[\w-]+:\s*100dvh/g) ?? []).length
      );
    }
  );

  it.each(TODOS)(
    '%s solo cambia de color al pasar con puntero fino',
    (archivo) => {
      const fueraDelFino = reglasDe(sinPunteroFino(estilosDe(leer(archivo))));

      expect(fueraDelFino.filter((r) => r.selector.includes(':hover'))).toEqual(
        []
      );
    }
  );

  it.each([
    LAYOUT,
    'components/auth/CampoAcceso.vue',
    'components/auth/ConsentimientoGoogle.vue',
    'auth/pages/RegisterPage.vue',
  ])('%s marca el foco con el anillo de oro', (archivo) => {
    expect(estilosDe(leer(archivo))).toMatch(
      /outline: 2px solid var\(--m-oro\);\s*outline-offset: 2px;/
    );
  });

  /**
   * El oro claro da 2,8:1 sobre hueso: no es color de texto sobre claro. Solo
   * se admite como `color` donde el fondo es tinta.
   */
  it('el oro claro solo es color de texto sobre tinta', () => {
    const SOBRE_TINTA = [
      /\.acceso-boton(?![\w-])/,
      /circulo--tinta/,
      /consentimiento__boton--macizo/,
    ];
    const infractoras = TODOS.flatMap((archivo) =>
      reglasDe(estilosDe(leer(archivo)))
        .filter((r) => /(^|[\s;])color: var\(--m-oro\);/.test(r.cuerpo))
        .filter((r) => !SOBRE_TINTA.some((patron) => patron.test(r.selector)))
        .map((r) => `${archivo} → ${r.selector}`)
    );

    expect(infractoras).toEqual([]);
  });

  it('los enlaces de contenido van en rosa profundo con filete rosa', () => {
    [
      reglaDe(LAYOUT, '.acceso-enlace'),
      reglaDe(
        'components/auth/ConsentimientoGoogle.vue',
        '.consentimiento__enlace'
      ),
    ].forEach((cuerpo) => {
      expect(cuerpo).toMatch(/color: var\(--m-rosa-profundo\);/);
      expect(cuerpo).toMatch(
        /border-bottom: var\(--m-filete-grosor\) solid var\(--m-filete-rosa\);/
      );
    });
  });

  it('los errores van en peligro', () => {
    expect(
      reglaDe('components/auth/CampoAcceso.vue', '.campo-acceso__error')
    ).toMatch(/color: var\(--m-peligro\);/);
    const aviso = reglaDe(
      'components/auth/AvisoAcceso.vue',
      '.aviso-acceso--error'
    );
    expect(aviso).toMatch(/border-color: var\(--m-peligro\);/);
    expect(aviso).toMatch(/color: var\(--m-peligro\);/);
  });

  it.each(PAGINAS)(
    '%s: todo botón de acceso es ancho (m-boton--ancho)',
    (archivo) => {
      const listas = Array.from(
        plantillaDe(leer(archivo)).matchAll(/\sclass="([^"]*)"/g)
      )
        .map((m) => m[1].split(/\s+/))
        .filter((clases) => clases.includes('acceso-boton'));

      expect(listas.length).toBeGreaterThan(0);
      listas.forEach((clases) => expect(clases).toContain('m-boton--ancho'));
    }
  );

  it.each(PAGINAS)(
    '%s: los enlaces con aspecto de botón llevan m-boton (realce y hundido)',
    (archivo) => {
      Array.from(
        plantillaDe(leer(archivo)).matchAll(
          /<router-link\b[^>]*\sclass="([^"]*)"/g
        )
      )
        .map((m) => m[1].split(/\s+/))
        .filter((clases) => clases.includes('acceso-boton'))
        .forEach((clases) => expect(clases).toContain('m-boton'));
    }
  );

  it.each(PAGINAS.concat(PIEZAS, [LAYOUT]))(
    '%s: todo <button> declara su type',
    (archivo) => {
      const botones = Array.from(
        plantillaDe(leer(archivo)).matchAll(/<button\b[^>]*>/g)
      ).map((m) => m[0]);
      botones.forEach((boton) =>
        expect(boton).toMatch(/\stype="(button|submit)"/)
      );
    }
  );

  it.each(PAGINAS)(
    '%s: los formularios validan por su cuenta (novalidate)',
    (archivo) => {
      Array.from(plantillaDe(leer(archivo)).matchAll(/<form\b[^>]*>/g)).forEach(
        (m) => expect(m[0]).toMatch(/\snovalidate/)
      );
    }
  );

  it.each(PAGINAS)(
    '%s: cada clase común que usa existe en el armazón',
    (archivo) => {
      const globales = estilosDe(
        leer(LAYOUT).slice(leer(LAYOUT).indexOf('<style lang="scss">'))
      );
      const usadas = new Set<string>();
      Array.from(
        plantillaDe(leer(archivo)).matchAll(/\sclass="([^"]*)"/g)
      ).forEach((m) =>
        m[1]
          .split(/\s+/)
          .filter((clase) => /^acceso-/.test(clase))
          .forEach((clase) => usadas.add(clase))
      );

      usadas.forEach((clase) => {
        expect(globales).toMatch(new RegExp(`\\.${clase}(?![\\w-])[^{]*\\{`));
      });
    }
  );

  it('los controles pequeños miden 44 px', () => {
    const tactil =
      /width: var\(--m-tactil-min\);[\s\S]*height: var\(--m-tactil-min\);/;
    expect(reglaDe(LAYOUT, '.acceso__cerrar')).toMatch(tactil);
    expect(
      reglaDe('components/auth/CampoAcceso.vue', '.campo-acceso__ojo')
    ).toMatch(tactil);
    expect(reglaDe(LAYOUT, '.acceso__entrar')).toMatch(
      /height: var\(--m-tactil-min\);/
    );
    expect(reglaDe(LAYOUT, '.acceso-secundario')).toMatch(
      /min-height: var\(--m-tactil-min\);/
    );
    expect(reglaDe(LAYOUT, '.acceso-enlace--suelto')).toMatch(
      /min-height: var\(--m-tactil-min\);/
    );
    expect(
      reglaDe('auth/pages/RegisterPage.vue', '.registro__consentimiento')
    ).toMatch(/min-height: var\(--m-tactil-min\);/);
  });

  it.each(PIEZAS.concat([LAYOUT]))('%s pinta con tokens', (archivo) => {
    expect(estilosDe(leer(archivo))).toMatch(/var\(--m-[\w-]+\)/);
  });
});
