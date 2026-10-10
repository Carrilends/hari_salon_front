/**
 * La página «Mis estilistas», con sus piezas de verdad (tabla, tarjetas, panel)
 * y los composables doblados: lo que se vigila es el cableado —qué semana se
 * pide, qué mutación se llama con qué, qué se dice en línea y qué con un aviso—.
 * Los anchos se fijan con `fijarViewport`, que sí evalúa las consultas.
 */
import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils';
import { nextTick, ref, type Ref } from 'vue';
import type { WorkersWeekResponse } from 'src/api/workers-api';
import type { ReservationDto } from 'src/interfaces/booking';
import { fijarViewport } from '../viewportMock';
import { reservaDePrueba, semanaDePrueba } from './fixtures/estilistas';

jest.mock('src/composables/seo/useSeo', () => ({ useSeo: () => undefined }));

const mockLogro = jest.fn();
jest.mock('src/composables/shared/useAviso', () => ({
  useAviso: () => ({ logro: mockLogro, fallo: jest.fn(), atencion: jest.fn() }),
}));

const mockReplace = jest.fn();
jest.mock('vue-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

const mockAuth = { isAdmin: true };
jest.mock('src/stores/auth-store', () => ({ useAuthStore: () => mockAuth }));

/** Hoy, para la página: miércoles 7 de octubre de 2026, 10:00 en Bogotá. */
jest.mock('src/helpers/businessHours', () => ({
  ...jest.requireActual('src/helpers/businessHours'),
  getSalonNowParts: () => ({
    ymd: '2026-10-07',
    qDate: '2026/10/07',
    minOfDay: 600,
  }),
}));

type Mutacion = { mutateAsync: jest.Mock; isPending: Ref<boolean> };
const mockSemana: {
  lunes?: Ref<string>;
  habilitada?: Ref<boolean>;
  respuesta?: {
    semana: Ref<WorkersWeekResponse | undefined>;
    cargando: Ref<boolean>;
    error: Ref<unknown>;
    reintentar: jest.Mock;
  };
} = {};
jest.mock('src/composables/workers/useSemanaEstilistas', () => ({
  useSemanaEstilistas: (lunes: Ref<string>, habilitada: Ref<boolean>) => {
    mockSemana.lunes = lunes;
    mockSemana.habilitada = habilitada;
    return mockSemana.respuesta;
  },
}));
const mockReservas: { reservas?: Ref<ReservationDto[]> } = {};
jest.mock('src/composables/workers/useReservasDeHoy', () => ({
  useReservasDeHoy: () => ({ reservas: mockReservas.reservas }),
}));
const mockMutaciones: {
  actual?: { crear: Mutacion; renombrar: Mutacion; eliminar: Mutacion };
} = {};
jest.mock('src/composables/workers/useWorkers', () => ({
  useWorkers: () => mockMutaciones.actual,
}));

import WorkersPage from 'src/pages/WorkersPage.vue';

const QDialogDoble = {
  name: 'QDialog',
  props: ['modelValue', 'maximized', 'position', 'fullHeight'],
  emits: ['update:modelValue'],
  template: '<div v-if="modelValue" data-test="dialogo-panel"><slot /></div>',
};

const mutacion = (valor: unknown = {}): Mutacion => ({
  mutateAsync: jest.fn().mockResolvedValue(valor),
  isPending: ref(false),
});

beforeEach(() => {
  fijarViewport({ ancho: 1280 });
  mockAuth.isAdmin = true;
  mockLogro.mockReset();
  mockReplace.mockReset();
  mockSemana.respuesta = {
    semana: ref(semanaDePrueba()),
    cargando: ref(false),
    error: ref(null),
    reintentar: jest.fn(),
  };
  mockReservas.reservas = ref([reservaDePrueba()]);
  mockMutaciones.actual = {
    crear: mutacion({ id: 'w-new', name: 'Ana', isDefault: false }),
    renombrar: mutacion(),
    eliminar: mutacion({ deleted: true }),
  };
});

async function montar() {
  const pagina = mount(WorkersPage, {
    global: {
      stubs: {
        'q-page': { template: '<main><slot /></main>' },
        'q-dialog': QDialogDoble,
        RouterLink: RouterLinkStub,
      },
    },
  });
  await nextTick();
  return pagina;
}

type Pagina = Awaited<ReturnType<typeof montar>>;

async function elegir(pagina: Pagina, indice: number) {
  await pagina
    .findAll('[data-test="elegir-estilista"]')
    [indice].trigger('click');
}

async function escribirYGuardar(pagina: Pagina, texto: string) {
  await pagina.get('[data-test="campo-nombre"]').setValue(texto);
  await pagina.get('[data-test="panel-estilista"] form').trigger('submit');
  await flushPromises();
}

async function borrar(pagina: Pagina) {
  await pagina.get('[data-test="eliminar-estilista"]').trigger('click');
  await pagina.get('[data-test="confirmar-eliminar"]').trigger('click');
  await flushPromises();
}

describe('WorkersPage · la semana', () => {
  it('en escritorio pinta la tabla y nombra la semana', async () => {
    const pagina = await montar();

    expect(pagina.find('[data-test="tabla-semana"]').exists()).toBe(true);
    expect(pagina.find('[data-test="tarjetas-semana"]').exists()).toBe(false);
    expect(pagina.get('[data-test="antetitulo"]').text()).toBe(
      '3 estilistas · semana del 5 al 11 de octubre'
    );
    expect(pagina.get('[data-test="rotulo-semana"]').text()).toBe(
      '5 – 11 oct 2026'
    );
    expect(pagina.get('h1').text()).toBe('Mis estilistas');
  });

  it('a 390 px pinta tarjetas en vez de la tabla', async () => {
    fijarViewport({ ancho: 390 });
    const pagina = await montar();

    expect(pagina.find('[data-test="tarjetas-semana"]').exists()).toBe(true);
    expect(pagina.find('[data-test="tabla-semana"]').exists()).toBe(false);
  });

  it('pide la semana de hoy y las flechas van de lunes en lunes', async () => {
    const pagina = await montar();
    expect(mockSemana.lunes?.value).toBe('2026-10-05');

    await pagina.get('[data-test="semana-siguiente"]').trigger('click');
    expect(mockSemana.lunes?.value).toBe('2026-10-12');

    await pagina.get('[data-test="semana-anterior"]').trigger('click');
    await pagina.get('[data-test="semana-anterior"]').trigger('click');
    expect(mockSemana.lunes?.value).toBe('2026-09-28');
    expect(pagina.get('[data-test="rotulo-semana"]').text()).toBe(
      '28 sep – 4 oct 2026'
    );
  });

  it('si la semana no carga, lo dice y deja reintentar', async () => {
    mockSemana.respuesta!.semana.value = undefined;
    mockSemana.respuesta!.error.value = new Error('red');
    const pagina = await montar();

    expect(pagina.get('[data-test="error-semana"]').text()).toContain(
      'No se pudo cargar la semana.'
    );
    await pagina.get('[data-test="reintentar"]').trigger('click');
    expect(mockSemana.respuesta!.reintentar).toHaveBeenCalled();
  });

  it('sin estilistas asignables lo dice, y sigue mostrando la predeterminada', async () => {
    mockSemana.respuesta!.semana.value = semanaDePrueba({
      workers: semanaDePrueba().workers.filter((w) => w.isDefault),
    });
    const pagina = await montar();

    expect(pagina.find('[data-test="sin-estilistas"]').exists()).toBe(true);
    expect(pagina.find('[data-test="fila-sin-preferencia"]').exists()).toBe(
      true
    );
    expect(pagina.get('[data-test="antetitulo"]').text()).toContain(
      '0 estilistas'
    );
  });

  it('sin sesión de dueña vuelve a servicios y no habilita las consultas', async () => {
    mockAuth.isAdmin = false;
    await montar();

    expect(mockReplace).toHaveBeenCalledWith('/services');
    expect(mockSemana.habilitada?.value).toBe(false);
  });
});

describe('WorkersPage · el panel', () => {
  it('elegir una estilista abre su panel al lado de la tabla, con sus citas de hoy', async () => {
    const pagina = await montar();

    await elegir(pagina, 1);

    expect(pagina.get('[data-test="panel-titulo"]').text()).toBe('Monica');
    expect(pagina.find('[data-test="dialogo-panel"]').exists()).toBe(false);
    expect(pagina.get('[data-test="cita-hoy"]').text()).toBe(
      '8:30 – 10:00Balayage'
    );
    expect(pagina.text()).toContain('Hoy · miércoles 7');
    expect(pagina.text()).toContain('Semana · 5 – 11 oct 2026');
  });

  it('en móvil el panel se abre a pantalla completa', async () => {
    fijarViewport({ ancho: 390 });
    const pagina = await montar();

    await pagina.findAll('[data-test="tarjeta-estilista"]')[0].trigger('click');

    const dialogo = pagina.findComponent({ name: 'QDialog' });
    expect(dialogo.props('modelValue')).toBe(true);
    expect(dialogo.props('maximized')).toBe(true);
    expect(
      pagina
        .get('[data-test="dialogo-panel"] [data-test="panel-titulo"]')
        .text()
    ).toBe('Alejandro');
  });

  it('la X cierra el panel', async () => {
    const pagina = await montar();
    await elegir(pagina, 0);

    await pagina.get('[data-test="cerrar-panel"]').trigger('click');

    expect(pagina.find('[data-test="panel-estilista"]').exists()).toBe(false);
  });

  it('si la estilista desaparece de la semana (la borró otra pestaña), el panel se cierra', async () => {
    const pagina = await montar();
    await elegir(pagina, 2);

    mockSemana.respuesta!.semana.value = semanaDePrueba({
      workers: semanaDePrueba().workers.filter((w) => w.id !== 'w-son'),
    });
    await nextTick();

    expect(pagina.find('[data-test="panel-estilista"]').exists()).toBe(false);
  });
});

describe('WorkersPage · crear y renombrar', () => {
  it('«Agregar» crea con el nombre recortado y deja el panel listo para otra', async () => {
    const pagina = await montar();
    await pagina.get('[data-test="agregar-estilista"]').trigger('click');

    await escribirYGuardar(pagina, '  Ana  ');

    expect(mockMutaciones.actual!.crear.mutateAsync).toHaveBeenCalledWith({
      name: 'Ana',
    });
    expect(pagina.get('[data-test="exito-estilista"]').text()).toBe(
      'Se agregó a Ana.'
    );
    expect(
      pagina.get<HTMLInputElement>('[data-test="campo-nombre"]').element.value
    ).toBe('');
    expect(mockLogro).not.toHaveBeenCalled();
  });

  it('dos envíos seguidos crean UNA sola estilista', async () => {
    mockMutaciones.actual!.crear.mutateAsync.mockImplementation(
      () => new Promise(() => {})
    );
    const pagina = await montar();
    await pagina.get('[data-test="agregar-estilista"]').trigger('click');
    await pagina.get('[data-test="campo-nombre"]').setValue('Ana');

    const formulario = pagina.get('[data-test="panel-estilista"] form');
    await formulario.trigger('submit');
    await formulario.trigger('submit');

    expect(mockMutaciones.actual!.crear.mutateAsync).toHaveBeenCalledTimes(1);
  });

  it('renombrar manda el id y el nombre nuevo, y lo dice en línea', async () => {
    const pagina = await montar();
    await elegir(pagina, 1);

    await escribirYGuardar(pagina, 'Mónica');

    expect(mockMutaciones.actual!.renombrar.mutateAsync).toHaveBeenCalledWith({
      id: 'w-mon',
      body: { name: 'Mónica' },
    });
    expect(pagina.get('[data-test="exito-estilista"]').text()).toBe(
      'Cambios guardados.'
    );
  });

  it('un 400 al guardar se dice en línea', async () => {
    mockMutaciones.actual!.renombrar.mutateAsync.mockRejectedValue({
      response: { status: 400 },
    });
    const pagina = await montar();
    await elegir(pagina, 1);

    await escribirYGuardar(pagina, 'Mónica');

    expect(pagina.get('[data-test="error-guardar"]').text()).toBe(
      'Revisa el nombre: entre 2 y 120 caracteres.'
    );
  });
});

describe('WorkersPage · eliminar', () => {
  it('con reservas (409) lo dice en línea, con candado, y el panel no se cierra', async () => {
    mockMutaciones.actual!.eliminar.mutateAsync.mockRejectedValue({
      response: {
        status: 409,
        data: { message: 'No se puede eliminar el trabajador…' },
      },
    });
    const pagina = await montar();
    await elegir(pagina, 2);

    await borrar(pagina);

    expect(mockMutaciones.actual!.eliminar.mutateAsync).toHaveBeenCalledWith(
      'w-son'
    );
    expect(pagina.find('[data-test="panel-estilista"]').exists()).toBe(true);
    expect(pagina.get('[data-test="error-eliminar"]').text()).toBe(
      'No se puede eliminar: tiene reservas registradas'
    );
    expect(pagina.find('[data-test="eliminar-estilista"]').exists()).toBe(
      false
    );
    expect(mockLogro).not.toHaveBeenCalled();
  });

  it('un fallo de red no dice «tiene reservas» y deja reintentar', async () => {
    mockMutaciones.actual!.eliminar.mutateAsync.mockRejectedValue({
      message: 'Network Error',
    });
    const pagina = await montar();
    await elegir(pagina, 2);

    await borrar(pagina);

    expect(pagina.get('[data-test="error-eliminar"]').text()).toBe(
      'No se pudo eliminar. Revisa la conexión e inténtalo de nuevo.'
    );
    expect(pagina.find('[data-test="confirmar-eliminar"]').exists()).toBe(true);
    expect(mockLogro).not.toHaveBeenCalled();
  });

  it('sin reservas, borra, cierra el panel y lo cuenta con un aviso', async () => {
    const pagina = await montar();
    await elegir(pagina, 2);

    await borrar(pagina);

    expect(pagina.find('[data-test="panel-estilista"]').exists()).toBe(false);
    expect(mockLogro).toHaveBeenCalledWith('Se eliminó a Sonia s.');
  });

  it('cambiar de estilista borra los mensajes de la anterior', async () => {
    mockMutaciones.actual!.eliminar.mutateAsync.mockRejectedValue({
      response: { status: 409 },
    });
    const pagina = await montar();
    await elegir(pagina, 2);
    await borrar(pagina);

    await elegir(pagina, 0);

    expect(pagina.find('[data-test="error-eliminar"]').exists()).toBe(false);
    expect(pagina.find('[data-test="eliminar-estilista"]').exists()).toBe(true);
  });
});
describe('WorkersPage · resultados tardíos', () => {
  it('un guardado tardío de la estilista A no pinta en el panel de B', async () => {
    let resolver: (v: unknown) => void = () => {};
    mockMutaciones.actual!.renombrar.mutateAsync.mockImplementation(
      () => new Promise((r) => (resolver = r))
    );
    const pagina = await montar();
    await elegir(pagina, 1);
    await pagina.get('[data-test="campo-nombre"]').setValue('Mónica');
    await pagina.get('[data-test="panel-estilista"] form').trigger('submit');

    await elegir(pagina, 0);
    resolver({});
    await flushPromises();

    expect(pagina.get('[data-test="panel-titulo"]').text()).toBe('Alejandro');
    expect(pagina.find('[data-test="exito-estilista"]').exists()).toBe(false);
  });

  it('un error de borrado tardío de A no pinta en el panel de B', async () => {
    let rechazar: (e: unknown) => void = () => {};
    mockMutaciones.actual!.eliminar.mutateAsync.mockImplementation(
      () => new Promise((_, r) => (rechazar = r))
    );
    const pagina = await montar();
    await elegir(pagina, 2);
    await pagina.get('[data-test="eliminar-estilista"]').trigger('click');
    await pagina.get('[data-test="confirmar-eliminar"]').trigger('click');

    await elegir(pagina, 0);
    rechazar({ response: { status: 409 } });
    await flushPromises();

    expect(pagina.find('[data-test="error-eliminar"]').exists()).toBe(false);
    expect(pagina.find('[data-test="eliminar-estilista"]').exists()).toBe(true);
  });

  it('un borrado tardío de A que sí salió bien no cierra el panel de B', async () => {
    let resolver: (v: unknown) => void = () => {};
    mockMutaciones.actual!.eliminar.mutateAsync.mockImplementation(
      () => new Promise((r) => (resolver = r))
    );
    const pagina = await montar();
    await elegir(pagina, 2);
    await pagina.get('[data-test="eliminar-estilista"]').trigger('click');
    await pagina.get('[data-test="confirmar-eliminar"]').trigger('click');

    await elegir(pagina, 0);
    resolver({ deleted: true });
    await flushPromises();

    expect(pagina.get('[data-test="panel-titulo"]').text()).toBe('Alejandro');
    expect(mockLogro).toHaveBeenCalledWith('Se eliminó a Sonia s.');
  });
});
