/**
 * Flujo 2 — registro, reserva con la sesión iniciada y cancelación.
 *
 * Crear cuenta (con la casilla de la política marcada a mano) → catálogo →
 * reservar con la sesión iniciada → «Ver mis reservas» muestra la cita como
 * pendiente → cancelarla → la misma tarjeta pasa a «Cancelada».
 *
 * Toda la navegación tras el registro es dentro del portal (clics, no `goto`):
 * el token vive solo en memoria y una recarga lo perdería.
 */
import { test, expect } from '@playwright/test';
import {
  CONTRASENA_DE_PRUEBA,
  MARCA,
  abrirCajon,
  anadirPrimerServicio,
  continuar,
  correoDePrueba,
  elegirPrimeraHora,
} from './apoyo';

test('una clienta se registra, reserva con su cuenta y cancela la cita en «Mis reservas»', async ({
  page,
}) => {
  const nombre = `Clienta Registrada E2E ${MARCA}`;
  const correo = correoDePrueba('cuenta');

  // 1. Registro. Vuelve al catálogo (`redirect`), sin recargar.
  await page.goto('/auth/register?redirect=/services');
  await expect(
    page.getByRole('heading', { name: 'Crea tu cuenta' })
  ).toBeVisible();
  await page.getByLabel('Nombre completo').fill(nombre);
  await page.getByLabel('Correo').fill(correo);
  await page
    .getByLabel('Contraseña', { exact: true })
    .fill(CONTRASENA_DE_PRUEBA);
  await page.getByLabel('Repite la contraseña').fill(CONTRASENA_DE_PRUEBA);
  const casilla = page.getByRole('checkbox', { name: /He leído y acepto la/ });
  await expect(casilla).not.toBeChecked();
  await casilla.check();
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  await expect(page).toHaveURL(/\/services$/);

  // 2. Reserva con la sesión iniciada: el cajón no pide nombre ni casilla.
  const servicio = await anadirPrimerServicio(page);
  const cajon = await abrirCajon(page);
  await expect(cajon.getByText(servicio, { exact: true })).toBeVisible();
  await continuar(page);
  await elegirPrimeraHora(cajon);
  await continuar(page);
  await expect(
    cajon.getByRole('heading', { name: 'Reservas como' })
  ).toBeVisible();
  await expect(cajon.getByText(correo)).toBeVisible();
  await page.waitForTimeout(450);
  await cajon.getByRole('button', { name: 'Confirmar reserva' }).click();
  await expect(
    cajon.getByRole('heading', { name: 'Tu cita quedó registrada' })
  ).toBeVisible();

  // 3. «Mis reservas» la muestra pendiente.
  await cajon.getByRole('button', { name: 'Ver mis reservas' }).click();
  await expect(page).toHaveURL(/\/mis-reservas$/);
  await expect(
    page.getByRole('heading', { name: 'Mis reservas', level: 1 })
  ).toBeVisible();
  const tarjeta = page
    .locator('[data-test="tarjeta-reserva"]')
    .filter({ hasText: servicio });
  await expect(tarjeta).toHaveCount(1);
  const estado = tarjeta.locator('[data-test="estado-reserva"]');
  await expect(estado).toHaveText('Pendiente');

  // 4. Cancelarla.
  await tarjeta.getByRole('button', { name: /^Cancelar la cita del / }).click();
  const dialogo = page.locator('[data-test="cancelar-reserva"]');
  await expect(dialogo.getByText(/¿Cancelar tu cita del /)).toBeVisible();
  await dialogo.getByRole('button', { name: 'Sí, cancelar la cita' }).click();

  await expect(page.getByText(/quedó cancelada\.$/)).toBeVisible();
  await expect(estado).toHaveText('Cancelada');
  await expect(estado).toHaveAttribute('data-estado', 'cancelada');
});
