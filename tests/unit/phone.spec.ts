/**
 * El número de la peluquería vivía escrito a mano en dos componentes
 * (`bookingDialog.vue` y `ourContact.vue`). Ahora sale de un solo sitio y puede
 * sustituirse por entorno (`VITE_WHATSAPP_PHONE`), así que estas pruebas fijan
 * dos cosas: que el formato de presentación se deriva de los dígitos, y que el
 * número que publica Schema.org (`SALON_PHONE`) es el mismo que abre WhatsApp.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { onlyDigits, telHref, formatSalonPhone } from 'src/helpers/phone';
import { SALON_PHONE, SALON_PHONE_E164 } from 'src/constants/salon-location';

describe('teléfono del salón', () => {
  it('se queda solo con los dígitos', () => {
    expect(onlyDigits('+57 320 897 74 71')).toBe('573208977471');
    expect(onlyDigits('')).toBe('');
  });

  it('construye el href de llamada en E.164', () => {
    expect(telHref('573208977471')).toBe('tel:+573208977471');
  });

  it('presenta un móvil colombiano agrupado como lo leería una clienta', () => {
    expect(formatSalonPhone('573208977471')).toBe('+57 320 897 74 71');
  });

  it('con un número que no encaja en el patrón colombiano no inventa grupos', () => {
    expect(formatSalonPhone('34911223344')).toBe('+34911223344');
  });

  it('el número de Schema.org y el de WhatsApp son el mismo', () => {
    // Si alguien cambia uno y olvida el otro, el portal diría un número por
    // escrito y abriría otro al pulsar. Esta es la red.
    expect(onlyDigits(SALON_PHONE)).toBe(SALON_PHONE_E164);
  });
});

/**
 * Los dos componentes que abren WhatsApp o marcan el teléfono llevaban el
 * número escrito a mano. Se lee el fuente como texto —montar un diálogo de
 * Quasar exigiría media aplicación para comprobar dos atributos— y se vigila
 * que nadie lo vuelva a incrustar.
 */
describe('los componentes no vuelven a incrustar el número', () => {
  const fuente = (ruta: string) =>
    readFileSync(join(__dirname, '../../src', ruta), 'utf8');

  it.each([
    ['components/dialogs/ourContact.vue'],
    ['components/dialogs/bookingDialog.vue'],
  ])('%s lo toma de `whatsapp-phone` y no lo escribe', (ruta) => {
    const texto = fuente(ruta);

    expect(texto).not.toMatch(/\b573208977471\b/);
    expect(texto).toContain("from 'src/constants/whatsapp-phone'");
    expect(texto).toContain('WHATSAPP_PHONE');
  });
});
