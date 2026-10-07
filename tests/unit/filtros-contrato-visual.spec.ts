/**
 * El contrato visual de la fase C, leído de la fuente.
 *
 * El SCSS no existe en las pruebas (`\.(css|scss|sass)$` → `tests/styleMock.js`),
 * así que un color NO se puede afirmar montando: `wrapper.classes()` diría que
 * la clase está y no diría nada de lo que pinta. Esto se lee con `readFileSync`
 * y una expresión regular, como `tests/unit/salon-branding.spec.ts`.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ = join(__dirname, '../..');

const ARCHIVOS: Record<string, string> = {
  'ServiceFilterFields.vue': 'src/components/servicePage/ServiceFilterFields.vue',
  'ServiceFilterRail.vue': 'src/components/servicePage/ServiceFilterRail.vue',
  'serviceFilterDialog.vue': 'src/components/dialogs/serviceFilterDialog.vue',
  'ServicesBox.vue': 'src/components/shared/ServicesBox.vue',
};

const fuente = (ruta: string) => readFileSync(join(RAIZ, ruta), 'utf8');

describe('contrato visual de los filtros', () => {
  describe.each(Object.entries(ARCHIVOS))('%s', (_nombre, ruta) => {
    const FUENTE = fuente(ruta);

    it('no trae ni un hexadecimal de color', () => {
      expect(FUENTE).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    });

    it('todo color sale de un token --m-*', () => {
      const colores = [
        ...FUENTE.matchAll(
          /(?:^|\s)(?:color|background|background-color|border-color|outline-color|accent-color|scrollbar-color):\s*([^;]+);/g
        ),
      ].map((m) => m[1].trim());

      expect(colores.length).toBeGreaterThan(0);
      for (const valor of colores) {
        // `transparent`, `currentColor` e `inherit` no son colores de paleta.
        if (/^(transparent|currentColor|inherit|none)$/i.test(valor)) continue;
        expect(valor).toMatch(/var\(--m-/);
      }
    });

    it('no usa rgb/rgba/hsl a pelo', () => {
      const estilos = FUENTE.slice(FUENTE.indexOf('<style'));
      expect(estilos).not.toMatch(/\b(rgba?|hsla?)\(/);
    });
  });

  it('los titulares de las dos cabeceras van en Marcellus', () => {
    expect(fuente(ARCHIVOS['ServiceFilterRail.vue'])).toMatch(
      /\.carril__titulo[\s\S]*?font-family:\s*var\(--m-font-display\)/
    );
    expect(fuente(ARCHIVOS['serviceFilterDialog.vue'])).toMatch(
      /\.hoja__titulo[\s\S]*?font-family:\s*var\(--m-font-display\)/
    );
  });

  it('los rótulos de grupo van en versalitas espaciadas', () => {
    const campos = fuente(ARCHIVOS['ServiceFilterFields.vue']);

    expect(campos).toMatch(
      /\.campos__etiqueta[\s\S]*?text-transform:\s*uppercase[\s\S]*?letter-spacing:\s*var\(--m-tracking-etiqueta\)/
    );
  });

  it('las casillas miden 18 px y el tick es dorado', () => {
    const campos = fuente(ARCHIVOS['ServiceFilterFields.vue']);

    expect(campos).toMatch(/\.campos__tick[\s\S]*?width:\s*18px[\s\S]*?height:\s*18px/);
    expect(campos).toMatch(/\.campos__tick:checked::after[\s\S]*?var\(--m-oro\)/);
  });

  it('las perillas están entre 15 y 19 px, en oro sobre canal tinta', () => {
    const campos = fuente(ARCHIVOS['ServiceFilterFields.vue']);
    const perillas = [...campos.matchAll(/slider-thumb|range-thumb/g)];

    expect(perillas.length).toBeGreaterThanOrEqual(2);
    expect(campos).toMatch(/slider-thumb[\s\S]*?width:\s*1[5-9]px/);
    expect(campos).toMatch(/slider-runnable-track[\s\S]*?background:\s*var\(--m-tinta\)/);
  });

  it('los separadores son de 1 px con oro al 35 %', () => {
    const campos = fuente(ARCHIVOS['ServiceFilterFields.vue']);

    expect(campos).toMatch(
      /\.campos__filete[\s\S]*?border-top:\s*var\(--m-filete-grosor\)\s+solid\s+var\(--m-filete-oscuro\)/
    );
  });

  it('nada de q-btn, q-chip, q-checkbox ni q-range: solo sobrevive q-dialog (D8)', () => {
    for (const [nombre, ruta] of Object.entries(ARCHIVOS)) {
      const FUENTE = fuente(ruta);
      expect(FUENTE).not.toMatch(/<q-(btn|chip|checkbox|range|option-group|scroll-area|card|item|separator|icon|badge)/);
      if (nombre !== 'serviceFilterDialog.vue') {
        expect(FUENTE).not.toMatch(/<q-dialog/);
      }
    }
  });

  it('todos los botones de solo icono tienen nombre', () => {
    for (const ruta of Object.values(ARCHIVOS)) {
      // Bloque a bloque, no «desde un `<button` hasta el primer `<svg`»: con lo
      // segundo, un botón sin nombre pasaba por el `aria-label` del botón de al
      // lado. Los `<button>` no se anidan, así que el perezoso basta.
      const botones = [...fuente(ruta).matchAll(/<button[\s\S]*?<\/button>/g)].map(
        (m) => m[0]
      );
      expect(botones.length).toBeGreaterThan(0);

      for (const boton of botones) {
        if (!boton.includes('<svg')) continue;
        // Quitar las etiquetas deja el rótulo visible, interpolaciones
        // incluidas: `{{ rotuloVer }}` ES un rótulo, y un botón que ya se
        // nombra en pantalla no necesita `aria-label`.
        const texto = boton.replace(/<[^>]*>/g, ' ').trim();
        if (texto.length > 0) continue;
        expect(boton).toMatch(/aria-label=/);
      }
    }
  });

  it('el foco se ve en todo lo que se puede enfocar', () => {
    for (const ruta of Object.values(ARCHIVOS)) {
      expect(fuente(ruta)).toMatch(/:focus-visible/);
    }
  });

  it('el área táctil mínima se respeta donde se toca con el pulgar', () => {
    expect(fuente(ARCHIVOS['serviceFilterDialog.vue'])).toMatch(/var\(--m-tactil-min\)/);
    expect(fuente(ARCHIVOS['ServiceFilterFields.vue'])).toMatch(/var\(--m-tactil-min\)/);
  });
});
