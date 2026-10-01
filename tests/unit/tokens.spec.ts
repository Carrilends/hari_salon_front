/**
 * `--m-barra-movil-alto` no es decorativo: de él cuelgan el relleno inferior de
 * la página y la altura a la que se posa el flotante del asistente. Si el token
 * se queda corto, el flotante cae dentro de la barra y le roba los toques al
 * botón de WhatsApp — justo en los teléfonos con área segura, que son los de
 * 390 px del diseño.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const TOKENS = readFileSync(join(__dirname, '../../src/css/tokens.scss'), 'utf8');

const valorDe = (token: string) =>
  TOKENS.match(new RegExp(`--${token}:\\s*([^;]+);`))?.[1]?.trim() ?? '';

describe('tokens visuales', () => {
  it('el alto de la barra de móvil cuenta el área segura del teléfono', () => {
    expect(valorDe('m-barra-movil-alto')).toContain('env(safe-area-inset-bottom');
  });

  it('cuenta también el filete superior de la barra', () => {
    expect(valorDe('m-barra-movil-alto')).toContain('77px');
  });
});
