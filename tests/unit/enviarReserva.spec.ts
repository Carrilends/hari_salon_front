/**
 * El envío de la reserva (Foco de revisión 1). `POST /reservations` va con un
 * guard OPCIONAL: con un token vencido no responde 401 —que dispararía la
 * renovación—, sino que trata la reserva como anónima. Por eso se renueva
 * ANTES de enviar si al token le queda menos de un minuto.
 */
const mockCrear = jest.fn();
jest.mock('src/api/reservations-api', () => ({
  createReservation: (...args: unknown[]) => mockCrear(...args),
}));
const mockRenovar = jest.fn();
jest.mock('src/api/refresh-interceptor', () => ({
  refreshOnce: () => mockRenovar(),
}));

import { createPinia, setActivePinia } from 'pinia';
import { enviarReserva } from 'src/composables/booking/enviarReserva';
import { useAuthStore } from 'src/stores/auth-store';
import { errorDeRed, errorHttp } from './fixtures/acceso';

const SOLICITUD = {
  scheduledAt: '2026-10-08T15:30:00.000Z',
  serviceIds: ['s1'],
};
const RESERVA = { id: 'r1', workerId: 'w-monica' };

const iniciarSesion = (venceEnMs: number) =>
  useAuthStore().setSession(
    'token',
    { fullName: 'Laura Gómez', email: 'laura@correo.com', roles: ['user'] },
    Date.now() + venceEnMs
  );

beforeEach(() => {
  setActivePinia(createPinia());
  mockCrear.mockReset();
  mockRenovar.mockReset();
});

describe('enviarReserva', () => {
  it('sin sesión envía tal cual y no toca la sesión', async () => {
    mockCrear.mockResolvedValue(RESERVA);

    const resultado = await enviarReserva(SOLICITUD, false);

    expect(mockRenovar).not.toHaveBeenCalled();
    expect(mockCrear).toHaveBeenCalledWith(SOLICITUD);
    expect(resultado).toEqual({ tipo: 'creada', reserva: RESERVA });
  });

  it('con la sesión vigente no renueva', async () => {
    iniciarSesion(10 * 60_000);
    mockCrear.mockResolvedValue(RESERVA);

    await enviarReserva(SOLICITUD, true);

    expect(mockRenovar).not.toHaveBeenCalled();
    expect(mockCrear).toHaveBeenCalledTimes(1);
  });

  it('con el token a punto de caducar, renueva ANTES de enviar', async () => {
    iniciarSesion(30_000);
    const orden: string[] = [];
    mockRenovar.mockImplementation(async () => {
      orden.push('renovar');
    });
    mockCrear.mockImplementation(async () => {
      orden.push('crear');
      return RESERVA;
    });

    await enviarReserva(SOLICITUD, true);

    expect(orden).toEqual(['renovar', 'crear']);
  });

  it('el margen es de un minuto: con 61 s no renueva, con 59 s sí', async () => {
    mockCrear.mockResolvedValue(RESERVA);

    iniciarSesion(61_000);
    await enviarReserva(SOLICITUD, true);
    expect(mockRenovar).not.toHaveBeenCalled();

    iniciarSesion(59_000);
    await enviarReserva(SOLICITUD, true);
    expect(mockRenovar).toHaveBeenCalledTimes(1);
  });

  it('si la renovación falla, no manda una reserva huérfana', async () => {
    iniciarSesion(30_000);
    mockRenovar.mockRejectedValue(errorHttp(401));

    const resultado = await enviarReserva(SOLICITUD, true);

    expect(resultado).toEqual({ tipo: 'sesion-cerrada' });
    expect(mockCrear).not.toHaveBeenCalled();
  });

  it('un 409 es que la disponibilidad cambió', async () => {
    mockCrear.mockRejectedValue(
      errorHttp(409, 'El estilista ya tiene una reserva en ese horario')
    );

    expect(await enviarReserva(SOLICITUD, false)).toEqual({ tipo: 'conflicto' });
  });

  it('cualquier otro fallo es un error que se puede reintentar', async () => {
    mockCrear.mockRejectedValueOnce(errorDeRed());
    mockCrear.mockRejectedValueOnce(
      errorHttp(400, 'La reserva no puede programarse en el pasado')
    );

    expect(await enviarReserva(SOLICITUD, false)).toEqual({ tipo: 'error' });
    expect(await enviarReserva(SOLICITUD, false)).toEqual({ tipo: 'error' });
  });
});
