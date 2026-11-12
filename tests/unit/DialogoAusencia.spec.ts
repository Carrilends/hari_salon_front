import { readFileSync } from 'fs';
import { join } from 'path';
/**
 * El diálogo de «Marcar ausencia» (Task 9 del plan de ausencias): fecha, día
 * completo o franja, vista previa, confirmación y resultado. `useAusencias` se
 * dobla: aquí se vigila qué se pide, qué se muestra y qué se explica.
 */
import { flushPromises, mount } from '@vue/test-utils';
import type { AbsencePlan, AbsenceResult } from 'src/api/workers-api';

const mockPrevisualizar = jest.fn();
const mockMarcar = jest.fn();
jest.mock('src/composables/workers/useAusencias', () => ({
  useAusencias: () => ({
    previsualizar: mockPrevisualizar,
    marcar: mockMarcar,
  }),
}));

/** Hoy en el salón: miércoles 11 de noviembre de 2026, 7:00. */
jest.mock('src/helpers/businessHours', () => ({
  ...jest.requireActual('src/helpers/businessHours'),
  getSalonNowParts: () => ({
    ymd: '2026-11-11',
    qDate: '2026/11/11',
    minOfDay: 420,
  }),
}));

import DialogoAusencia from 'src/components/estilistas/DialogoAusencia.vue';

const ESTILISTA = { id: 'w-a', name: 'Estilista A' };
const JUEVES = '2026-11-12';
const SABADO = '2026-11-14';

/** Bogotá = UTC−5: las 10:00 del jueves 12 son las 15:00 UTC. */
const PLAN: AbsencePlan = {
  workerId: 'w-a',
  workerName: 'Estilista A',
  startsAt: '2026-11-12T15:00:00.000Z',
  endsAt: '2026-11-12T17:00:00.000Z',
  impacts: [
    {
      reservationId: 'r-1',
      scheduledAt: '2026-11-12T15:00:00.000Z',
      endedAt: '2026-11-12T15:30:00.000Z',
      customerName: 'Ana Prueba',
      customerPhone: '3000001001',
      services: ['Corte'],
      outcome: 'reasignada',
      newWorkerId: 'w-b',
      newWorkerName: 'Estilista B',
    },
    {
      reservationId: 'r-2',
      scheduledAt: '2026-11-12T16:00:00.000Z',
      endedAt: '2026-11-12T17:00:00.000Z',
      customerName: 'Cliente registrado',
      customerPhone: null,
      services: ['Tinte', 'Peinado'],
      outcome: 'cancelada',
    },
  ],
};

const errorHttp = (status: number, reason?: string) => ({
  isAxiosError: true,
  response: { status, data: reason ? { reason } : { message: 'x' } },
});

const montar = () => mount(DialogoAusencia, { props: { worker: ESTILISTA } });
type Dialogo = ReturnType<typeof montar>;

const textos = (d: Dialogo, sel: string) =>
  d
    .get(sel)
    .findAll('option')
    .map((o) => o.text());
const valores = (d: Dialogo, sel: string) =>
  d
    .get(sel)
    .findAll('option')
    .map((o) => (o.element as HTMLOptionElement).value);

async function elegirFranja(
  d: Dialogo,
  fecha: string,
  desde?: string,
  hasta?: string
) {
  await d.get('[data-test="fecha-ausencia"]').setValue(fecha);
  await d.get('[data-test="modo-franja"]').setValue(true);
  if (desde) await d.get('[data-test="desde-ausencia"]').setValue(desde);
  if (hasta) await d.get('[data-test="hasta-ausencia"]').setValue(hasta);
}

async function verQuePasa(d: Dialogo) {
  await d.get('[data-test="ver-que-pasa"]').trigger('click');
  await flushPromises();
}

beforeEach(() => {
  mockPrevisualizar.mockReset();
  mockMarcar.mockReset();
});

describe('DialogoAusencia · elegir', () => {
  it('franja ofrece solo horas del día en pasos de 30', async () => {
    const d = montar();

    await elegirFranja(d, JUEVES);
    const desde = valores(d, '[data-test="desde-ausencia"]');
    expect(desde[0]).toBe('08:00');
    expect(desde[desde.length - 1]).toBe('19:30');
    expect(desde).toHaveLength(24);
    expect(textos(d, '[data-test="desde-ausencia"]').slice(0, 2)).toEqual([
      '8:00',
      '8:30',
    ]);
    expect(textos(d, '[data-test="desde-ausencia"]')).toContain('12:00');

    // «Hasta» empieza media hora después de «desde» y acaba al cierre.
    await d.get('[data-test="desde-ausencia"]').setValue('10:00');
    const hasta = valores(d, '[data-test="hasta-ausencia"]');
    expect(hasta[0]).toBe('10:30');
    expect(hasta[hasta.length - 1]).toBe('20:00');
    expect(textos(d, '[data-test="hasta-ausencia"]').pop()).toBe('20:00');

    expect(d.get('[data-test="horario-dia"]').text()).toBe(
      'Horario de ese día: 8:00 – 20:00'
    );

    // El sábado abre a las 9:00 y cierra a las 19:00.
    await d.get('[data-test="fecha-ausencia"]').setValue(SABADO);
    const sabado = valores(d, '[data-test="desde-ausencia"]');
    expect(sabado[0]).toBe('09:00');
    expect(sabado[sabado.length - 1]).toBe('18:30');
    expect(valores(d, '[data-test="hasta-ausencia"]').pop()).toBe('19:00');
    expect(d.get('[data-test="horario-dia"]').text()).toBe(
      'Horario de ese día: 9:00 – 19:00'
    );
  });

  it('la fecha empieza hoy y no deja elegir días pasados', async () => {
    const d = montar();
    const fecha = d.get('[data-test="fecha-ausencia"]');

    expect((fecha.element as HTMLInputElement).value).toBe('2026-11-11');
    expect(fecha.attributes('min')).toBe('2026-11-11');

    await fecha.setValue('2026-11-10');
    await verQuePasa(d);
    expect(mockPrevisualizar).not.toHaveBeenCalled();
    expect(d.get('[data-test="error-ausencia"]').text()).toMatch(/hoy/);
  });

  it('día completo pide la vista previa sin horas', async () => {
    mockPrevisualizar.mockResolvedValue({ ...PLAN, impacts: [] });
    const d = montar();
    await d.get('[data-test="fecha-ausencia"]').setValue(JUEVES);

    await verQuePasa(d);

    expect(mockPrevisualizar).toHaveBeenCalledWith({
      workerId: 'w-a',
      date: JUEVES,
    });
    expect(d.get('[data-test="resumen-ausencia"]').text()).toContain(
      'No tiene citas en ese rato'
    );
  });

  it('no deja confirmar sin vista previa', async () => {
    mockPrevisualizar.mockResolvedValue(PLAN);
    const d = montar();
    await elegirFranja(d, JUEVES, '10:00', '12:00');

    expect(d.find('[data-test="confirmar-ausencia"]').exists()).toBe(false);

    await verQuePasa(d);
    expect(mockPrevisualizar).toHaveBeenCalledWith({
      workerId: 'w-a',
      date: JUEVES,
      from: '10:00',
      to: '12:00',
    });
    expect(d.find('[data-test="confirmar-ausencia"]').exists()).toBe(true);

    // Volver a cambiar algo descarta la vista previa: hay que verla de nuevo.
    await d.get('[data-test="cambiar-ausencia"]').trigger('click');
    await d.get('[data-test="hasta-ausencia"]').setValue('12:30');
    expect(d.find('[data-test="confirmar-ausencia"]').exists()).toBe(false);
    expect(mockMarcar).not.toHaveBeenCalled();
  });
});

describe('DialogoAusencia · vista previa y resultado', () => {
  it('muestra pasa a / se cancela por cita', async () => {
    mockPrevisualizar.mockResolvedValue(PLAN);
    const d = montar();
    await elegirFranja(d, JUEVES, '10:00', '12:00');

    await verQuePasa(d);

    expect(d.get('[data-test="resumen-ausencia"]').text()).toContain(
      'Estilista A · Jueves 12 de noviembre · 10:00 – 12:00'
    );
    const lineas = d.findAll('[data-test="impacto-ausencia"]');
    expect(lineas).toHaveLength(2);
    expect(lineas[0].get('[data-test="hora-impacto"]').text()).toBe('10:00');
    expect(lineas[0].text()).toContain('Ana Prueba');
    expect(lineas[0].text()).toContain('Corte');
    expect(lineas[0].get('[data-test="destino-impacto"]').text()).toBe(
      'pasa a Estilista B'
    );
    expect(lineas[1].get('[data-test="hora-impacto"]').text()).toBe('11:00');
    expect(lineas[1].text()).toContain('Tinte, Peinado');
    expect(lineas[1].get('[data-test="destino-impacto"]').text()).toBe(
      'se cancela'
    );
    expect(d.get('[data-test="cuenta-impactos"]').text()).toBe(
      '1 pasa a otra estilista · 1 se cancela'
    );
  });

  it('confirmar marca la ausencia y señala las que quedaron sin resolver', async () => {
    mockPrevisualizar.mockResolvedValue(PLAN);
    const resultado: AbsenceResult = {
      ...PLAN,
      impacts: [PLAN.impacts[0]],
      absenceId: 'a-1',
      sinResolver: ['r-2'],
    };
    mockMarcar.mockResolvedValue(resultado);
    const d = montar();
    await elegirFranja(d, JUEVES, '10:00', '12:00');
    await verQuePasa(d);

    // Un doble clic (el segundo antes de que vuelva la API) marca una vez.
    const confirmarBoton = d.get('[data-test="confirmar-ausencia"]');
    void confirmarBoton.trigger('click');
    await confirmarBoton.trigger('click');
    await flushPromises();

    expect(mockMarcar).toHaveBeenCalledTimes(1);
    expect(mockMarcar).toHaveBeenCalledWith({
      workerId: 'w-a',
      date: JUEVES,
      from: '10:00',
      to: '12:00',
    });
    expect(d.get('[data-test="titulo-ausencia"]').text()).toBe(
      'Ausencia guardada'
    );
    const hechas = d.findAll('[data-test="impacto-ausencia"]');
    expect(hechas[0].get('[data-test="destino-impacto"]').text()).toBe(
      'pasó a Estilista B'
    );
    const pendiente = d.get('[data-test="sin-resolver"]');
    expect(pendiente.text()).toContain('11:00 · Cliente registrado');
    expect(pendiente.text()).toContain('revísala en la bandeja');

    await d.get('[data-test="listo-ausencia"]').trigger('click');
    expect(d.emitted('hecho')).toHaveLength(1);
  });

  it('sin nombre de la estilista nueva, dice «otra estilista»', async () => {
    mockPrevisualizar.mockResolvedValue({
      ...PLAN,
      impacts: [{ ...PLAN.impacts[0], newWorkerName: '' }],
    });
    const d = montar();
    await elegirFranja(d, JUEVES, '10:00', '12:00');

    await verQuePasa(d);

    expect(d.get('[data-test="destino-impacto"]').text()).toBe(
      'pasa a otra estilista'
    );
  });
});

describe('DialogoAusencia · errores', () => {
  it('ausencia_cruzada se explica', async () => {
    mockPrevisualizar.mockResolvedValue(PLAN);
    mockMarcar.mockRejectedValue(errorHttp(409, 'ausencia_cruzada'));
    const d = montar();
    await elegirFranja(d, JUEVES, '10:00', '12:00');
    await verQuePasa(d);

    await d.get('[data-test="confirmar-ausencia"]').trigger('click');
    await flushPromises();

    const error = d.get('[data-test="error-ausencia"]');
    expect(error.attributes('role')).toBe('alert');
    expect(error.text()).toBe(
      'Estilista A ya tiene una ausencia que se cruza con ese rato. Quita la otra en la lista o elige otras horas.'
    );
  });

  it('ausencia_invalida se explica', async () => {
    mockPrevisualizar.mockRejectedValue(errorHttp(400, 'ausencia_invalida'));
    const d = montar();
    await elegirFranja(d, JUEVES, '10:00', '12:00');

    await verQuePasa(d);

    expect(d.get('[data-test="error-ausencia"]').text()).toBe(
      'Esas horas no sirven: tienen que ser de hoy en adelante, dentro del horario del salón, y no haber pasado ya.'
    );
    expect(d.find('[data-test="confirmar-ausencia"]').exists()).toBe(false);
  });

  it('la predeterminada y un fallo de red también se dicen en palabras', async () => {
    mockPrevisualizar.mockRejectedValueOnce(
      errorHttp(400, 'estilista_por_defecto')
    );
    const d = montar();
    await verQuePasa(d);
    expect(d.get('[data-test="error-ausencia"]').text()).toBe(
      '«Sin preferencia» no atiende: no se puede marcar como ausente.'
    );

    mockPrevisualizar.mockRejectedValueOnce(new Error('Network Error'));
    await verQuePasa(d);
    expect(d.get('[data-test="error-ausencia"]').text()).toBe(
      'No se pudo revisar la agenda. Revisa la conexión e inténtalo de nuevo.'
    );
  });

  it('la fecha lleva una pista visible AAAA-MM-DD para navegadores sin selector de fecha', () => {
    const d = montar();
    expect(d.get('[data-test="pista-fecha"]').text()).toBe('AAAA-MM-DD');
    expect(
      d.get('[data-test="fecha-ausencia"]').attributes('aria-describedby')
    ).toBe('ausencia-fecha-pista');
  });

  it('el alto máximo tiene respaldo en vh antes de dvh (Safari 13.1)', () => {
    const fuente = readFileSync(
      join(__dirname, '../../src/components/estilistas/DialogoAusencia.vue'),
      'utf8'
    );
    expect(fuente).toMatch(
      /max-height:\s*calc\(100vh - 48px\);\s*max-height:\s*calc\(100dvh - 48px\)/
    );
  });
});
