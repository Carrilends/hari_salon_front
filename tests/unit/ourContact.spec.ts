/**
 * El diálogo de Horarios (S3, tablero HorariosSemanaTinta): la semana en tinta
 * con hoy resaltado, el estado del salón en una píldora, la línea de festivos,
 * la dirección y WhatsApp. Sin teléfono a la vista (regla de producto).
 *
 * La hora se fija doblando `getSalonNowParts`; el resto de `businessHours` es
 * el de verdad, así que los festivos se calculan como en producción.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { mount } from '@vue/test-utils';
import type { SalonNowParts } from 'src/helpers/businessHours';
import ourContact from 'src/components/dialogs/ourContact.vue';

const mockReloj: { ahora: SalonNowParts } = {
  ahora: { ymd: '2026-10-09', qDate: '2026/10/09', minOfDay: 10 * 60 },
};
jest.mock('src/helpers/businessHours', () => ({
  ...jest.requireActual('src/helpers/businessHours'),
  getSalonNowParts: () => mockReloj.ahora,
}));

const mockPantalla = { movil: false };
jest.mock('src/composables/shared/useConsultaMedios', () => {
  const { ref } = jest.requireActual<typeof import('vue')>('vue');
  return { useConsultaMedios: () => ref(mockPantalla.movil) };
});

const FUENTE = readFileSync(
  join(__dirname, '../../src/components/dialogs/ourContact.vue'),
  'utf8'
);
const ESTILOS = FUENTE.slice(FUENTE.indexOf('<style'));

const stubs = {
  QDialog: {
    name: 'QDialog',
    props: ['modelValue', 'position', 'transitionShow', 'transitionHide'],
    emits: ['update:modelValue'],
    template: '<div v-if="modelValue" class="dialogo-doble"><slot /></div>',
  },
};

const a = (qDate: string, hora: string): SalonNowParts => {
  const [h, m] = hora.split(':').map(Number);
  return { ymd: qDate.replace(/\//g, '-'), qDate, minOfDay: h * 60 + m };
};

function montar(dialog = true) {
  return mount(ourContact, { props: { dialog }, global: { stubs } });
}

beforeEach(() => {
  mockReloj.ahora = a('2026/10/09', '10:00');
  mockPantalla.movil = false;
});

describe('Horarios', () => {
  it('cerrado no pinta nada', () => {
    expect(montar(false).find('[data-test="horarios"]').exists()).toBe(false);
  });

  it('un viernes a las 10:00 dice que está abierto y hasta cuándo', () => {
    const wrapper = montar();

    expect(wrapper.get('[data-test="estado-salon"]').text()).toBe(
      'Abierto ahora · cierra a las 20:00'
    );
    expect(wrapper.text()).toContain('Cuándo atendemos');
  });

  it('pinta siete filas de lunes a domingo y resalta hoy con la palabra «Hoy»', () => {
    const filas = montar().findAll('[data-test="fila-dia"]');

    expect(filas).toHaveLength(7);
    expect(filas[0].text()).toContain('Lunes');
    expect(filas[0].text()).toContain('8:00 – 20:00');
    expect(filas[5].text()).toContain('9:00 – 19:00');
    expect(filas[4].find('[data-test="marca-hoy"]').exists()).toBe(true);
    expect(filas[4].attributes('aria-current')).toBe('date');
    expect(
      filas.filter((f) => f.find('[data-test="marca-hoy"]').exists())
    ).toHaveLength(1);
  });

  it('un lunes festivo lo anuncia en la píldora y en su fila', () => {
    mockReloj.ahora = a('2026/10/12', '10:00');
    const wrapper = montar();

    expect(wrapper.get('[data-test="estado-salon"]').text()).toBe(
      'Hoy es festivo · 9:00 a 19:00'
    );
    const lunes = wrapper.findAll('[data-test="fila-dia"]')[0];
    expect(lunes.find('[data-test="marca-festivo"]').exists()).toBe(true);
    expect(lunes.text()).toContain('9:00 – 19:00');
  });

  it('dice el horario de los festivos', () => {
    expect(montar().get('[data-test="linea-festivos"]').text()).toBe(
      'Los festivos atendemos de 9:00 a 19:00.'
    );
  });

  /** Foco de revisión 4: el armazón monta el diálogo una vez, al cargar la página. */
  it('recalcula el estado cada vez que se abre, no cuando se montó', async () => {
    const wrapper = montar(false);

    mockReloj.ahora = a('2026/10/08', '21:00');
    await wrapper.setProps({ dialog: true });
    expect(wrapper.get('[data-test="estado-salon"]').text()).toBe(
      'Cerrado · abre mañana a las 8:00'
    );

    await wrapper.setProps({ dialog: false });
    mockReloj.ahora = a('2026/10/09', '10:00');
    await wrapper.setProps({ dialog: true });
    expect(wrapper.get('[data-test="estado-salon"]').text()).toBe(
      'Abierto ahora · cierra a las 20:00'
    );
  });

  it('no muestra ningún teléfono: ni enlace tel: ni dígitos', () => {
    const wrapper = montar();

    expect(wrapper.find('a[href^="tel:"]').exists()).toBe(false);
    expect(wrapper.text()).not.toMatch(/\d{3}\s?\d{3}\s?\d{2}/);
  });

  it('ofrece WhatsApp con el número del portal, en otra pestaña', () => {
    const enlace = montar().get('[data-test="whatsapp"]');

    expect(enlace.attributes('href')).toBe('https://wa.me/573208977471');
    expect(enlace.attributes('target')).toBe('_blank');
    expect(enlace.attributes('rel')).toContain('noopener');
    expect(enlace.text()).toBe('Escríbenos por WhatsApp');
  });

  it('dice dónde está el salón', () => {
    expect(montar().get('[data-test="direccion"]').text()).toBe(
      'Carrera 3 #1-18, Sopó'
    );
  });

  it('la X tiene nombre y cierra el diálogo', async () => {
    const wrapper = montar();
    const cerrar = wrapper.get('[data-test="cerrar-horarios"]');

    expect(cerrar.attributes('aria-label')).toBe('Cerrar');
    await cerrar.trigger('click');
    expect(wrapper.emitted('update:dialog')).toEqual([[false]]);
  });

  it('en escritorio es un diálogo centrado; en móvil, una hoja inferior con tirador', () => {
    const escritorio = montar();
    expect(escritorio.getComponent({ name: 'QDialog' }).props('position')).toBe(
      'standard'
    );
    expect(escritorio.find('[data-test="tirador"]').exists()).toBe(false);

    mockPantalla.movil = true;
    const movil = montar();
    expect(movil.getComponent({ name: 'QDialog' }).props('position')).toBe(
      'bottom'
    );
    expect(movil.find('[data-test="tirador"]').exists()).toBe(true);
  });
});

describe('Horarios · la fuente', () => {
  it('la raíz del diálogo es la sección y recibe los clics', () => {
    expect(FUENTE).toMatch(/<q-dialog\b[^>]*>\s*<section\s+class="horarios"/);
    expect(ESTILOS).toMatch(/\.horarios\s*\{[^}]*pointer-events: all;/);
  });

  it('sobre tinta, el foco se ve en hueso', () => {
    expect(ESTILOS).toMatch(
      /:focus-visible\s*\{[^}]*outline: 2px solid var\(--m-hueso\);[^}]*outline-offset: 2px;/
    );
  });

  it('el velo es el de la paleta', () => {
    expect(ESTILOS).toMatch(
      /\.horarios-dialogo \.q-dialog__backdrop\s*\{[^}]*background: var\(--m-velo\);/
    );
  });

  it('ya no usa la consulta que mira la ventana en setup', () => {
    expect(FUENTE).not.toContain('useDialogMaximizedBelow');
  });
});
