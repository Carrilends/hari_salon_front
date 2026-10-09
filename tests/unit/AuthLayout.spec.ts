/**
 * El armazón del acceso en «hoja partida» (A1, A2): formulario sobre hueso y,
 * desde 1024 px, la foto a la derecha con su placa; por debajo, una cabecera
 * de foto o de barra según `meta.acceso.cabecera` de la ruta.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent } from 'vue';
import {
  createMemoryHistory,
  createRouter,
  type RouteRecordRaw,
} from 'vue-router';
import AuthLayout from 'src/auth/layouts/AuthLayout.vue';
import { authRoutes } from 'src/auth/routes';
import { BUSINESS_SCHEDULE_COPY } from 'src/helpers/businessHours';
import { SALON_LOCALITY, SALON_STREET } from 'src/constants/salon-location';

const Vacio = defineComponent({ template: '<div data-test="pagina-hija" />' });
const App = defineComponent({ template: '<router-view />' });

/** Las rutas de verdad (con su `meta`), con páginas vacías en vez de las reales. */
const crearRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: Vacio },
      {
        path: '/politica-tratamiento-datos',
        name: 'privacy-policy',
        component: Vacio,
      },
      {
        path: '/auth',
        component: AuthLayout,
        children: (authRoutes.children ?? []).map(
          (hija): RouteRecordRaw => ({
            path: hija.path,
            name: hija.name,
            meta: hija.meta,
            component: Vacio,
          })
        ),
      },
    ],
  });

async function montarEn(ruta: string) {
  const router = crearRouter();
  await router.push(ruta);
  await router.isReady();
  const wrapper = mount(App, { global: { plugins: [router] } });
  await flushPromises();
  return wrapper;
}

const FUENTE = readFileSync(
  join(__dirname, '../../src/auth/layouts/AuthLayout.vue'),
  'utf8'
);
const ESTILOS = FUENTE.slice(FUENTE.indexOf('<style'));
const GLOBALES = FUENTE.slice(FUENTE.indexOf('<style lang="scss">'));

describe('qué cabecera pide cada ruta (meta.acceso.cabecera)', () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [authRoutes],
  });

  it.each([
    ['/auth/login', 'foto'],
    ['/auth/verificar-correo', 'foto'],
    ['/auth/register', 'barra'],
    ['/auth/olvide-contrasena', 'barra'],
    ['/auth/restablecer', 'barra'],
  ])('%s → %s', (ruta, cabecera) => {
    expect(router.resolve(ruta).meta.acceso).toEqual({ cabecera });
  });
});

describe('AuthLayout', () => {
  it.each([
    ['/auth/login', 'foto'],
    ['/auth/verificar-correo', 'foto'],
    ['/auth/register', 'barra'],
    ['/auth/olvide-contrasena', 'barra'],
    ['/auth/restablecer', 'barra'],
  ])('%s pinta la cabecera de móvil «%s»', async (ruta, cabecera) => {
    const wrapper = await montarEn(ruta);

    expect(wrapper.find('[data-test="cabecera-foto"]').exists()).toBe(
      cabecera === 'foto'
    );
    expect(wrapper.find('[data-test="cabecera-barra"]').exists()).toBe(
      cabecera === 'barra'
    );
  });

  it('la cabecera de foto lleva la X «Volver al portal», que va al inicio', async () => {
    const wrapper = await montarEn('/auth/login');
    const volver = wrapper.findAll('[data-test="volver-portal"]');
    const equis = volver.filter(
      (v) => v.attributes('aria-label') === 'Volver al portal'
    );

    expect(volver).toHaveLength(2);
    expect(equis).toHaveLength(1);
    expect(equis[0].attributes('href')).toBe('/');
    // Enlace con aspecto de botón: hereda el realce y el hundido (§7.11).
    expect(equis[0].classes()).toContain('m-boton');
    expect(wrapper.find('[data-test="cabecera-foto"]').text()).toContain(
      'MARLENE'
    );
  });

  it('la barra lleva «← Entrar» al login y la marca al inicio', async () => {
    const wrapper = await montarEn('/auth/register');
    const entrar = wrapper.find('[data-test="ir-a-entrar-cabecera"]');

    expect(entrar.text()).toContain('Entrar');
    expect(entrar.attributes('href')).toBe('/auth/login');
    expect(wrapper.find('[data-test="marca-movil"]').attributes('href')).toBe('/');
    expect(wrapper.findAll('[data-test="volver-portal"]')).toHaveLength(1);
  });

  it('«← Entrar» conserva un redirect interno y sanea uno externo', async () => {
    const interno = await montarEn('/auth/register?redirect=/testimonios');
    const externo = await montarEn('/auth/register?redirect=//otro.sitio');

    expect(
      decodeURIComponent(
        interno.find('[data-test="ir-a-entrar-cabecera"]').attributes('href') ?? ''
      )
    ).toBe('/auth/login?redirect=/testimonios');
    expect(
      decodeURIComponent(
        externo.find('[data-test="ir-a-entrar-cabecera"]').attributes('href') ?? ''
      )
    ).toBe('/auth/login?redirect=/services');
  });

  it('arriba, en escritorio: la marca y «Volver al portal», los dos al inicio', async () => {
    const wrapper = await montarEn('/auth/register');
    const volver = wrapper.find('[data-test="volver-portal"]');

    expect(wrapper.find('[data-test="marca"]').attributes('href')).toBe('/');
    expect(volver.text()).toContain('Volver al portal');
    expect(volver.attributes('href')).toBe('/');
  });

  it('el pie lleva la política y la dirección de su única fuente', async () => {
    const wrapper = await montarEn('/auth/login');

    expect(wrapper.find('[data-test="pie-politica"]').text()).toBe(
      'Política de tratamiento de datos'
    );
    expect(wrapper.find('[data-test="pie-politica"]').attributes('href')).toBe(
      '/politica-tratamiento-datos'
    );
    expect(wrapper.find('[data-test="pie-direccion"]').text()).toBe(
      `${SALON_STREET}, ${SALON_LOCALITY}`
    );
  });

  it('la foto es decorativa y su placa lleva el lema y el horario de su única fuente', async () => {
    const wrapper = await montarEn('/auth/login');
    const foto = wrapper.find('[data-test="foto-acceso"]');
    const horario = wrapper.find('[data-test="placa-horario"]').text();

    expect(foto.attributes('aria-hidden')).toBe('true');
    expect(foto.text()).toContain('Cortes, color y estética en Sopó');
    expect(horario).toContain(BUSINESS_SCHEDULE_COPY.weekdayLabel);
    expect(horario).toContain(BUSINESS_SCHEDULE_COPY.weekdayRange);
    expect(horario).toContain(BUSINESS_SCHEDULE_COPY.weekendLabel);
    expect(horario).toContain(BUSINESS_SCHEDULE_COPY.weekendRange);
  });

  it('pinta la página hija dentro del cuerpo', async () => {
    const wrapper = await montarEn('/auth/olvide-contrasena');

    expect(wrapper.find('main [data-test="pagina-hija"]').exists()).toBe(true);
  });
});

describe('AuthLayout · la pintura, leída de la fuente', () => {
  it('sin hexadecimales ni estilos en línea (antes: style="background: #e8e8e8")', () => {
    expect(FUENTE).not.toMatch(/#[0-9a-fA-F]{3,8}(?![\w-])/);
    expect(FUENTE.slice(0, FUENTE.indexOf('<script'))).not.toMatch(/\sstyle="/);
  });

  it('desde 1024 px: hoja de min(620px, 50%) y foto a la derecha', () => {
    const escritorio = ESTILOS.slice(ESTILOS.indexOf('@media (min-width: 1024px)'));
    expect(escritorio).toMatch(/width: min\(620px, 50%\);/);
    expect(escritorio).toMatch(/\.acceso__foto\s*\{[^}]*display: block;/);
  });

  it('la foto es rainbow_hair, en la banda de móvil y en la columna de escritorio', () => {
    expect(
      (ESTILOS.match(/background-image: url\('\/people\/rainbow_hair\.jpg'\);/g) ?? [])
        .length
    ).toBe(2);
  });

  it('banda de foto de 150 px; barra de 56 px; X de 44 px redonda', () => {
    expect(ESTILOS).toMatch(/\.acceso__foto-movil\s*\{[^}]*height: 150px;/);
    expect(ESTILOS).toMatch(
      /\.acceso__barra-movil\s*\{[^}]*height: var\(--m-cabecera-alto-movil\);/
    );
    expect(ESTILOS).toMatch(
      /\.acceso__cerrar\s*\{[^}]*width: var\(--m-tactil-min\);[^}]*height: var\(--m-tactil-min\);[^}]*border-radius: 50%;/
    );
  });

  it('alto completo: 100dvh solo justo después de 100vh (Safari 13.1)', () => {
    expect(ESTILOS).toMatch(/min-height: 100vh;\s*min-height: 100dvh;/);
    expect((ESTILOS.match(/100dvh/g) ?? []).length).toBe(
      (ESTILOS.match(/100vh;\s*min-height: 100dvh/g) ?? []).length
    );
    expect(ESTILOS).not.toMatch(/(^|[\s;{])inset\s*:|:has\(/);
  });

  it('las clases comunes viven en un bloque no scoped, después del scoped', () => {
    expect(FUENTE.indexOf('<style scoped')).toBeGreaterThan(-1);
    expect(FUENTE.indexOf('<style lang="scss">')).toBeGreaterThan(
      FUENTE.indexOf('<style scoped')
    );
  });

  it('el botón común es tinta maciza en píldora; al pasar, rótulo en oro (sobre tinta)', () => {
    expect(GLOBALES).toMatch(
      /\.acceso-boton\s*\{[^}]*border-radius: var\(--m-radio-pildora\);[^}]*background: var\(--m-tinta\);[^}]*color: var\(--m-hueso\);/
    );
    const fino = GLOBALES.slice(
      GLOBALES.indexOf('@media (hover: hover) and (pointer: fine)')
    );
    expect(fino).toMatch(/\.acceso-boton:hover:not\(:disabled\)\s*\{[^}]*color: var\(--m-oro\);/);
  });

  it('el enlace común va en rosa profundo con filete rosa', () => {
    expect(GLOBALES).toMatch(
      /\.acceso-enlace\s*\{[^}]*color: var\(--m-rosa-profundo\);[^}]*border-bottom: var\(--m-filete-grosor\) solid var\(--m-filete-rosa\);/
    );
  });

  it('foco visible con el anillo de oro en los controles comunes y del armazón', () => {
    expect(GLOBALES).toMatch(
      /\.acceso-boton:focus-visible,\s*\.acceso-enlace:focus-visible,\s*\.acceso-secundario:focus-visible\s*\{\s*outline: 2px solid var\(--m-oro\);/
    );
    expect(ESTILOS).toMatch(
      /\.acceso__cerrar:focus-visible[^{]*\{\s*outline: 2px solid var\(--m-oro\);/
    );
  });
});
