/**
 * Flujo 1 — reserva sin cuenta, de la portada a la pantalla de éxito.
 *
 * Portada → catálogo → un servicio a la bolsa → cajón → primer día con huecos
 * y primera hora habilitada → datos de contacto con el consentimiento marcado
 * a mano → «Confirmar reserva». Debe verse «Tu cita quedó registrada».
 */
import { test, expect } from '@playwright/test';
import {
  MARCA,
  abrirCajon,
  anadirPrimerServicio,
  continuar,
  elegirPrimeraHora,
  irAlCatalogoDesdePortada,
  telefonoDePrueba,
} from './apoyo';

test('una visitante sin cuenta reserva desde la portada y ve la pantalla de éxito', async ({
  page,
}) => {
  await irAlCatalogoDesdePortada(page);
  const servicio = await anadirPrimerServicio(page);
  const cajon = await abrirCajon(page);

  // Paso 1: la bolsa trae el servicio elegido.
  await expect(cajon.getByText(servicio, { exact: true })).toBeVisible();
  await continuar(page);

  // Paso 2: el cajón propone el primer día con huecos; se toma la primera hora.
  await elegirPrimeraHora(cajon);
  await continuar(page);

  // Paso 3: datos de contacto; la casilla nunca viene marcada.
  await expect(
    cajon.getByRole('heading', { name: 'Tus datos de contacto' })
  ).toBeVisible();
  await cajon.getByLabel('Nombre').fill(`Visitante E2E ${MARCA}`);
  await cajon.getByLabel('Teléfono').fill(telefonoDePrueba(1));
  const casilla = cajon.getByRole('checkbox', {
    name: /Autorizo el tratamiento de mis datos/,
  });
  await expect(casilla).not.toBeChecked();
  await casilla.check();
  await page.waitForTimeout(450);
  await cajon.getByRole('button', { name: 'Confirmar reserva' }).click();

  await expect(
    cajon.getByRole('heading', { name: 'Tu cita quedó registrada' })
  ).toBeVisible();
  await expect(cajon.getByText(servicio).first()).toBeVisible();
});
