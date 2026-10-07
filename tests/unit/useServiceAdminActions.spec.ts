/**
 * Los manejadores de administración, fuera de la página.
 *
 * Lo que más se vigila aquí es el cuerpo del `PATCH`: el endpoint del servicio
 * exige el cuerpo COMPLETO y los tags como ids. Un cuerpo parcial deja el
 * servicio sin etiquetas al activar una promoción, y la clienta no vuelve a
 * encontrarlo por su categoría. De ahí `buildPromotionPayload` y
 * `normalizeServiceTags`, que se prueban directamente.
 */
const dialogo = jest.fn();
const loadingShow = jest.fn();
const loadingHide = jest.fn();
const patch = jest.fn();
const getServiceMock = jest.fn();
const deleteServiceMock = jest.fn();
const syncBookingWithService = jest.fn();
const logro = jest.fn();
const fallo = jest.fn();
const atencion = jest.fn();
const setQueryData = jest.fn();
const refrescar = jest.fn();
const serviceIdEditRef = { value: '' };
const authState = { isAdmin: true, isLoggedIn: true };
const storeState: { services: unknown[] } = { services: [] };

jest.mock('quasar', () => ({
  useQuasar: () => ({
    dialog: dialogo,
    loading: { show: loadingShow, hide: loadingHide },
  }),
}));
jest.mock('src/api/services-api', () => ({
  adminServiceApi: { patch },
  servicesApi: {},
}));
jest.mock('src/composables/services/useService', () => ({
  useServiceForEdition: () => ({ serviceIdEditRef }),
  getService: (...args: unknown[]) => getServiceMock(...args),
  deleteService: (...args: unknown[]) => deleteServiceMock(...args),
}));
jest.mock('src/stores/auth-store', () => ({ useAuthStore: () => authState }));
jest.mock('src/stores/book-store', () => ({
  useBookStore: () => ({ syncBookingWithService }),
}));
jest.mock('src/stores/service-store', () => ({
  useServicesStore: () => storeState,
}));
jest.mock('src/composables/shared/useAviso', () => ({
  useAviso: () => ({ logro, fallo, atencion }),
}));
// Fuera de un `setup` no hay cliente de Vue Query: se dobla para ver qué se
// siembra en la caché de la ficha.
jest.mock('@tanstack/vue-query', () => ({
  useQueryClient: () => ({ setQueryData }),
}));
// Los diálogos solo se identifican: su conducta ya tiene sus propias suites.
jest.mock('src/components/dialogs/ServicePromotionDialog.vue', () => ({
  default: { name: 'ServicePromotionDialog' },
}));
jest.mock('src/components/dialogs/ServiceDeleteDialog.vue', () => ({
  default: { name: 'ServiceDeleteDialog' },
}));

import { nextTick } from 'vue';
// `promocionar` registra un `onOk` sincrónico que lanza trabajo asíncrono sin
// devolverlo: sin vaciar la cola de microtareas, las aserciones corren antes
// de que el PATCH haya ocurrido y la prueba pasa por el motivo equivocado.
import { flushPromises } from '@vue/test-utils';
import ServiceDeleteDialog from 'src/components/dialogs/ServiceDeleteDialog.vue';
import ServicePromotionDialog from 'src/components/dialogs/ServicePromotionDialog.vue';
import {
  buildPromotionPayload,
  normalizeServiceTags,
  paginaTrasBorrado,
  useServiceAdminActions,
} from 'src/composables/services/useServiceAdminActions';
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
  tags: [{ id: 't1' }, { id: 't2' }, { id: '' }],
  images: [
    {
      id: 'i1',
      url: 'https://x/y.jpg',
      isPrincipal: true,
      publicId: 'y',
      version: '1',
    },
  ],
  detail: {
    id: 'd1',
    description: 'Corte recto a la mandíbula',
    specifications: { faceTypes: ['Oval'] },
  },
} as unknown as Service;

/** Captura el `onOk` que el composable registra en `$q.dialog`. */
let confirmar: ((payload?: unknown) => unknown) | undefined;

function prepararDialogo() {
  confirmar = undefined;
  dialogo.mockImplementation(() => {
    const cadena = {
      onOk(cb: (payload?: unknown) => unknown) {
        confirmar = cb;
        return cadena;
      },
      onCancel() {
        return cadena;
      },
      onDismiss() {
        return cadena;
      },
    };
    return cadena;
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  prepararDialogo();
  serviceIdEditRef.value = '';
  authState.isAdmin = true;
  authState.isLoggedIn = true;
  storeState.services = [SERVICIO];
  patch.mockResolvedValue({ data: {} });
  getServiceMock.mockResolvedValue({ ...SERVICIO, price: 40000 });
  deleteServiceMock.mockResolvedValue(undefined);
});

describe('normalizeServiceTags', () => {
  it('convierte los tags del API en ids y descarta los vacíos', () => {
    expect(normalizeServiceTags(SERVICIO)).toEqual(['t1', 't2']);
  });

  it('acepta también los tags que ya son ids', () => {
    const plano = { ...SERVICIO, tags: ['t9'] } as unknown as Service;

    expect(normalizeServiceTags(plano)).toEqual(['t9']);
  });

  it('un servicio sin tags no revienta', () => {
    const sinTags = { ...SERVICIO, tags: undefined } as unknown as Service;

    expect(normalizeServiceTags(sinTags)).toEqual([]);
  });
});

describe('buildPromotionPayload', () => {
  it('conserva las etiquetas al activar la promoción', () => {
    expect(buildPromotionPayload(SERVICIO, true, 20).tags).toEqual([
      't1',
      't2',
    ]);
  });

  it('manda el cuerpo completo que el endpoint exige', () => {
    const payload = buildPromotionPayload(SERVICIO, true, 20);

    expect(payload).toEqual({
      name: 'Bob clásico',
      detail: {
        id: 'd1',
        description: 'Corte recto a la mandíbula',
        specifications: { faceTypes: ['Oval'] },
      },
      price: 45000,
      images: SERVICIO.images,
      tags: ['t1', 't2'],
      havePromotion: true,
      porcentageDiscount: 20,
    });
  });

  it('al quitar la promoción deja el porcentaje en cero sin tocar lo demás', () => {
    const payload = buildPromotionPayload(SERVICIO, false, 0);

    expect(payload.havePromotion).toBe(false);
    expect(payload.porcentageDiscount).toBe(0);
    expect(payload.tags).toEqual(['t1', 't2']);
  });
});

describe('paginaTrasBorrado', () => {
  /** Review Focus 1. */
  it('retrocede cuando se borra el último de una página que no es la primera', () => {
    expect(paginaTrasBorrado(1, 3)).toBe(2);
  });

  it('en la primera página se queda donde está', () => {
    expect(paginaTrasBorrado(1, 1)).toBe(1);
  });

  it('con más servicios en la página no se mueve', () => {
    expect(paginaTrasBorrado(4, 3)).toBe(3);
  });

  it('una página que ya llegó vacía también retrocede', () => {
    expect(paginaTrasBorrado(0, 2)).toBe(1);
  });
});

describe('useServiceAdminActions · editar', () => {
  it('reabre el formulario incluso con el mismo servicio dos veces seguidas', async () => {
    const admin = useServiceAdminActions({ refrescar });

    admin.editar('s1');
    expect(serviceIdEditRef.value).toBe('');

    await nextTick();
    expect(serviceIdEditRef.value).toBe('s1');
  });

  it('sin sesión de administradora no hace nada', async () => {
    authState.isAdmin = false;
    const admin = useServiceAdminActions({ refrescar });

    admin.editar('s1');
    await nextTick();

    expect(serviceIdEditRef.value).toBe('');
  });
});

describe('useServiceAdminActions · promocionar', () => {
  it('abre el diálogo propio con el servicio', () => {
    const admin = useServiceAdminActions({ refrescar });

    admin.promocionar(SERVICIO);

    expect(dialogo).toHaveBeenCalledWith(
      expect.objectContaining({
        component: ServicePromotionDialog,
        componentProps: { service: SERVICIO },
      })
    );
  });

  it('aplica el porcentaje con el cuerpo completo y sincroniza la bolsa', async () => {
    const admin = useServiceAdminActions({ refrescar });
    admin.promocionar(SERVICIO);

    confirmar?.(20);
    await flushPromises();

    expect(patch).toHaveBeenCalledWith('/service/s1', {
      name: 'Bob clásico',
      detail: {
        id: 'd1',
        description: 'Corte recto a la mandíbula',
        specifications: { faceTypes: ['Oval'] },
      },
      price: 45000,
      images: SERVICIO.images,
      tags: ['t1', 't2'],
      havePromotion: true,
      porcentageDiscount: 20,
    });
    expect(syncBookingWithService).toHaveBeenCalledWith(
      expect.objectContaining({ price: 40000 })
    );
    expect(refrescar).toHaveBeenCalledWith('promocion');
    expect(logro).toHaveBeenCalledWith(expect.stringContaining('20'));
    expect(loadingHide).toHaveBeenCalled();
  });

  it('un cero significa quitar la promoción', async () => {
    const admin = useServiceAdminActions({ refrescar });
    admin.promocionar(SERVICIO);

    confirmar?.(0);
    await flushPromises();

    expect(patch.mock.calls[0][1]).toMatchObject({
      havePromotion: false,
      porcentageDiscount: 0,
    });
    // Quitar la promoción también cambia el precio: la bolsa y la lista se
    // enteran igual que al ponerla.
    expect(syncBookingWithService).toHaveBeenCalledWith(
      expect.objectContaining({ id: 's1' })
    );
    expect(refrescar).toHaveBeenCalledWith('promocion');
    expect(logro).toHaveBeenCalledWith('Promoción retirada');
  });

  /**
   * La ficha guarda su consulta tres minutos (`staleTime`): sin sembrar la
   * respuesta nueva, abrir el detalle justo después enseñaría el precio viejo.
   */
  it('siembra el servicio recién leído en la caché de la ficha', async () => {
    const admin = useServiceAdminActions({ refrescar });
    admin.promocionar(SERVICIO);

    confirmar?.(20);
    await flushPromises();

    expect(setQueryData).toHaveBeenCalledWith(
      ['service', 's1'],
      expect.objectContaining({ id: 's1', price: 40000 })
    );
  });

  /**
   * El PATCH ya cambió el precio en el servidor: aunque la lectura de después
   * falle, la lista tiene que recargarse, y el aviso no puede decir que la
   * promoción no se guardó.
   */
  it('si el PATCH entra pero la lectura de después falla, refresca igual y lo dice aparte', async () => {
    getServiceMock.mockRejectedValueOnce(new Error('red'));
    const admin = useServiceAdminActions({ refrescar });
    admin.promocionar(SERVICIO);

    confirmar?.(20);
    await flushPromises();

    expect(refrescar).toHaveBeenCalledWith('promocion');
    expect(fallo).not.toHaveBeenCalledWith(
      'No se pudo actualizar la promoción del servicio'
    );
    expect(atencion).toHaveBeenCalledWith(
      expect.stringContaining('no se pudo recargar')
    );
    expect(syncBookingWithService).not.toHaveBeenCalled();
    expect(setQueryData).not.toHaveBeenCalled();
    expect(loadingHide).toHaveBeenCalled();
  });

  /** Review Focus 3: el PATCH falla. */
  it('si el PATCH falla avisa, no refresca y no toca la bolsa', async () => {
    patch.mockRejectedValueOnce(new Error('red'));
    const admin = useServiceAdminActions({ refrescar });
    admin.promocionar(SERVICIO);

    confirmar?.(20);
    await flushPromises();

    expect(fallo).toHaveBeenCalledWith(
      'No se pudo actualizar la promoción del servicio'
    );
    expect(syncBookingWithService).not.toHaveBeenCalled();
    expect(refrescar).not.toHaveBeenCalled();
    expect(loadingHide).toHaveBeenCalled();
  });

  it('sin sesión de administradora no abre nada', () => {
    authState.isAdmin = false;
    const admin = useServiceAdminActions({ refrescar });

    admin.promocionar(SERVICIO);

    expect(dialogo).not.toHaveBeenCalled();
  });
});

describe('useServiceAdminActions · eliminar', () => {
  it('abre la confirmación con la ficha del servicio que está en la lista', async () => {
    const admin = useServiceAdminActions({ refrescar });

    await admin.eliminar('s1');

    expect(getServiceMock).not.toHaveBeenCalled();
    expect(dialogo).toHaveBeenCalledWith(
      expect.objectContaining({
        component: ServiceDeleteDialog,
        componentProps: { service: SERVICIO },
      })
    );
  });

  /** Review Focus 2: la lista ya no lo tiene. */
  it('si el servicio ya no está en la lista lo pide al API', async () => {
    storeState.services = [];
    const admin = useServiceAdminActions({ refrescar });

    await admin.eliminar('s1');

    expect(getServiceMock).toHaveBeenCalledWith('s1');
    expect(dialogo).toHaveBeenCalled();
  });

  /**
   * Sin ficha no hay confirmación: un diálogo de borrado que no dice qué se
   * borra es la ruleta que la remodelación quitó.
   */
  it('si no está en la lista y el API tampoco lo da, avisa y no abre nada', async () => {
    storeState.services = [];
    getServiceMock.mockRejectedValueOnce(new Error('404'));
    const admin = useServiceAdminActions({ refrescar });

    await admin.eliminar('s1');

    expect(fallo).toHaveBeenCalledWith(
      'No se pudo cargar el servicio que se va a eliminar'
    );
    expect(dialogo).not.toHaveBeenCalled();
    expect(refrescar).not.toHaveBeenCalled();
  });

  it('al confirmar borra, avisa y manda refrescar', async () => {
    const admin = useServiceAdminActions({ refrescar });
    await admin.eliminar('s1');

    confirmar?.();
    await flushPromises();

    expect(deleteServiceMock).toHaveBeenCalledWith('s1');
    expect(logro).toHaveBeenCalledWith('Servicio eliminado correctamente');
    expect(refrescar).toHaveBeenCalledWith('borrado');
  });

  it('si el borrado falla avisa y no manda refrescar', async () => {
    deleteServiceMock.mockRejectedValueOnce(new Error('red'));
    const admin = useServiceAdminActions({ refrescar });
    await admin.eliminar('s1');

    confirmar?.();
    await flushPromises();

    expect(fallo).toHaveBeenCalledWith('Error al eliminar el servicio');
    expect(refrescar).not.toHaveBeenCalled();
  });

  it('sin sesión de administradora no abre nada', async () => {
    authState.isAdmin = false;
    const admin = useServiceAdminActions({ refrescar });

    await admin.eliminar('s1');

    expect(dialogo).not.toHaveBeenCalled();
  });
});
