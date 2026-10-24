/**
 * La pila es la segura (Review Focus 1 de la F7). Corre antes que los flujos
 * (proyecto `pila`, del que depende `chromium`): si falla, no corre ninguno.
 *
 * Comprueba, contra la API que arrancó el propio arnés:
 * 1. `GET http://127.0.0.1:3101/api/health` responde 200;
 * 2. el registro de la API (`test-results/e2e-registros/api.log`, escrito con
 *    `tee` desde el `webServer`) muestra el arranque, y que el aviso de
 *    WhatsApp de una reserva sale por el adaptador de consola
 *    (`[WhatsAppSender:console]` + `--- WHATSAPP SIMULADO ---`), sin rastro de
 *    la Cloud API ni del proveedor de correo;
 * 3. esa reserva quedó en `HairSalonE2E`.
 *
 * Por qué hace falta una reserva: el backend no anuncia en el arranque qué
 * adaptador eligió (`notifications.module.ts`, la fábrica de `WHATSAPP_SENDER`
 * no escribe nada); la única huella de la consola es el mensaje simulado. La
 * reserva es segura aunque esta prueba fallara: `entornoApi()` vacía también
 * `WHATSAPP_PHONE_NUMBER_ID`, con lo que la Cloud API lanzaría antes de ir a
 * la red, y el número de la dueña es uno de prueba.
 */
import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { MARCA, crearReservaManana, telefonoDePrueba } from './apoyo';
import { BD_E2E, REGISTRO_API, URL_SALUD, psql } from './pila.mjs';

const registro = () => readFileSync(REGISTRO_API, 'utf8');

test('la API de la pila responde en 3101, avisa por consola y escribe en HairSalonE2E', async ({
  request,
}) => {
  // 1. Salud.
  const salud = await request.get(URL_SALUD);
  expect(salud.status()).toBe(200);
  expect(await salud.json()).toMatchObject({ ok: true });

  // 2a. El registro es el de esta API, ya arrancada.
  expect(registro()).toContain('Nest application successfully started');

  // 2b. Un aviso de WhatsApp sale por la consola.
  const telefono = telefonoDePrueba(0);
  const reserva = await crearReservaManana(request, {
    name: `Pila Segura E2E ${MARCA}`,
    phone: telefono,
  });
  // La línea del logger y el sobre del mensaje simulado, con el número de ESTA
  // reserva (no vale un aviso de otra).
  const huella = new RegExp(
    `\\[WhatsAppSender:console\\]\\s*\\n--- WHATSAPP SIMULADO ---\\nPara: 57${telefono}\\n`
  );
  await expect
    .poll(() => huella.test(registro()), {
      message:
        'el aviso de WhatsApp de la reserva debe salir por el adaptador de consola',
      timeout: 15_000,
    })
    .toBe(true);
  const texto = registro();
  expect(texto).not.toContain('Cloud API de WhatsApp');
  expect(texto).not.toContain('WHATSAPP_PHONE_NUMBER_ID no está configurado');
  expect(texto).not.toContain('EmailSender:resend');

  // 3. La reserva vive en la base E2E.
  const enE2E = psql(
    BD_E2E,
    `SELECT count(*) FROM reservations WHERE id = '${reserva.id}'`,
    {
      tuplas: true,
    }
  ).trim();
  expect(enE2E).toBe('1');
});
