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
 * fuente. `--m-peligro` ni rastro (vive solo en la confirmación de borrado); nada posicionado en absoluto, porque
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

  it('el disparador de borrar no usa el color de peligro', () => {
    expect(fuente).not.toContain('var(--m-peligro');
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
