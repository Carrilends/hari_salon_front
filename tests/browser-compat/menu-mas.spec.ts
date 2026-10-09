/**
 * El menú «Más» en un navegador de verdad (spec del menú §8): lo que jsdom no
 * puede comprobar —el portal de Quasar, la hoja inferior, los cierres por
 * velo y Escape, los desbordes— en los tres estados de sesión y en los dos
 * anchos del diseño.
 *
 * La sesión se simula como la vive el portal tras recargar: el perfil
 * persistido en `localStorage` (clave `auth`) y la renovación silenciosa de
 * `POST /api/auth/refresh` contestando con un token. El reloj se fija para que
 * la línea del horario sea predecible.
 */
import { test, expect, type Page } from '@playwright/test';
import { irA, json, servirApiVacia } from './api-offline';

const ESCRITORIO = { width: 1280, height: 900 };
const MOVIL = { width: 390, height: 844 };

/** Miércoles 7 de octubre de 2026, 10:00 en Bogotá: laborable. */
const MIERCOLES = new Date('2026-10-07T15:00:00.000Z');
/** Lunes 12 de octubre de 2026 (Día de la Raza), 10:00 en Bogotá: festivo. */
const FESTIVO = new Date('2026-10-12T15:00:00.000Z');

type Perfil = { nombre: string; correo: string; roles: string[] };

const CLIENTA: Perfil = {
  nombre: 'Ana María López',
  correo: 'ana@correo.com',
  roles: ['user'],
};
const DUENA: Perfil = {
  nombre: 'Marlene Rodríguez',
  correo: 'marlene@correo.com',
  roles: ['admin'],
};

async function preparar(page: Page, { perfil, ahora = MIERCOLES }: { perfil?: Perfil; ahora?: Date } = {}) {
  await page.clock.setFixedTime(ahora);
  await servirApiVacia(page);
  if (!perfil) return;
  await page.addInitScript((p) => {
    window.localStorage.setItem(
      'auth',
      JSON.stringify({ fullname: p.nombre, email: p.correo, roles: p.roles, emailVerified: true })
    );
  }, perfil);
  // Registrada DESPUÉS del genérico de `servirApiVacia`: Playwright casa de la
  // última a la primera.
  await page.route(
    (url) => url.pathname === '/api/auth/refresh',
    (route) =>
      route.fulfill(
        json({
          id: 'u1',
          email: perfil.correo,
          fullName: perfil.nombre,
          roles: perfil.roles,
          isActive: true,
          emailVerified: true,
          token: 'cabecera.e30.firma',
          expiresIn: 900,
        })
      )
  );
}

const disparador = (page: Page) => page.locator('button[aria-label="Más opciones"]');
const entrada = (page: Page, id: string) => page.locator(`[data-test="menu-entrada-${id}"]`);
const seccionesVisibles = (page: Page) =>
  page
    .locator('[data-test^="menu-seccion-"]')
    .evaluateAll((nodos) => nodos.map((n) => n.getAttribute('data-test')));

test.describe('menú «Más» · escritorio 1280', () => {
  test.use({ viewport: ESCRITORIO });

  test('sin sesión: cuenta con invitación, peluquería, pie y el horario de hoy', async ({ page }) => {
    await preparar(page);
    await irA(page, '/testimonios');

    await disparador(page).click();
    await expect(page.locator('.more-menu')).toBeVisible();

    expect(await seccionesVisibles(page)).toEqual([
      'menu-seccion-cuenta',
      'menu-seccion-peluqueria',
      'menu-seccion-pie',
    ]);
    await expect(page.locator('[data-test="menu-seccion-cuenta"]')).toContainText(
      'Entra para ver, mover o cancelar tus citas.'
    );
    await expect(entrada(page, 'crear-cuenta')).toHaveAttribute(
      'href',
      /\/auth\/register\?redirect=(%2F|\/)testimonios/
    );
    await expect(page.locator('[data-test="menu-horario-hoy"]')).toHaveText('Hoy · 8:00 a 20:00');
    await expect(entrada(page, 'politica-datos')).toHaveText('Política de tratamiento de datos');
  });

  test('la dueña ve «El salón» y su avatar', async ({ page }) => {
    await preparar(page, { perfil: DUENA });
    await irA(page, '/testimonios');

    await disparador(page).click();

    expect(await seccionesVisibles(page)).toEqual([
      'menu-seccion-cuenta',
      'menu-seccion-salon',
      'menu-seccion-peluqueria',
      'menu-seccion-pie',
    ]);
    await expect(page.locator('[data-test="menu-avatar"]')).toHaveText('MR');
    await expect(entrada(page, 'mis-estilistas')).toBeVisible();
    await expect(entrada(page, 'cerrar-sesion')).toBeVisible();
  });

  test('la clienta no ve «El salón»', async ({ page }) => {
    await preparar(page, { perfil: CLIENTA });
    await irA(page, '/testimonios');

    await disparador(page).click();

    await expect(page.locator('[data-test="menu-avatar"]')).toHaveText('AM');
    await expect(page.locator('[data-test="menu-seccion-salon"]')).toHaveCount(0);
    await expect(entrada(page, 'mis-reservas')).toBeVisible();
  });

  test('el chevrón gira al abrir y Escape cierra devolviendo el estado', async ({ page }) => {
    await preparar(page);
    await irA(page, '/testimonios');

    await disparador(page).click();
    await expect(disparador(page)).toHaveAttribute('aria-expanded', 'true');
    const giro = await page
      .locator('.main-header__chevron')
      .evaluate((el) => getComputedStyle(el).transform);
    expect(giro).not.toBe('none');

    await page.keyboard.press('Escape');
    await expect(page.locator('.more-menu')).toBeHidden();
    await expect(disparador(page)).toHaveAttribute('aria-expanded', 'false');
  });

  test('una entrada lleva a su sitio y cierra el menú', async ({ page }) => {
    await preparar(page);
    await irA(page, '/testimonios');

    await disparador(page).click();
    await entrada(page, 'preguntas-frecuentes').click();

    await expect(page).toHaveURL(/\/preguntas-frecuentes\/?$/);
    await expect(page.locator('.more-menu')).toBeHidden();
  });

  /** Foco de revisión 3. */
  test('la entrada de la página actual también cierra el menú', async ({ page }) => {
    await preparar(page);
    await irA(page, '/preguntas-frecuentes');

    await disparador(page).click();
    await entrada(page, 'preguntas-frecuentes').click();

    await expect(page.locator('.more-menu')).toBeHidden();
    await expect(disparador(page)).toHaveAttribute('aria-expanded', 'false');
  });

  test('«¿Quiénes somos?» y «Horarios» abren sus diálogos y cierran el menú', async ({ page }) => {
    await preparar(page);
    await irA(page, '/testimonios');

    await disparador(page).click();
    await entrada(page, 'horarios').click();
    await expect(page.locator('.more-menu')).toBeHidden();
    await expect(page.locator('.contact-dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.contact-dialog')).toBeHidden();

    await disparador(page).click();
    await entrada(page, 'quienes-somos').click();
    await expect(page.locator('.about-dialog')).toBeVisible();
  });

  test('el foco de teclado se ve en las entradas', async ({ page, browserName }) => {
    await preparar(page);
    await irA(page, '/testimonios');

    await disparador(page).click();
    await entrada(page, 'testimonios').focus();
    // Safari: Tab solo salta a controles de formulario; Opción+Tab recorre enlaces y botones.
    await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab');
    const anillo = await page.evaluate(() => {
      const activo = document.activeElement as HTMLElement;
      const estilo = getComputedStyle(activo);
      return { ancho: estilo.outlineWidth, estilo: estilo.outlineStyle };
    });

    expect(anillo.estilo).toBe('solid');
    expect(anillo.ancho).toBe('2px');
  });

  /** Foco de revisión 5: ventana baja (teléfono tumbado, 844 × 390), la dueña. */
  test('en una ventana baja el desplegable no se sale por abajo y desplaza', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    await preparar(page, { perfil: DUENA });
    await irA(page, '/testimonios');

    await disparador(page).click();
    const menu = page.locator('.more-menu');
    await expect(menu).toBeVisible();
    const medida = await menu.evaluate((el) => ({
      abajo: el.getBoundingClientRect().bottom,
      desplaza: el.scrollHeight > el.clientHeight,
    }));

    expect(medida.abajo).toBeLessThanOrEqual(390);
    expect(medida.desplaza).toBe(true);
  });
});

test.describe('menú «Más» · móvil 390', () => {
  test.use({ viewport: MOVIL });

  test('la hamburguesa abre la hoja inferior, a todo el ancho y pegada abajo', async ({ page }) => {
    await preparar(page);
    await irA(page, '/testimonios');

    await expect(disparador(page)).not.toContainText('Más');
    await disparador(page).click();
    const hoja = page.locator('[data-test="menu-hoja"]');
    await expect(hoja).toBeVisible();
    await expect(disparador(page)).toHaveAttribute('aria-expanded', 'true');
    await page.waitForTimeout(400); // fin del slide-up

    const caja = await hoja.boundingBox();
    expect(caja).not.toBeNull();
    expect(Math.abs(caja!.y + caja!.height - MOVIL.height)).toBeLessThanOrEqual(1);
    expect(Math.round(caja!.width)).toBe(MOVIL.width);
    await expect(page.locator('[data-test="menu-hoja"] h2')).toHaveText('Menú');
  });

  test('se cierra con la X, con Escape y con el velo', async ({ page }) => {
    await preparar(page);
    await irA(page, '/testimonios');
    const hoja = page.locator('[data-test="menu-hoja"]');

    await disparador(page).click();
    await page.locator('[data-test="menu-hoja-cerrar"]').click();
    await expect(hoja).toBeHidden();
    await expect(disparador(page)).toHaveAttribute('aria-expanded', 'false');

    await disparador(page).click();
    await expect(hoja).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(hoja).toBeHidden();

    await disparador(page).click();
    await expect(hoja).toBeVisible();
    await page.mouse.click(MOVIL.width / 2, 30);
    await expect(hoja).toBeHidden();
  });

  test('el velo es el de la paleta', async ({ page }) => {
    await preparar(page);
    await irA(page, '/testimonios');

    await disparador(page).click();
    await expect(page.locator('[data-test="menu-hoja"]')).toBeVisible();
    const velo = await page
      .locator('.menu-hoja-dialogo .q-dialog__backdrop')
      .evaluate((el) => getComputedStyle(el).backgroundColor);

    expect(velo).toBe('rgba(15, 13, 11, 0.52)');
  });

  test('«Horarios» cierra la hoja y abre el diálogo de contacto', async ({ page }) => {
    await preparar(page);
    await irA(page, '/testimonios');

    await disparador(page).click();
    await entrada(page, 'horarios').click();

    await expect(page.locator('[data-test="menu-hoja"]')).toBeHidden();
    await expect(page.locator('.contact-dialog')).toBeVisible();
  });

  test('un festivo muestra el horario reducido', async ({ page }) => {
    await preparar(page, { ahora: FESTIVO });
    await irA(page, '/testimonios');

    await disparador(page).click();

    await expect(page.locator('[data-test="menu-horario-hoy"]')).toHaveText('Hoy · 9:00 a 19:00');
  });

  /** Foco de revisión 4. */
  test('un nombre y un correo larguísimos no arrastran la página', async ({ page }) => {
    await preparar(page, {
      perfil: {
        nombre: 'MariaDelPilarEcheverriMontoyaDeLaCruzYSantamaria Rodríguez',
        correo: 'maria.del.pilar.echeverri.montoya.de.la.cruz@correo-muy-largo.example.com',
        roles: ['user'],
      },
    });
    await irA(page, '/testimonios');

    await disparador(page).click();
    await expect(page.locator('[data-test="menu-avatar"]')).toHaveText('MR');
    const medida = await page.evaluate(() => {
      const nav = document.querySelector('[data-test="menu-hoja"] [data-test="menu-mas"]')!;
      return {
        pagina: document.documentElement.scrollWidth - window.innerWidth,
        nav: nav.scrollWidth - nav.clientWidth,
      };
    });

    expect(medida.pagina).toBeLessThanOrEqual(0);
    expect(medida.nav).toBeLessThanOrEqual(0);
  });

  /** Foco de revisión 5: la dueña en un teléfono pequeño. */
  test('si el menú no cabe, desplaza el cuerpo y la X sigue a la vista', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 560 });
    await preparar(page, { perfil: DUENA });
    await irA(page, '/testimonios');

    await disparador(page).click();
    await expect(page.locator('[data-test="menu-hoja"]')).toBeVisible();
    await expect(page.locator('[data-test="menu-hoja-cerrar"]')).toBeInViewport();
    const desplaza = await page.evaluate(() => {
      const cuerpo = document.querySelector('[data-test="menu-hoja"] [data-test="menu-mas"]')!
        .parentElement!;
      return cuerpo.scrollHeight > cuerpo.clientHeight;
    });

    expect(desplaza).toBe(true);
  });

  test('las entradas miden al menos 44 px', async ({ page }) => {
    await preparar(page, { perfil: CLIENTA });
    await irA(page, '/testimonios');

    await disparador(page).click();
    await expect(page.locator('[data-test="menu-hoja"]')).toBeVisible();
    const altos = await page
      .locator('[data-test="menu-hoja"] [data-test^="menu-entrada-"]')
      .evaluateAll((nodos) => nodos.map((n) => n.getBoundingClientRect().height));
    const disparo = await disparador(page).boundingBox();

    expect(altos.length).toBeGreaterThan(0);
    for (const alto of altos) expect(alto).toBeGreaterThanOrEqual(44);
    expect(disparo!.width).toBeGreaterThanOrEqual(44);
    expect(disparo!.height).toBeGreaterThanOrEqual(44);
  });
});
