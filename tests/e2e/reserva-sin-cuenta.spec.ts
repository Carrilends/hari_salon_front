/**
 * Flujo 1 — reserva sin cuenta, de la portada a la pantalla de éxito.
 *
 * Portada → catálogo → un servicio a la bolsa → cajón → primer día con huecos
 * y primera hora habilitada → datos de contacto con el consentimiento marcado
 * a mano → «Confirmar reserva». Debe verse «Tu cita quedó registrada».
 *
 * Además comprueba adónde fue la reserva: el `POST` del navegador sale al
 * propio portal (`http://localhost:9100/api/reservations`, el proxy hacia el
 * 3101; `VITE_API_URL=/api` va fijada en el entorno del portal) y la fila
 * aparece en `HairSalonE2E`.
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
import { BD_E2E, URL_PORTAL, psql } from './pila.mjs';

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
  const nombre = `Visitante E2E ${MARCA}`;
  await cajon.getByLabel('Nombre').fill(nombre);
  await cajon.getByLabel('Teléfono').fill(telefonoDePrueba(1));
  const casilla = cajon.getByRole('checkbox', {
    name: /Autorizo el tratamiento de mis datos/,
  });
  await expect(casilla).not.toBeChecked();
  await casilla.check();
  await page.waitForTimeout(450);
  const envio = page.waitForResponse(
    (r) =>
      r.request().method() === 'POST' &&
      new URL(r.url()).pathname === '/api/reservations'
  );
  await cajon.getByRole('button', { name: 'Confirmar reserva' }).click();
  const respuesta = await envio;
  expect(respuesta.url()).toBe(`${URL_PORTAL}/api/reservations`);
  expect(respuesta.status()).toBe(201);
  const { id } = (await respuesta.json()) as { id: string };

  await expect(
    cajon.getByRole('heading', { name: 'Tu cita quedó registrada' })
  ).toBeVisible();
  await expect(cajon.getByText(servicio).first()).toBeVisible();

  // La reserva de la visitante quedó en la base E2E, con su nombre.
  const fila = psql(
    BD_E2E,
    `SELECT customer_name FROM reservations WHERE id = '${id}'`,
    { tuplas: true }
  ).trim();
  expect(fila).toBe(nombre);
});
