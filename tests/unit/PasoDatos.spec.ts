/**
 * Paso 3, «Tus datos» (B4). Sin sesión: nombre, teléfono y la casilla de
 * tratamiento de datos SIN premarcar (Ley 1581). Con sesión: «Reservas como»,
 * teléfono opcional y la línea de la política ya aceptada, sin casilla.
 */
import { mount } from '@vue/test-utils';
import PasoDatos from 'src/components/reserva/PasoDatos.vue';
import type { ErroresDatos } from 'src/helpers/reserva-envio';
import { MENSAJES_DATOS } from 'src/helpers/reserva-envio';

const BASE = {
  conSesion: false,
  cuenta: { nombre: '', correo: '' },
  cita: {
    cuando: 'Jueves 8 de octubre · 10:30',
    detalle: 'Hasta las 11:30 · con Monica',
    servicios: 'Bob clásico · Uñas de gel',
  },
  nombre: '',
  telefono: '',
  consentimiento: false,
  errores: {} as ErroresDatos,
  errorEnvio: null as string | null,
};

const montar = (cambios: Partial<typeof BASE> = {}) =>
  mount(PasoDatos, { props: { ...BASE, ...cambios } });

const CON_SESION = {
  conSesion: true,
  cuenta: { nombre: 'Laura Gómez', correo: 'laura@correo.com' },
};

describe('PasoDatos', () => {
  it('resume la cita y deja cambiarla', async () => {
    const wrapper = montar();
    const tarjeta = wrapper.get('[data-test="tarjeta-cita"]');

    expect(tarjeta.text()).toContain('Jueves 8 de octubre · 10:30');
    expect(tarjeta.text()).toContain('Hasta las 11:30 · con Monica');
    expect(tarjeta.text()).toContain('Bob clásico · Uñas de gel');
    await wrapper.get('[data-test="cambiar-cita"]').trigger('click');
    expect(wrapper.emitted('cambiar')).toHaveLength(1);
  });

  describe('sin sesión', () => {
    it('pide nombre y teléfono con su etiqueta de verdad', () => {
      const wrapper = montar();

      expect(wrapper.get('label[for="reserva-nombre"]').text()).toBe('Nombre');
      expect(wrapper.get('label[for="reserva-telefono"]').text()).toBe(
        'Teléfono'
      );
      expect(
        wrapper.get('[data-test="campo-telefono"]').attributes('type')
      ).toBe('tel');
      expect(
        wrapper.get('[data-test="campo-telefono"]').attributes('inputmode')
      ).toBe('tel');
    });

    it('la casilla de tratamiento de datos va sin marcar, y enlaza la política', () => {
      const wrapper = montar();
      const casilla = wrapper.get('[data-test="casilla-consentimiento"]')
        .element as HTMLInputElement;

      expect(casilla.checked).toBe(false);
      expect(wrapper.get('a').attributes('href')).toBe(
        '/politica-tratamiento-datos'
      );
    });

    it('reenvía lo que escribe y marca', async () => {
      const wrapper = montar();

      await wrapper.get('[data-test="campo-nombre"]').setValue('Ana');
      await wrapper.get('[data-test="campo-telefono"]').setValue('3001234567');
      await wrapper.get('[data-test="casilla-consentimiento"]').setValue(true);

      expect(wrapper.emitted('update:nombre')?.[0]).toEqual(['Ana']);
      expect(wrapper.emitted('update:telefono')?.[0]).toEqual(['3001234567']);
      expect(wrapper.emitted('update:consentimiento')?.[0]).toEqual([true]);
    });

    it('los errores salen en línea, ligados a su campo', () => {
      const wrapper = montar({
        errores: {
          nombre: MENSAJES_DATOS.nombre,
          telefono: MENSAJES_DATOS.telefono,
          consentimiento: MENSAJES_DATOS.consentimiento,
        },
      });
      const nombre = wrapper.get('[data-test="campo-nombre"]');

      expect(wrapper.get('[data-test="error-nombre"]').text()).toBe(
        MENSAJES_DATOS.nombre
      );
      expect(nombre.attributes('aria-invalid')).toBe('true');
      expect(nombre.attributes('aria-describedby')).toBe(
        'reserva-nombre-error'
      );
      expect(
        wrapper
          .get('[data-test="campo-telefono"]')
          .attributes('aria-describedby')
      ).toBe('reserva-telefono-ayuda reserva-telefono-error');
      expect(wrapper.find('[data-test="error-consentimiento"]').exists()).toBe(
        true
      );
    });

    it('sin errores no apunta a ninguno (ni descripción colgante)', () => {
      const wrapper = montar();

      expect(
        wrapper.get('[data-test="campo-nombre"]').attributes('aria-describedby')
      ).toBeUndefined();
      expect(
        wrapper
          .get('[data-test="campo-telefono"]')
          .attributes('aria-describedby')
      ).toBe('reserva-telefono-ayuda');
    });

    it('invita a entrar para no escribir los datos', async () => {
      const wrapper = montar();

      await wrapper.get('[data-test="entrar"]').trigger('click');

      expect(wrapper.emitted('entrar')).toHaveLength(1);
    });
  });

  describe('con sesión', () => {
    it('dice con qué cuenta reserva, sin pedir el nombre', () => {
      const wrapper = montar(CON_SESION);
      const cuenta = wrapper.get('[data-test="reservas-como"]');

      expect(cuenta.text()).toContain('LG');
      expect(cuenta.text()).toContain('Laura Gómez');
      expect(cuenta.text()).toContain('laura@correo.com');
      expect(wrapper.find('[data-test="campo-nombre"]').exists()).toBe(false);
    });

    it('sin casilla: la política ya se aceptó al crear la cuenta', () => {
      const wrapper = montar(CON_SESION);

      expect(
        wrapper.find('[data-test="casilla-consentimiento"]').exists()
      ).toBe(false);
      expect(wrapper.get('[data-test="politica-aceptada"]').text()).toContain(
        'Aceptaste la política de tratamiento de datos al crear tu cuenta'
      );
    });

    it('el teléfono es opcional, para los avisos por WhatsApp', () => {
      const wrapper = montar(CON_SESION);

      expect(wrapper.get('label[for="reserva-telefono"]').text()).toBe(
        'Teléfono (opcional)'
      );
      expect(wrapper.text()).toContain(
        'Si lo dejas, te avisamos de tu cita por WhatsApp.'
      );
    });

    it('no promete un correo que el backend no envía', () => {
      // La dirección sí sale («Reservas como»); fuera de ella, ni una mención.
      const texto = montar(CON_SESION).text().replace('laura@correo.com', '');

      expect(texto).not.toMatch(/correo/i);
    });

    it('si la cuenta no tiene nombre, usa la parte local del correo', () => {
      const wrapper = montar({
        conSesion: true,
        cuenta: { nombre: '', correo: 'ana.p@correo.com' },
      });

      expect(wrapper.get('[data-test="reservas-como"]').text()).toContain(
        'ana.p'
      );
    });

    it('no invita a entrar', () => {
      expect(montar(CON_SESION).find('[data-test="entrar"]').exists()).toBe(
        false
      );
    });
  });

  it('un error al enviar sale en línea, sin vaciar los campos', () => {
    const wrapper = montar({
      nombre: 'Ana',
      telefono: '3001234567',
      errorEnvio: 'No pudimos registrar tu reserva.',
    });

    expect(wrapper.get('[data-test="error-envio"]').attributes('role')).toBe(
      'alert'
    );
    expect(
      (wrapper.get('[data-test="campo-nombre"]').element as HTMLInputElement)
        .value
    ).toBe('Ana');
  });
});
