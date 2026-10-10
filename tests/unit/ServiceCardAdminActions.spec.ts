/**
 * Los tres controles que solo ve la dueña, sobre la foto de la tarjeta y en el
 * renglón de móvil.
 *
 * Dos cosas se vigilan con lupa. La primera: sin sesión de administradora no se
 * pinta NADA —el guardia del cliente es cosmético, pero una clienta que ve un
 * botón de borrar es un susto gratis—. La segunda: el clic no se puede escapar
 * a la tarjeta, que es un enlace al detalle; si se escapa, pulsar «Editar»
 * abre además la ficha del servicio.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import ServiceCardAdminActions from 'src/components/servicePage/ServiceCardAdminActions.vue';
import { useAuthStore } from 'src/stores/auth-store';
import type Service from 'src/interfaces/service';

const SERVICIO = {
  id: 's1',
  name: 'Bob clásico',
  gender: 'femenino',
  type: 'corte',
  price: 45000,
  isSpecial: false,
  duration: 60,
  slug: 'bob-clasico',
  tags: ['t1'],
  images: [],
  detail: {
    id: 'd1',
    description: 'Corte recto a la mandíbula',
    specifications: {},
  },
} as unknown as Service;

/** Como lo devuelve el API: el porcentaje llega como cadena. */
const EN_PROMOCION = {
  ...SERVICIO,
  havePromotion: true,
  porcentageDiscount: '30',
} as unknown as Service;

function montar(
  servicio: Service = SERVICIO,
  opciones: { admin?: boolean; compacto?: boolean } = {}
) {
  const { admin = true, compacto = false } = opciones;
  const pinia = createPinia();
  const wrapper = mount(ServiceCardAdminActions, {
    props: { servicio, compacto },
    global: { plugins: [pinia] },
  });
  if (admin) {
    const auth = useAuthStore(pinia);
    auth.token = 'un-token';
    auth.roles = ['admin'];
  }
  return wrapper;
}

describe('ServiceCardAdminActions', () => {
  it('sin sesión de administradora no pinta nada', () => {
    const wrapper = montar(SERVICIO, { admin: false });

    expect(wrapper.find('[data-test="acciones-admin"]').exists()).toBe(false);
  });

  it('con sesión de administradora ofrece los tres controles, como botones de verdad', async () => {
    const wrapper = montar();
    await wrapper.vm.$nextTick();

    for (const gancho of ['editar', 'promocion', 'eliminar']) {
      const boton = wrapper.get(`[data-test="${gancho}"]`);
      expect(boton.element.tagName).toBe('BUTTON');
      expect(boton.attributes('type')).toBe('button');
    }
  });

  it('cada control avisa de lo suyo con el servicio correcto', async () => {
    const wrapper = montar();
    await wrapper.vm.$nextTick();

    await wrapper.get('[data-test="editar"]').trigger('click');
    await wrapper.get('[data-test="promocion"]').trigger('click');
    await wrapper.get('[data-test="eliminar"]').trigger('click');

    expect(wrapper.emitted('editar')?.[0]).toEqual(['s1']);
    expect(wrapper.emitted('promocion')?.[0]).toEqual([SERVICIO]);
    expect(wrapper.emitted('eliminar')?.[0]).toEqual(['s1']);
  });

  it('son de solo icono, así que nombran el servicio al lector de pantalla', async () => {
    const wrapper = montar();
    await wrapper.vm.$nextTick();

    expect(wrapper.get('[data-test="editar"]').attributes('aria-label')).toBe(
      'Editar Bob clásico'
    );
    expect(wrapper.get('[data-test="eliminar"]').attributes('aria-label')).toBe(
      'Eliminar Bob clásico'
    );
    expect(
      wrapper.get('[data-test="promocion"]').attributes('aria-label')
    ).toBe('Poner una promoción a Bob clásico');
  });

  /** Review Focus 4: el porcentaje llega como cadena desde el API. */
  it('con promoción activa el control de etiqueta cambia de texto y de nombre', async () => {
    const wrapper = montar(EN_PROMOCION);
    await wrapper.vm.$nextTick();

    const etiqueta = wrapper.get('[data-test="promocion"]');
    expect(etiqueta.attributes('aria-label')).toBe(
      'Quitar la promoción de Bob clásico'
    );
    expect(etiqueta.text()).toBe('30%');
  });

  it('sin promoción el control de etiqueta no anuncia ningún porcentaje', async () => {
    const wrapper = montar();
    await wrapper.vm.$nextTick();

    expect(wrapper.get('[data-test="promocion"]').text()).toBe('');
  });

  /**
   * La tarjeta entera es un enlace al detalle: si el clic sube, «Editar» abre
   * además la ficha. Se monta dentro de un padre que escucha para comprobarlo.
   */
  it('el clic no se escapa a la tarjeta que hay debajo', async () => {
    const Padre = {
      components: { ServiceCardAdminActions },
      props: ['servicio'],
      emits: ['fuga'],
      template:
        '<div @click="$emit(\'fuga\')"><ServiceCardAdminActions :servicio="servicio" /></div>',
    };
    const pinia = createPinia();
    const wrapper = mount(Padre, {
      props: { servicio: SERVICIO },
      global: { plugins: [pinia] },
    });
    const auth = useAuthStore(pinia);
    auth.token = 'un-token';
    auth.roles = ['admin'];
    await wrapper.vm.$nextTick();

    await wrapper.get('[data-test="editar"]').trigger('click');

    expect(wrapper.emitted('fuga')).toBeUndefined();
  });

  it('la versión compacta del renglón se distingue de la de la tarjeta', async () => {
    const wrapper = montar(SERVICIO, { compacto: true });
    await wrapper.vm.$nextTick();

    expect(wrapper.get('[data-test="acciones-admin"]').classes()).toContain(
      'acciones-admin--compacto'
    );
  });
});

/**
 * Lo que no se puede ver montando (el SCSS está mapeado a un mock): se lee la
 * fuente. el peligro macizo (`--m-peligro`) no aparece (vive solo en la confirmación de borrado; la franja usa `--m-peligro-sobre-tinta`); nada posicionado en absoluto, porque
 * la ranura de la tarjeta ya lo está; ni un color suelto.
 */
describe('ServiceCardAdminActions · estilos', () => {
  const fuente = readFileSync(
    join(
      __dirname,
      '../../src/components/servicePage/ServiceCardAdminActions.vue'
    ),
    'utf8'
  );
  const estilos = fuente.slice(fuente.indexOf('<style'));

  it('no se posiciona en absoluto: la ranura de la tarjeta ya lo hace', () => {
    expect(estilos).not.toMatch(/position:\s*absolute/);
  });

  /**
   * Plan 9 (V2): en el renglón ya no van apilados a la derecha. Son una franja
   * al pie de la tarjeta, tres tercios de 44 px con filete arriba y entre
   * ellos (tablero AdminMostradorMovil).
   */
  it('en el renglón (compacto) es una franja de tres tercios a 44 px, con filete arriba', () => {
    expect(estilos).toMatch(
      /\.acciones-admin--compacto \{[^}]*border-top: var\(--m-filete-grosor\) solid var\(--m-filete-oscuro\);/
    );
    expect(estilos).toMatch(
      /\.acciones-admin--compacto \.acciones-admin__boton \{[^}]*flex: 1 1 0;[^}]*min-width: 0;[^}]*width: auto;/
    );
    expect(estilos).toMatch(
      /\.acciones-admin--compacto \.acciones-admin__boton \+ \.acciones-admin__boton \{[^}]*border-left: var\(--m-filete-grosor\) solid var\(--m-filete-oscuro\);/
    );
    expect(estilos).toMatch(
      /\.acciones-admin__boton \{[^}]*width:\s*var\(--m-tactil-min\);[^}]*height:\s*var\(--m-tactil-min\);/
    );
    expect(estilos).not.toMatch(/flex-direction:\s*column/);
  });

  /** Foco de revisión 2: el peligro macizo sobre carbón da 2,1:1. */
  it('el disparador nunca usa el peligro macizo', () => {
    expect(fuente).not.toMatch(/var\(--m-peligro\)/);
  });

  it('en la franja «Borrar» va en el rosa legible sobre tinta, también al pasar', () => {
    expect(estilos).toMatch(
      /\.acciones-admin--compacto \.acciones-admin__boton--borrar \{[^}]*color: var\(--m-peligro-sobre-tinta\);/
    );
    expect(estilos).toMatch(
      /\.acciones-admin--compacto \.acciones-admin__boton--borrar:hover \{[^}]*color: var\(--m-peligro-sobre-tinta\);/
    );
  });

  /** El tablero pinta la promoción activa en oro al 16 %: 3,8:1. */
  it('la promoción activa de la franja va en oro macizo con texto tinta', () => {
    expect(estilos).toMatch(
      /\.acciones-admin--compacto \.acciones-admin__boton--oro \{[^}]*background: var\(--m-oro\);[^}]*color: var\(--m-tinta\);/
    );
  });

  it('dentro de la franja el foco se dibuja por dentro, en hueso', () => {
    expect(estilos).toMatch(
      /\.acciones-admin--compacto \.acciones-admin__boton:focus-visible \{[^}]*outline: 2px solid var\(--m-hueso\);[^}]*outline-offset: -4px;/
    );
  });

  /** Foco de revisión 5: «100 % · Quitar» en un tercio de 320 px. */
  /** Hueso sobre oro macizo da ~2,8:1, bajo el 3:1 del indicador de foco. */
  it('el foco de la promoción activa en la franja va en tinta, no en hueso', () => {
    expect(estilos).toMatch(
      /\.acciones-admin--compacto \.acciones-admin__boton--oro:focus-visible \{[^}]*outline-color: var\(--m-tinta\);/
    );
  });

  it('al pasar sobre la promoción activa no se repinta el filete izquierdo', () => {
    expect(estilos).not.toMatch(
      /\.acciones-admin--compacto \.acciones-admin__boton--oro:hover \{[^}]*border-color/
    );
  });

  it('un rótulo que no cabe se corta con puntos suspensivos, no desborda', () => {
    expect(estilos).toMatch(
      /\.acciones-admin__rotulo \{[^}]*min-width: 0;[^}]*overflow: hidden;[^}]*white-space: nowrap;[^}]*text-overflow: ellipsis;/
    );
  });

  it('no escribe colores sueltos', () => {
    expect(estilos).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/);
  });

  it('el botón de eliminar no lleva clase de peligro', async () => {
    const wrapper = montar();
    await wrapper.vm.$nextTick();
    expect(wrapper.get('[data-test="eliminar"]').classes()).not.toContain(
      'acciones-admin__boton--peligro'
    );
  });
});

/**
 * Plan 9 (V2): la franja del renglón de móvil dice cada acción con texto. Con
 * texto a la vista, el nombre accesible tiene que EMPEZAR por él (WCAG 2.5.3):
 * quien dicta «pulsa Borrar» no encuentra un botón que se llama «Eliminar…».
 */
describe('ServiceCardAdminActions · la franja del renglón de móvil', () => {
  it('cada control dice lo suyo con texto: Editar, Promo y Borrar', async () => {
    const wrapper = montar(SERVICIO, { compacto: true });
    await wrapper.vm.$nextTick();

    expect(wrapper.get('[data-test="editar"]').text()).toBe('Editar');
    expect(wrapper.get('[data-test="promocion"]').text()).toBe('Promo');
    expect(wrapper.get('[data-test="eliminar"]').text()).toBe('Borrar');
  });

  it('con promoción activa dice el porcentaje y «Quitar», sin icono', async () => {
    const wrapper = montar(EN_PROMOCION, { compacto: true });
    await wrapper.vm.$nextTick();
    const promo = wrapper.get('[data-test="promocion"]');

    expect(promo.text()).toBe('30 % · Quitar');
    expect(promo.find('svg').exists()).toBe(false);
    expect(promo.classes()).toContain('acciones-admin__boton--oro');
  });

  it('el nombre accesible empieza por el texto que se ve y nombra el servicio', async () => {
    const sin = montar(SERVICIO, { compacto: true });
    const con = montar(EN_PROMOCION, { compacto: true });
    await sin.vm.$nextTick();
    await con.vm.$nextTick();

    const casos = [
      sin.get('[data-test="editar"]'),
      sin.get('[data-test="promocion"]'),
      sin.get('[data-test="eliminar"]'),
      con.get('[data-test="promocion"]'),
    ];
    for (const boton of casos) {
      const nombre = boton.attributes('aria-label') ?? '';
      expect(nombre.startsWith(boton.text())).toBe(true);
      expect(nombre).toContain('Bob clásico');
    }
    expect(sin.get('[data-test="eliminar"]').attributes('aria-label')).toBe(
      'Borrar Bob clásico'
    );
    expect(con.get('[data-test="promocion"]').attributes('aria-label')).toBe(
      '30 % · Quitar la promoción de Bob clásico'
    );
  });

  it('solo el «Borrar» de la franja lleva la clase del rosa; el de la tarjeta no', async () => {
    const franja = montar(SERVICIO, { compacto: true });
    const tarjeta = montar(SERVICIO);
    await franja.vm.$nextTick();
    await tarjeta.vm.$nextTick();

    expect(franja.get('[data-test="eliminar"]').classes()).toContain(
      'acciones-admin__boton--borrar'
    );
    expect(tarjeta.get('[data-test="eliminar"]').classes()).not.toContain(
      'acciones-admin__boton--borrar'
    );
  });

  it('en la franja no hay tooltip que repita lo que ya se lee; en la tarjeta sí', async () => {
    const franja = montar(SERVICIO, { compacto: true });
    const tarjeta = montar(SERVICIO);
    await franja.vm.$nextTick();
    await tarjeta.vm.$nextTick();

    expect(
      franja.get('[data-test="editar"]').attributes('title')
    ).toBeUndefined();
    expect(tarjeta.get('[data-test="editar"]').attributes('title')).toBe(
      'Editar Bob clásico'
    );
  });

  it('la franja sigue avisando con el servicio correcto', async () => {
    const wrapper = montar(SERVICIO, { compacto: true });
    await wrapper.vm.$nextTick();

    await wrapper.get('[data-test="promocion"]').trigger('click');
    await wrapper.get('[data-test="eliminar"]').trigger('click');

    expect(wrapper.emitted('promocion')?.[0]).toEqual([SERVICIO]);
    expect(wrapper.emitted('eliminar')?.[0]).toEqual(['s1']);
  });
});
