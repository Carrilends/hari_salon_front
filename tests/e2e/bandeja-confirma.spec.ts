/**
 * Flujo 3 — la propietaria confirma una reserva en la bandeja.
 *
 * Una reserva sin cuenta creada por la API (mañana, primer hueco libre) →
 * la propietaria de prueba entra → la bandeja («Pendientes») la muestra
 * pendiente → «Confirmar» → en «Confirmadas» aparece como confirmada.
 *
 * La propietaria `duena.e2e@example.test` se registra por la API y se promueve
 * a `admin` con SQL dentro de `HairSalonE2E` (`asegurarPropietaria`).
 */
import { test, expect } from '@playwright/test';
import { MARCA, crearReservaManana, telefonoDePrueba } from './apoyo';
import { PROPIETARIA, asegurarPropietaria } from './pila.mjs';

test.beforeAll(async () => {
  await asegurarPropietaria();
});

test('la propietaria ve pendiente una reserva nueva y la confirma desde la bandeja', async ({
  page,
  request,
}) => {
  const clienta = `Clienta Bandeja E2E ${MARCA}`;
  await crearReservaManana(request, {
    name: clienta,
    phone: telefonoDePrueba(3),
  });

  // Entra como propietaria; el `redirect` la deja en la bandeja sin recargar.
  await page.goto('/auth/login?redirect=/reservas');
  await page.getByLabel('Correo').fill(PROPIETARIA.correo);
  await page
    .getByLabel('Contraseña', { exact: true })
    .fill(PROPIETARIA.contrasena);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/reservas$/);
  await expect(
    page.getByRole('heading', { name: 'Reservas', level: 1 })
  ).toBeVisible();

  // La bandeja abre en «Pendientes» y la muestra pendiente.
  await expect(page.getByRole('tab', { name: /^Pendientes/ })).toHaveAttribute(
    'aria-selected',
    'true'
  );
  const fila = page
    .locator('[data-test="fila-reserva"]')
    .filter({ hasText: clienta });
  await expect(fila).toHaveCount(1);
  await expect(fila.locator('[data-test="estado-fila"]')).toHaveText(
    'Pendiente'
  );

  // Confirmarla.
  await fila
    .getByRole('button', { name: `Confirmar la reserva de ${clienta}` })
    .click();
  await expect(fila).toHaveCount(0); // sale de «Pendientes»

  await page.getByRole('tab', { name: /^Confirmadas/ }).click();
  const confirmada = page
    .locator('[data-test="fila-reserva"]')
    .filter({ hasText: clienta });
  await expect(confirmada).toHaveCount(1);
  await expect(confirmada.locator('[data-test="estado-fila"]')).toHaveText(
    'Confirmada'
  );
});
