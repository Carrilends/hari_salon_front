import { mount, RouterLinkStub } from '@vue/test-utils';
import PanelEstilista from 'src/components/estilistas/PanelEstilista.vue';
import { MENSAJE_CON_RESERVAS } from 'src/helpers/semana-estilistas';
import { semanaDePrueba } from './fixtures/estilistas';

const MONICA = semanaDePrueba().workers[1];
const DEFECTO = semanaDePrueba().workers[3];

const BASE = {
  modo: 'editar' as const,
  estilista: MONICA,
  semanaRotulo: '5 – 11 oct 2026',
  hoyRotulo: 'Hoy · miércoles 7',
  citasHoy: [
    { id: 'r-1', desde: '8:30', hasta: '10:00', servicios: 'Balayage' },
    {
      id: 'r-2',
      desde: '10:30',
      hasta: '11:30',
      servicios: 'Wolf cut mujer + 1',
    },
  ],
  guardando: false,
  eliminando: false,
  exito: null,
  errorGuardar: null,
  errorEliminar: null,
};

const montar = (
  props: Record<string, unknown> = {},
  opciones: Record<string, unknown> = {}
) =>
  mount(PanelEstilista, {
    props: { ...BASE, ...props },
    global: { stubs: { RouterLink: RouterLinkStub } },
    ...opciones,
  });

const campo = (panel: ReturnType<typeof montar>) =>
  panel.get<HTMLInputElement>('[data-test="campo-nombre"]');

describe('PanelEstilista · crear', () => {
  it('se presenta como «Agregar estilista», vacío y sin semana ni borrado', () => {
    const panel = montar({ modo: 'crear', estilista: null, citasHoy: [] });

    expect(panel.get('[data-test="panel-titulo"]').text()).toBe(
      'Agregar estilista'
    );
    expect(campo(panel).element.value).toBe('');
    expect(panel.get('[data-test="guardar-estilista"]').text()).toBe(
      'Crear estilista'
    );
    expect(panel.find('[data-test="resumen-semana"]').exists()).toBe(false);
    expect(panel.find('[data-test="eliminar-estilista"]').exists()).toBe(false);
  });

  it('envía el nombre recortado', async () => {
    const panel = montar({ modo: 'crear', estilista: null });

    await campo(panel).setValue('  Ana  ');
    await panel.get('form').trigger('submit');

    expect(panel.emitted('guardar')).toEqual([['Ana']]);
  });

  it('valida en línea como el backend, sin enviar', async () => {
    const panel = montar({ modo: 'crear', estilista: null });

    await campo(panel).setValue(' a ');
    await panel.get('form').trigger('submit');

    expect(panel.emitted('guardar')).toBeUndefined();
    expect(panel.get('[data-test="error-nombre"]').text()).toBe(
      'Escribe al menos 2 caracteres.'
    );
    expect(campo(panel).attributes('aria-invalid')).toBe('true');
    expect(campo(panel).attributes('aria-describedby')).toBe(
      'panel-estilista-ayuda panel-estilista-error'
    );
  });

  it('mientras guarda no vuelve a enviar (doble Enter)', async () => {
    const panel = montar({ modo: 'crear', estilista: null, guardando: true });

    await campo(panel).setValue('Ana');
    await panel.get('form').trigger('submit');

    expect(panel.emitted('guardar')).toBeUndefined();
    expect(
      panel.get('[data-test="guardar-estilista"]').attributes('disabled')
    ).toBeDefined();
  });

  it('tras crear, dice el éxito en línea y deja el campo listo para otra', async () => {
    const panel = montar({ modo: 'crear', estilista: null });
    await campo(panel).setValue('Ana');

    await panel.setProps({ exito: 'Se agregó a Ana.' });

    expect(panel.get('[data-test="exito-estilista"]').text()).toBe(
      'Se agregó a Ana.'
    );
    expect(panel.get('[data-test="exito-estilista"]').attributes('role')).toBe(
      'status'
    );
    expect(campo(panel).element.value).toBe('');
  });
});

describe('PanelEstilista · editar', () => {
  it('trae el nombre, el resumen de la semana y las citas de hoy', () => {
    const panel = montar();

    expect(panel.get('[data-test="panel-titulo"]').text()).toBe('Monica');
    expect(campo(panel).element.value).toBe('Monica');
    expect(panel.get('[data-test="resumen-semana"]').text()).toMatch(
      /^46 h\s*reservadas de 80 h$/
    );
    expect(panel.text()).toContain('Semana · 5 – 11 oct 2026');
    expect(panel.text()).toContain('Hoy · miércoles 7');
    expect(
      panel.findAll('[data-test="cita-hoy"]').map((c) => c.text())
    ).toEqual(['8:30 – 10:00Balayage', '10:30 – 11:30Wolf cut mujer + 1']);
    expect(panel.getComponent(RouterLinkStub).props('to')).toBe('/reservas');
    expect(panel.get('[data-test="ir-a-reservas"]').text()).toBe(
      'Ir a Reservas →'
    );
  });

  it('sin citas hoy, lo dice', () => {
    expect(
      montar({ citasHoy: [] }).get('[data-test="sin-citas-hoy"]').text()
    ).toBe('No le quedan citas hoy.');
  });

  it('cambiar de estilista cambia el nombre y cierra una confirmación a medias', async () => {
    const panel = montar();
    await panel.get('[data-test="eliminar-estilista"]').trigger('click');

    await panel.setProps({ estilista: semanaDePrueba().workers[0] });

    expect(campo(panel).element.value).toBe('Alejandro');
    expect(panel.find('[data-test="confirmacion-eliminar"]').exists()).toBe(
      false
    );
  });

  it('enfoca el nombre al abrirse', async () => {
    const panel = montar({}, { attachTo: document.body });
    await panel.vm.$nextTick();

    expect(document.activeElement).toBe(campo(panel).element);
    panel.unmount();
  });

  it('Escape y la X lo cierran', async () => {
    const panel = montar();

    await panel
      .get('[data-test="panel-estilista"]')
      .trigger('keydown', { key: 'Escape' });
    await panel.get('[data-test="cerrar-panel"]').trigger('click');

    expect(panel.emitted('cerrar')).toHaveLength(2);
  });
});

describe('PanelEstilista · eliminar', () => {
  it('pide confirmación antes de emitir; cancelar vuelve atrás', async () => {
    const panel = montar();

    await panel.get('[data-test="eliminar-estilista"]').trigger('click');
    expect(panel.get('[data-test="confirmacion-eliminar"]').text()).toContain(
      '¿Eliminar a Monica? No se puede deshacer.'
    );
    expect(panel.emitted('eliminar')).toBeUndefined();

    await panel.get('[data-test="cancelar-eliminar"]').trigger('click');
    expect(panel.find('[data-test="confirmacion-eliminar"]').exists()).toBe(
      false
    );

    await panel.get('[data-test="eliminar-estilista"]').trigger('click');
    await panel.get('[data-test="confirmar-eliminar"]').trigger('click');
    expect(panel.emitted('eliminar')).toHaveLength(1);
  });

  it('los botones de borrar no envían el formulario', async () => {
    const panel = montar();

    await panel.get('[data-test="eliminar-estilista"]').trigger('click');
    await panel.get('[data-test="confirmar-eliminar"]').trigger('click');

    expect(panel.emitted('guardar')).toBeUndefined();
    expect(
      panel.get('[data-test="confirmar-eliminar"]').attributes('type')
    ).toBe('button');
  });

  it('con el 409, el candado sustituye al botón de borrar', async () => {
    const panel = montar({ errorEliminar: MENSAJE_CON_RESERVAS });

    const bloqueo = panel.get('[data-test="error-eliminar"]');
    expect(bloqueo.text()).toBe(
      'No se puede eliminar: tiene reservas registradas'
    );
    expect(bloqueo.attributes('role')).toBe('alert');
    expect(bloqueo.find('svg').exists()).toBe(true);
    expect(panel.find('[data-test="eliminar-estilista"]').exists()).toBe(false);
  });

  it('con un fallo de red, el aviso sale y se puede reintentar', async () => {
    const panel = montar();
    await panel.get('[data-test="eliminar-estilista"]').trigger('click');

    await panel.setProps({
      errorEliminar:
        'No se pudo eliminar. Revisa la conexión e inténtalo de nuevo.',
    });

    expect(panel.get('[data-test="error-eliminar"]').text()).toBe(
      'No se pudo eliminar. Revisa la conexión e inténtalo de nuevo.'
    );
    expect(panel.find('[data-test="confirmar-eliminar"]').exists()).toBe(true);
  });

  it('la predeterminada no tiene botón de borrar', () => {
    expect(
      montar({ estilista: DEFECTO })
        .find('[data-test="eliminar-estilista"]')
        .exists()
    ).toBe(false);
  });

  it('mientras borra, «Sí, eliminar» queda deshabilitado', async () => {
    const panel = montar({ eliminando: true });
    await panel.get('[data-test="eliminar-estilista"]').trigger('click');

    expect(
      panel.get('[data-test="confirmar-eliminar"]').attributes('disabled')
    ).toBeDefined();
  });
});
