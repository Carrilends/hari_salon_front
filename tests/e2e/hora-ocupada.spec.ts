/**
 * Flujo 4 — dos personas piden la misma hora con la misma estilista.
 *
 * 1. Se lee por la API el primer hueco libre de mañana de una estilista para
 *    el servicio que se va a pedir.
 * 2. En el portal, una visitante elige ese servicio, esa estilista, ese día y
 *    esa hora, y llena sus datos.
 * 3. Antes de que confirme, «otra persona» ocupa ese hueco por la API.
 * 4. La visitante confirma: el cajón comprueba de nuevo y la devuelve a
 *    «Cuándo» con el aviso de disponibilidad cambiada.
 *
 * El hueco se ocupa entre los pasos 2 y 4, y no antes de abrir el cajón: el
 * cajón no deja elegir una hora que ya sabe ocupada (la ficha sale
 * deshabilitada), así que ocuparla antes solo probaría eso. El texto esperado
 * es el de `irACambio` en `src/composables/booking/useCajonReserva.ts`:
 * «La disponibilidad cambió y ya no hay tiempo suficiente con <estilista> a
 * las <hora>.»
 */
import { test, expect } from '@playwright/test';
import {
  MARCA,
  abrirCajon,
  anadirPrimerServicio,
  continuar,
  crearReserva,
  disponibilidad,
  fechaLarga,
  horaCorta,
  hoyEnBogota,
  irAlCatalogoDesdePortada,
  literal,
  primerHuecoLibre,
  servicios,
  sumarDias,
  telefonoDePrueba,
} from './apoyo';

test('si otra persona toma la hora mientras se reserva, el cajón avisa que la disponibilidad cambió', async ({
  page,
  request,
}) => {
  // El servicio que la visitante añadirá: el primero del catálogo.
  await irAlCatalogoDesdePortada(page);
  const nombreServicio = await anadirPrimerServicio(page);
  const servicio = (await servicios(request, nombreServicio)).find(
    (s) => s.name === nombreServicio
  );
  expect(servicio, `«${nombreServicio}» en POST /service/search`).toBeTruthy();

  // 1. Primer hueco libre de mañana, con la primera estilista que lo tenga.
  const manana = sumarDias(hoyEnBogota(), 1);
  const dispo = await disponibilidad(request, manana);
  let elegida: { id: string; name: string; hora: string } | null = null;
  for (const w of dispo.workers.filter((x) => x.assignable)) {
    const hora = primerHuecoLibre(dispo, w.id, servicio!.duration);
    if (hora) {
      elegida = { id: w.id, name: w.name, hora };
      break;
    }
  }
  expect(elegida, `hueco libre el ${manana}`).not.toBeNull();
  const { id: estilistaId, name: estilista, hora } = elegida!;

  // 2. La visitante elige esa estilista, ese día y esa hora.
  const cajon = await abrirCajon(page);
  await continuar(page);
  await cajon
    .locator('[data-test="fichas-estilista"]')
    .getByRole('button', { name: new RegExp(`^${literal(estilista)}\\b`) })
    .click();
  await cajon
    .getByRole('button', {
      name: new RegExp(`^${literal(fechaLarga(manana))},`),
    })
    .click();
  const ficha = cajon
    .locator('[data-test="fichas-hora"]')
    .getByRole('button', { name: horaCorta(hora), exact: true });
  await expect(ficha).toBeEnabled();
  await ficha.click();
  await expect(ficha).toHaveAttribute('aria-pressed', 'true');
  await continuar(page);

  await expect(
    cajon.getByRole('heading', { name: 'Tus datos de contacto' })
  ).toBeVisible();
  await expect(cajon.getByText(`con ${estilista}`)).toBeVisible();
  await cajon.getByLabel('Nombre').fill(`Segunda Persona E2E ${MARCA}`);
  await cajon.getByLabel('Teléfono').fill(telefonoDePrueba(5));
  await cajon
    .getByRole('checkbox', { name: /Autorizo el tratamiento de mis datos/ })
    .check();

  // 3. Otra persona toma ese mismo hueco con esa misma estilista.
  await crearReserva(request, {
    ymd: manana,
    hora,
    serviceIds: [servicio!.id],
    workerId: estilistaId,
    contacto: {
      name: `Primera Persona E2E ${MARCA}`,
      phone: telefonoDePrueba(4),
    },
  });

  // 4. La visitante confirma y ve el aviso, de vuelta en «Cuándo».
  await page.waitForTimeout(450);
  await cajon.getByRole('button', { name: 'Confirmar reserva' }).click();
  const aviso = cajon.getByRole('alert');
  await expect(aviso).toContainText(
    `La disponibilidad cambió y ya no hay tiempo suficiente con ${estilista} a las ${horaCorta(
      hora
    )}.`
  );
  await expect(
    cajon.getByRole('heading', { name: 'A qué hora' })
  ).toBeVisible();
  await expect(
    cajon.getByRole('heading', { name: 'Tu cita quedó registrada' })
  ).toHaveCount(0);
});
