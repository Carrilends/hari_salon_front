/**
 * La página ya no decide el layout en JavaScript: compone bandas y deja el
 * responsive al CSS. Esta prueba vigila justo eso —que no vuelva el matchMedia—
 * y que «Reservar» abra el flujo del portal y no otra cosa.
 */
import { mount } from '@vue/test-utils';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import IndexPage from 'src/pages/IndexPage.vue';

const abrirReserva = jest.fn();
jest.mock('src/stores/book-store', () => ({
  useBookStore: () => ({ showDialogFn: abrirReserva }),
  migrateLegacyBookings: () => undefined,
}));
jest.mock('src/composables/shared/useOptions', () => ({ useOptions: () => undefined }));
jest.mock('src/composables/seo/useSeo', () => ({ useSeo: () => undefined }));
// El chip de administrador pregunta por la sesión. Sin este doble haría falta
// montar Pinia entera para probar que la página compone cinco bandas.
jest.mock('src/stores/auth-store', () => ({
  useAuthStore: () => ({ isLoggedIn: false, isAdmin: false }),
}));

// `services-api` lee `import.meta.env`, que ts-jest no sabe compilar a
// CommonJS. La página lo arrastra por la cadena banda de reseñas → useReviews,
// aunque la banda vaya sustituida por un stub: el import se ejecuta igual.
// Misma convención que auth-api.spec.ts y service.helpers.spec.ts.
jest.mock('src/api/services-api', () => ({
  servicesApi: { get: jest.fn() },
  adminServiceApi: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
}));

const push = jest.fn();
jest.mock('vue-router', () => ({ useRouter: () => ({ push }) }));

// Los stubs llevan `name`: sin él son componentes anónimos y
// `getComponent({ name })` no los encuentra.
const stubs = {
  HeroBand: {
    name: 'HeroBand',
    emits: ['ver-servicios'],
    template: '<div class="hero" />',
  },
  CatalogBand: {
    name: 'CatalogBand',
    emits: ['abrir', 'ver-todo'],
    template: '<div class="catalogo" />',
  },
  ReviewAssistantBand: { name: 'ReviewAssistantBand', template: '<div class="resenas" />' },
  MobileActionBar: {
    name: 'MobileActionBar',
    emits: ['reservar'],
    template: '<div class="barra" />',
  },
  SiteFooterBand: { name: 'SiteFooterBand', template: '<div class="pie" />' },
  'q-page': { template: '<div><slot /></div>' },
  'q-page-sticky': { template: '<div><slot /></div>' },
  'q-btn': { template: '<button />' },
};

beforeEach(() => {
  abrirReserva.mockClear();
  push.mockClear();
});

describe('IndexPage', () => {
  it('monta las cinco bandas, una sola vez cada una', () => {
    const wrapper = mount(IndexPage, { global: { stubs } });

    for (const clase of ['.hero', '.catalogo', '.resenas', '.barra', '.pie']) {
      expect(wrapper.findAll(clase)).toHaveLength(1);
    }
  });

  it('«Reservar» de la barra de móvil abre el flujo de reserva del portal', async () => {
    const wrapper = mount(IndexPage, { global: { stubs } });

    await wrapper.getComponent({ name: 'MobileActionBar' }).vm.$emit('reservar');

    expect(abrirReserva).toHaveBeenCalledTimes(1);
    expect(push).not.toHaveBeenCalled();
  });

  it('la portada manda a servicios y el catálogo manda con su filtro', async () => {
    const wrapper = mount(IndexPage, { global: { stubs } });

    await wrapper.getComponent({ name: 'HeroBand' }).vm.$emit('ver-servicios');
    expect(push).toHaveBeenCalledWith({ path: '/services' });
  });

  it('el acceso de administración vive en el pie, no en un flotante', async () => {
    const wrapper = mount(IndexPage, { global: { stubs } });

    // Sobre la fuente, no sobre el DOM: el stub de `q-page-sticky` no lleva esa
    // clase, así que buscarla en el árbol montado pasaría siempre.
    const fuente = readFileSync(join(__dirname, '../../src/pages/IndexPage.vue'), 'utf8');
    expect(fuente).not.toContain('q-page-sticky');
    await wrapper.getComponent({ name: 'SiteFooterBand' }).vm.$emit('admin');

    expect(push).toHaveBeenCalledWith({ name: 'login' });
  });

  it('no queda ni un matchMedia ni un style-fn en la página', () => {
    const fuente = readFileSync(join(__dirname, '../../src/pages/IndexPage.vue'), 'utf8');

    expect(fuente).not.toContain('matchMedia');
    expect(fuente).not.toContain('style-fn');
    expect(fuente).not.toContain('q-scroll-area');
  });
});
