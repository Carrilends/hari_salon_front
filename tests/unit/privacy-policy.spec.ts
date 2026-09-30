import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * La política publicada en `/politica-tratamiento-datos` es lo único que la
 * clienta puede leer para saber **quién trata sus datos y dónde**. La tesis
 * afirma que nombra a los encargados ubicados fuera de Colombia, y esa
 * afirmación se sostiene en este fichero: si una edición posterior quitara un
 * nombre, la tesis pasaría a decir algo falso sin que nada avisara.
 *
 * Se lee el componente como TEXTO y no se monta: lo que se comprueba es que el
 * contenido esté escrito, y montar una página de Quasar exigiría media
 * aplicación para verificar una lista de nombres.
 */
const PAGINA = readFileSync(
  join(__dirname, '../../src/pages/PrivacyPolicyPage.vue'),
  'utf8',
);

describe('Política de Tratamiento de Datos Personales', () => {
  it.each([
    ['Google', 'identidad: inicio de sesión con Google'],
    ['Meta', 'avisos por la API de WhatsApp Business'],
    ['Gemini', 'proveedor del asistente conversacional'],
    ['TypeSafe', 'verificación de la reserva antes de crearla'],
    ['Resend', 'correo transaccional'],
  ])('nombra a %s (%s)', (encargado) => {
    expect(PAGINA).toContain(encargado);
  });

  it('dice que hay tratamiento fuera de Colombia y lo llama por su nombre legal', () => {
    // Ley 1581 de 2012: la transferencia internacional hay que declararla, no
    // insinuarla.
    expect(PAGINA).toContain('transferencia internacional');
    expect(PAGINA).toContain('fuera de Colombia');
  });

  it('declara que el asistente es voluntario y que se puede reservar sin él', () => {
    // El Capítulo II lo exige como contrapartida del tratamiento asistido: el
    // titular tiene derecho a no usar el canal conversacional.
    expect(PAGINA).toContain('El uso del asistente conversacional es voluntario');
  });

  it('dice qué NO recibe el proveedor de juicios', () => {
    // Es la única forma de que la minimización sea verificable por quien lee.
    expect(PAGINA).toMatch(/no recibe/i);
  });

  it('las secciones están numeradas sin saltos ni repetidos', () => {
    // Insertar una sección en medio es justo la operación en la que se queda
    // un «5» duplicado y nadie lo ve.
    const numeros = [...PAGINA.matchAll(/text-weight-bold">\s*(\d+)\./g)].map(
      (m) => Number(m[1]),
    );

    expect(numeros.length).toBeGreaterThan(5);
    expect(numeros).toEqual(numeros.map((_n, i) => i + 1));
  });

  it('la versión y la fecha de la política avanzan cuando cambia el contenido', () => {
    expect(PAGINA).toContain("POLICY_VERSION = '1.1'");
    expect(PAGINA).toContain('30 de septiembre de 2026');
  });
});
