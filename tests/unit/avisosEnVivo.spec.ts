/**
 * A5: los avisos en tiempo real se fijan sobre la lista de la bandeja en vez
 * de flotar 8 s. Este almacén los guarda: lo llena `useAdminNotifications`
 * (estén o no en la bandeja) y lo pinta `AvisosFijados`.
 */
import {
  MAX_AVISOS,
  SALIO_DE_LA_LISTA,
  useAvisosEnVivo,
} from 'src/composables/notifications/avisosEnVivo';
import { reservationEventEffects } from 'src/composables/notifications/reservationEventEffects';
import type { ReservationEvent } from 'src/interfaces/booking';
import {
  cancelledByCustomer,
  confirmedEvent,
  createdEvent,
} from './fixtures/reservation-events';

const asIs = (iso: string) => iso;
const registrar = (evento: ReservationEvent) =>
  useAvisosEnVivo().registrar(evento, reservationEventEffects(evento, asIs).notice);
const avisos = () => useAvisosEnVivo().avisos.value;

beforeEach(() => {
  const vivos = useAvisosEnVivo();
  vivos.vaciar();
  vivos.marcarBandeja(false);
  vivos.marcarEnVivo(false);
});

describe('avisosEnVivo', () => {
  it('fija el aviso con el texto de la tabla de efectos', () => {
    registrar(createdEvent);

    expect(avisos()).toHaveLength(1);
    expect(avisos()[0]).toMatchObject({
      reservationId: 'res-1',
      evento: 'reservation.created',
      mensaje: 'Nueva reserva de Ana',
      detalle: createdEvent.scheduledAt,
    });
  });

  it('una cancelación dice que la fila ya no está en la lista', () => {
    registrar(cancelledByCustomer);

    expect(avisos()[0].mensaje).toBe('Ana canceló su cita');
    expect(avisos()[0].detalle).toBe(
      `${cancelledByCustomer.scheduledAt} · ${SALIO_DE_LA_LISTA}`
    );
  });

  it('el más reciente va primero', () => {
    registrar(createdEvent);
    registrar(confirmedEvent);

    expect(avisos().map((a) => a.evento)).toEqual([
      'reservation.confirmed',
      'reservation.created',
    ]);
  });

  it('el mismo evento de la misma reserva no se repite: sube arriba', () => {
    registrar(createdEvent);
    registrar(confirmedEvent);
    registrar(createdEvent);

    expect(avisos().map((a) => a.evento)).toEqual([
      'reservation.created',
      'reservation.confirmed',
    ]);
  });

  it(`una ráfaga no entierra la lista: quedan los ${MAX_AVISOS} más recientes`, () => {
    for (let i = 0; i < 8; i++) {
      registrar({ ...createdEvent, reservationId: `res-${i}` });
    }

    expect(avisos().map((a) => a.reservationId)).toEqual([
      'res-7',
      'res-6',
      'res-5',
      'res-4',
      'res-3',
    ]);
  });

  it('cada aviso tiene su propio id, aunque sea de la misma reserva', () => {
    registrar(createdEvent);
    registrar(cancelledByCustomer);

    const [a, b] = avisos();
    expect(a.id).not.toBe(b.id);
  });

  it('descartar quita solo ese aviso', () => {
    registrar(createdEvent);
    registrar(confirmedEvent);
    const confirmado = avisos()[0];

    useAvisosEnVivo().descartar(confirmado.id);

    expect(avisos().map((a) => a.evento)).toEqual(['reservation.created']);
  });

  it('el estado se comparte entre quien lo pida', () => {
    useAvisosEnVivo().marcarBandeja(true);
    useAvisosEnVivo().marcarEnVivo(true);

    expect(useAvisosEnVivo().bandejaAbierta.value).toBe(true);
    expect(useAvisosEnVivo().enVivo.value).toBe(true);
  });
});
