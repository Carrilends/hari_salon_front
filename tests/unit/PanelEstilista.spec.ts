import { readFileSync } from 'fs';
import { join } from 'path';
import { nextTick } from 'vue';
import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils';
import PanelEstilista from 'src/components/estilistas/PanelEstilista.vue';
import { MENSAJE_CON_RESERVAS } from 'src/helpers/semana-estilistas';
import type { AbsenceItem } from 'src/api/workers-api';
import { semanaDePrueba } from './fixtures/estilistas';

/** Las ausencias de la semana de prueba (Bogotá = UTC−5). */
const mockAusencias: { lista: AbsenceItem[]; quitar: jest.Mock } = {
  lista: [],
  quitar: jest.fn(),
};
jest.mock('src/composables/workers/useAusencias', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { computed } = require('vue');
  return {
    useAusencias: () => ({
      ausencias: computed(() => mockAusencias.lista),
      cargando: computed(() => false),
      previsualizar: jest.fn(),
      marcar: jest.fn(),
      quitar: mockAusencias.quitar,
    }),
  };
});

const AUSENCIAS: AbsenceItem[] = [
  {
    // Viernes 9, de 10:00 a 12:00.
    id: 'a-2',
    workerId: 'w-mon',
    workerName: 'Monica',
    startsAt: '2026-10-09T15:00:00.000Z',
    endsAt: '2026-10-09T17:00:00.000Z',
  },
  {
    // Jueves 8, todo el día (8:00 a 20:00).
    id: 'a-1',
    workerId: 'w-mon',
    workerName: 'Monica',
    startsAt: '2026-10-08T13:00:00.000Z',
    endsAt: '2026-10-09T01:00:00.000Z',
  },
  {
    id: 'a-3',
    workerId: 'w-ale',
    workerName: 'Alejandro',
    startsAt: '2026-10-08T13:00:00.000Z',
    endsAt: '2026-10-09T01:00:00.000Z',
  },
];

const QDialogDoble = {
  name: 'QDialog',
  props: ['modelValue', 'maximized', 'position'],
  emits: ['update:modelValue'],
  template:
    '<div v-if="modelValue" data-test="dialogo-ausencia"><slot /></div>',
};

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
    global: {
      stubs: { RouterLink: RouterLinkStub, 'q-dialog': QDialogDoble },
    },
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

describe('PanelEstilista · ausencias', () => {
  beforeEach(() => {
    mockAusencias.lista = [];
    mockAusencias.quitar = jest.fn().mockResolvedValue(undefined);
  });

  it('«Marcar ausencia» abre el diálogo de esa estilista', async () => {
    const panel = montar();
    expect(panel.find('[data-test="dialogo-ausencia"]').exists()).toBe(false);

    const boton = panel.get('[data-test="marcar-ausencia"]');
    expect(boton.text()).toBe('Marcar ausencia');
    expect(boton.attributes('type')).toBe('button');
    await boton.trigger('click');

    const dialogo = panel.getComponent({ name: 'DialogoAusencia' });
    expect(dialogo.props('worker')).toEqual({ id: 'w-mon', name: 'Monica' });
    expect(panel.emitted('guardar')).toBeUndefined();

    dialogo.vm.$emit('hecho');
    await nextTick();
    expect(panel.find('[data-test="dialogo-ausencia"]').exists()).toBe(false);
  });

  it('el refresco de la semana tras marcar no cierra el diálogo ni toca el nombre', async () => {
    const panel = montar();
    await campo(panel).setValue('Monica R');
    await panel.get('[data-test="marcar-ausencia"]').trigger('click');

    // Misma estilista, objeto nuevo: lo que llega al invalidar la semana.
    await panel.setProps({ estilista: { ...MONICA, days: [...MONICA.days] } });

    expect(panel.find('[data-test="dialogo-ausencia"]').exists()).toBe(true);
    expect(campo(panel).element.value).toBe('Monica R');
  });

  it('la predeterminada y una estilista nueva no tienen ausencias', () => {
    for (const panel of [
      montar({ estilista: DEFECTO }),
      montar({ modo: 'crear', estilista: null }),
    ]) {
      expect(panel.find('[data-test="marcar-ausencia"]').exists()).toBe(false);
      expect(panel.find('[data-test="lista-ausencias"]').exists()).toBe(false);
    }
  });

  it('lista las ausencias próximas de esa estilista, en orden, con su franja', () => {
    mockAusencias.lista = AUSENCIAS;
    const panel = montar();

    const filas = panel.findAll('[data-test="ausencia"]');
    expect(
      filas.map((f) => f.get('[data-test="fecha-ausencia"]').text())
    ).toEqual(['Jueves 8 de octubre', 'Viernes 9 de octubre']);
    expect(
      filas.map((f) => f.get('[data-test="franja-ausencia"]').text())
    ).toEqual(['Todo el día', '10:00 – 12:00']);
    expect(panel.get('[data-test="advertencia-quitar"]').text()).toContain(
      'las citas movidas o canceladas no vuelven'
    );
  });

  it('sin ausencias próximas, lo dice', () => {
    expect(montar().get('[data-test="sin-ausencias"]').text()).toBe(
      'No tiene ausencias próximas.'
    );
  });

  it('«Quitar» quita esa ausencia; si falla, lo dice', async () => {
    mockAusencias.lista = AUSENCIAS;
    const panel = montar();

    const quitar = panel.findAll('[data-test="quitar-ausencia"]')[0];
    expect(quitar.attributes('aria-label')).toBe(
      'Quitar la ausencia del jueves 8 de octubre'
    );
    await quitar.trigger('click');
    await flushPromises();
    expect(mockAusencias.quitar).toHaveBeenCalledWith('a-1');
    expect(panel.emitted('guardar')).toBeUndefined();

    mockAusencias.quitar.mockRejectedValueOnce({
      response: { status: 404, data: {} },
    });
    await panel.findAll('[data-test="quitar-ausencia"]')[1].trigger('click');
    await flushPromises();
    expect(panel.get('[data-test="error-ausencias"]').text()).toBe(
      'Esa ausencia ya no estaba: la lista se actualizó.'
    );
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

describe('PanelEstilista · fix', () => {
  it('Escape con la confirmación abierta solo la cancela', async () => {
    const panel = montar();
    await panel.get('[data-test="eliminar-estilista"]').trigger('click');

    await panel
      .get('[data-test="panel-estilista"]')
      .trigger('keydown', { key: 'Escape' });

    expect(panel.find('[data-test="confirmacion-eliminar"]').exists()).toBe(
      false
    );
    expect(panel.emitted('cerrar')).toBeUndefined();

    await panel
      .get('[data-test="panel-estilista"]')
      .trigger('keydown', { key: 'Escape' });
    expect(panel.emitted('cerrar')).toHaveLength(1);
  });

  it('Escape detiene la propagación solo mientras se confirma', async () => {
    const panel = montar();
    const raiz = panel.get('[data-test="panel-estilista"]').element;
    const esc = () =>
      new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      });
    const alWindow = jest.fn();
    window.addEventListener('keydown', alWindow);
    document.body.appendChild(panel.element);

    await panel.get('[data-test="eliminar-estilista"]').trigger('click');
    raiz.dispatchEvent(esc());
    await nextTick();
    expect(alWindow).not.toHaveBeenCalled();

    raiz.dispatchEvent(esc());
    expect(alWindow).toHaveBeenCalledTimes(1);

    window.removeEventListener('keydown', alWindow);
    panel.element.remove();
  });

  it('el subrayado del enlace va en el texto, no en la caja', () => {
    const fuente = readFileSync(
      join(__dirname, '../../src/components/estilistas/PanelEstilista.vue'),
      'utf8'
    );
    const regla = /\.panel-estilista__enlace\s*\{([^}]*)\}/.exec(fuente);
    expect(regla?.[1]).toContain('text-decoration: underline');
    expect(regla?.[1]).toContain('text-underline-offset');
    expect(regla?.[1]).not.toContain('border-bottom');
  });

  it('el enlace a Reservas mide al menos el mínimo táctil', () => {
    const fuente = readFileSync(
      join(__dirname, '../../src/components/estilistas/PanelEstilista.vue'),
      'utf8'
    );
    const regla = /\.panel-estilista__enlace\s*\{([^}]*)\}/.exec(fuente);
    expect(regla?.[1]).toContain('min-height: var(--m-tactil-min)');
  });

  it('deja sitio abajo para el lanzador del asistente (no tapa «Sí, eliminar»)', () => {
    const fuente = readFileSync(
      join(__dirname, '../../src/components/estilistas/PanelEstilista.vue'),
      'utf8'
    );
    const regla = /\.panel-estilista\s*\{([^}]*)\}/.exec(fuente);
    expect(regla?.[1]).toContain(
      'padding: 24px 26px calc(var(--m-tactil-min) + 40px)'
    );
  });
});
