/**
 * Flujo 6 — eliminar la cuenta desde «Mi cuenta».
 *
 * La clienta (ficticia) se registra por la API y reserva mañana con su sesión;
 * entra por el portal, abre «Mi cuenta → Cerrar sesión → Eliminar mi cuenta» y
 * confirma con la contraseña. Vuelve a la portada con el aviso y sin sesión;
 * ya no puede entrar, su sesión anterior no se renueva y la cita sigue: la
 * propietaria la ve en la bandeja con el nombre y el teléfono (o el correo si
 * no dio teléfono). Además: confirmación errónea no borra nada; una cuenta de
 * administración no ve la acción y la API la rechaza (403).
 */
import {
  test,
  expect,
  type APIRequestContext,
  type Browser,
  type Page,
} from '@playwright/test';
import {
  CONTRASENA_DE_PRUEBA,
  MARCA,
  URL_API,
  correoDePrueba,
  disponibilidad,
  hoyEnBogota,
  instanteDeBogota,
  primerHuecoLibre,
  servicios,
  sumarDias,
  telefonoDePrueba,
} from './apoyo';
import { PROPIETARIA, URL_PORTAL, asegurarPropietaria } from './pila.mjs';

test.beforeAll(async () => {
  await asegurarPropietaria();
});

async function registrar(
  request: APIRequestContext,
  nombre: string,
  correo: string
): Promise<string> {
  const r = await request.post(`${URL_API}/auth/register`, {
    data: {
      fullName: nombre,
      email: correo,
      password: CONTRASENA_DE_PRUEBA,
      dataPolicyAccepted: true,
    },
  });
  expect(r.status(), `register → ${r.status()} ${await r.text()}`).toBe(201);
  return ((await r.json()) as { token: string }).token;
}

/** Reserva mañana con la sesión de la clienta; `contacto` es opcional. */
async function reservarConCuenta(
  request: APIRequestContext,
  token: string,
  contacto?: { name: string; phone: string }
): Promise<string> {
  const ymd = sumarDias(hoyEnBogota(), 1);
  const [servicio] = await servicios(request);
  const d = await disponibilidad(request, ymd);
  for (const w of d.workers.filter((x) => x.assignable)) {
    const hora = primerHuecoLibre(d, w.id, servicio.duration);
    if (!hora) continue;
    const r = await request.post(`${URL_API}/reservations`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        scheduledAt: instanteDeBogota(ymd, hora),
        serviceIds: [servicio.id],
        workerId: w.id,
        ...(contacto ? { contact: contacto } : {}),
      },
    });
    expect(r.status(), `POST /reservations → ${await r.text()}`).toBe(201);
    return ((await r.json()) as { id: string }).id;
  }
  throw new Error('Mañana no queda hueco.');
}

const SESION = '/mi-cuenta';

/** En «Mi cuenta», sección «Cerrar sesión» (el índice lateral; sin recargar). */
async function irASesion(page: Page) {
  await page
    .locator('[data-test="lateral-cuenta"]')
    .getByText('Cerrar sesión')
    .click();
  await expect(page).toHaveURL(/seccion=sesion/);
}

async function entrarEnElPortal(
  page: Page,
  correo: string,
  clave: string,
  destino = '/'
) {
  await page.goto(`/auth/login?redirect=${encodeURIComponent(destino)}`);
  await page.getByLabel('Correo').fill(correo);
  await page.getByLabel('Contraseña', { exact: true }).fill(clave);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(destino === '/' ? /\/$/ : /\/mi-cuenta/);
}

async function tokenDe(
  request: APIRequestContext,
  correo: string,
  clave: string
) {
  const r = await request.post(`${URL_API}/auth/login`, {
    data: { email: correo, password: clave },
  });
  expect(r.status()).toBe(201);
  return ((await r.json()) as { token: string }).token;
}

async function reservaEnLaListaDeLaDuena(
  request: APIRequestContext,
  id: string
) {
  const token = await tokenDe(
    request,
    PROPIETARIA.correo,
    PROPIETARIA.contrasena
  );
  const r = await request.get(`${URL_API}/reservations`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(r.status()).toBe(200);
  const lista = (await r.json()) as {
    id: string;
    status: string;
    userId: string | null;
    contact: { name?: string; phone?: string; email?: string } | null;
  }[];
  const reserva = lista.find((x) => x.id === id);
  expect(
    reserva,
    'la reserva sigue en la lista de la propietaria'
  ).toBeTruthy();
  return reserva!;
}

/**
 * Desde la sesión recién iniciada en «Mi cuenta»: va a «Cerrar sesión» por el
 * índice lateral (sin recargar: el token vive en memoria), pulsa «Eliminar mi
 * cuenta» y devuelve el diálogo abierto.
 */
async function abrirEliminar(page: Page) {
  await irASesion(page);
  const abrir = page.locator('[data-test="eliminar-cuenta"]');
  await abrir.scrollIntoViewIfNeeded();
  await expect(abrir).toBeVisible();
  await abrir.click();
  const dialogo = page.locator('[data-test="eliminar-dialogo"]');
  await expect(dialogo).toBeVisible();
  return dialogo;
}

test('con teléfono: la clienta elimina su cuenta y su cita sigue en la bandeja con nombre y teléfono', async ({
  page,
  request,
  browser,
}) => {
  const nombre = `Clienta Eliminar E2E ${MARCA}`;
  const correo = correoDePrueba('elim-tel');
  const telefono = telefonoDePrueba(41);
  const token = await registrar(request, nombre, correo);
  const id = await reservarConCuenta(request, token, {
    name: nombre,
    phone: telefono,
  });
  // c4: una cita «para otra persona» (contacto con otro nombre) con su cuenta.
  const otraPersona = `Otra Persona E2E ${MARCA}`;
  const idOtra = await reservarConCuenta(request, token, {
    name: otraPersona,
    phone: telefonoDePrueba(42),
  });
  // c5: una reseña con el nombre que ella puso.
  const nombreResena = `Nombre Propio E2E ${MARCA}`;
  const resena = await request.post(`${URL_API}/reviews`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      name: nombreResena,
      description: 'Reseña de prueba del flujo E2E',
      score: 5,
    },
  });
  expect(resena.status()).toBe(201);
  expect(
    JSON.stringify(await (await request.get(`${URL_API}/reviews`)).json())
  ).toContain(nombreResena);
  // La cookie de renovación del registro existe antes de borrar.
  const antes = await request.storageState();
  expect(antes.cookies.some((c) => c.name === 'marlene_rt')).toBe(true);

  await entrarEnElPortal(page, correo, CONTRASENA_DE_PRUEBA, SESION);
  const dialogo = await abrirEliminar(page);

  // c6: una contraseña equivocada no borra nada.
  await dialogo.locator('#eliminar-clave').fill('ClaveEquivocada1');
  await dialogo.locator('[data-test="eliminar-confirmar"]').click();
  await expect(dialogo.locator('[data-test="eliminar-error"]')).toBeVisible();
  await expect(dialogo).toBeVisible();
  await tokenDe(request, correo, CONTRASENA_DE_PRUEBA); // sigue pudiendo entrar

  // c1: con la contraseña buena se elimina.
  await dialogo.locator('#eliminar-clave').fill(CONTRASENA_DE_PRUEBA);
  await dialogo.locator('[data-test="eliminar-confirmar"]').click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText('Tu cuenta se eliminó')).toBeVisible();
  await expect(page.getByRole('link', { name: /Mi cuenta/ })).toHaveCount(0);

  // c2: ya no puede entrar; la sesión anterior no se renueva.
  const intento = await request.post(`${URL_API}/auth/login`, {
    data: { email: correo, password: CONTRASENA_DE_PRUEBA },
  });
  expect(intento.status()).toBe(401);
  const renovar = await request.post(`${URL_API}/auth/refresh`);
  expect(renovar.status()).toBe(401);
  const vieja = await request.get(`${URL_API}/reservations/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(vieja.status()).toBe(401);

  // c4: la cita «para otra persona» conserva ese nombre y su teléfono.
  const otra = await reservaEnLaListaDeLaDuena(request, idOtra);
  expect(otra.status).toBe('pendiente');
  expect(otra.userId).toBeNull();
  expect(otra.contact?.name).toBe(otraPersona);
  expect(otra.contact?.phone).toContain(telefonoDePrueba(42).slice(-7));

  // c5: la reseña se queda sin el nombre de la clienta.
  const resenas = JSON.stringify(
    await (await request.get(`${URL_API}/reviews`)).json()
  );
  expect(resenas).not.toContain(nombreResena);
  expect(resenas).toContain('Clienta del salón');

  // c3: la cita sigue, sin cancelar, con nombre y teléfono, sin cuenta.
  const reserva = await reservaEnLaListaDeLaDuena(request, id);
  expect(reserva.status).toBe('pendiente');
  expect(reserva.userId).toBeNull();
  expect(reserva.contact?.name).toBe(nombre);
  expect(reserva.contact?.phone).toContain(telefono.slice(-7));

  // …y la propietaria la ve en el portal.
  const ctx = await (browser as Browser).newContext({ baseURL: URL_PORTAL });
  const duena = await ctx.newPage();
  await duena.goto('/auth/login?redirect=/reservas');
  await duena.getByLabel('Correo').fill(PROPIETARIA.correo);
  await duena
    .getByLabel('Contraseña', { exact: true })
    .fill(PROPIETARIA.contrasena);
  await duena.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(duena).toHaveURL(/\/reservas$/);
  const fila = duena
    .locator('[data-test="fila-reserva"]')
    .filter({ hasText: nombre });
  await expect(fila).toHaveCount(1);
  await fila.locator('[data-test="abrir-reserva"]').click();
  await expect(duena.locator('[data-test="detalle-contacto"]')).toContainText(
    telefono.slice(-7)
  );
  await ctx.close();
});

test('sin teléfono: la cita queda con el nombre de la cuenta y la propietaria ve el correo', async ({
  page,
  request,
  browser,
}) => {
  const nombre = `Clienta SinTel E2E ${MARCA}`;
  const correo = correoDePrueba('elim-correo');
  const token = await registrar(request, nombre, correo);
  const id = await reservarConCuenta(request, token);

  await entrarEnElPortal(page, correo, CONTRASENA_DE_PRUEBA, SESION);
  const dialogo = await abrirEliminar(page);
  await dialogo.locator('#eliminar-clave').fill(CONTRASENA_DE_PRUEBA);
  await dialogo.locator('[data-test="eliminar-confirmar"]').click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText('Tu cuenta se eliminó')).toBeVisible();

  const reserva = await reservaEnLaListaDeLaDuena(request, id);
  expect(reserva.status).toBe('pendiente');
  expect(reserva.userId).toBeNull();
  expect(reserva.contact?.name).toBe(nombre);
  expect(reserva.contact?.phone || null).toBeNull();
  expect(reserva.contact?.email).toBe(correo);

  const ctx = await (browser as Browser).newContext({ baseURL: URL_PORTAL });
  const duena = await ctx.newPage();
  await duena.goto('/auth/login?redirect=/reservas');
  await duena.getByLabel('Correo').fill(PROPIETARIA.correo);
  await duena
    .getByLabel('Contraseña', { exact: true })
    .fill(PROPIETARIA.contrasena);
  await duena.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(duena).toHaveURL(/\/reservas$/);
  const fila = duena
    .locator('[data-test="fila-reserva"]')
    .filter({ hasText: nombre });
  await expect(fila).toHaveCount(1);
  await fila.locator('[data-test="abrir-reserva"]').click();
  await expect(duena.locator('[data-test="detalle-contacto"]')).toContainText(
    correo
  );
  await ctx.close();
});

test('una cuenta de administración no ve «Eliminar mi cuenta» y la API la rechaza con 403', async ({
  page,
  request,
}) => {
  await entrarEnElPortal(
    page,
    PROPIETARIA.correo,
    PROPIETARIA.contrasena,
    SESION
  );
  await irASesion(page);
  // Primero que la sección esté pintada; solo entonces la ausencia vale.
  await expect(page.getByText('Cerrar sesión en todos').first()).toBeVisible();
  await expect(page.locator('[data-test="bloque-eliminar"]')).toHaveCount(0);
  await expect(page.locator('[data-test="eliminar-cuenta"]')).toHaveCount(0);

  const token = await tokenDe(
    request,
    PROPIETARIA.correo,
    PROPIETARIA.contrasena
  );
  const r = await request.delete(`${URL_API}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { password: PROPIETARIA.contrasena },
  });
  expect(r.status()).toBe(403);
  await tokenDe(request, PROPIETARIA.correo, PROPIETARIA.contrasena); // sigue
});
