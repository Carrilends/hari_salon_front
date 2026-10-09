/**
 * El éxito dentro del cajón (B5). Antes, al registrar la reserva se abría
 * WhatsApp solo; ahora es un botón verde OPCIONAL con el mismo `wa.me` y el
 * mismo mensaje. Y no se promete ningún correo: el backend no lo envía.
 */
import { mount } from '@vue/test-utils';
import PantallaExito from 'src/components/reserva/PantallaExito.vue';
import type { ResumenExito } from 'src/components/reserva/tipos';

const URL_WHATSAPP =
  'https://wa.me/573208977471?text=%2AReserva%20-%20Hari%20Salon%2A';

const RESUMEN: ResumenExito = {
  fechaTexto: 'Jueves 8 de octubre',
  franja: '10:30 a 11:30',
  estilista: 'Monica',
  lineas: [
    { nombre: 'Wolf cut mujer', cantidad: 1, precio: 37000 },
    { nombre: 'Uñas de gel', cantidad: 1, precio: 48000 },
  ],
  total: 85000,
  conSesion: true,
  avisoPorWhatsApp: false,
  urlWhatsApp: URL_WHATSAPP,
};

const montar = (cambios: Partial<ResumenExito> = {}) =>
  mount(PantallaExito, {
    props: { resumen: { ...RESUMEN, ...cambios } },
    attachTo: document.body,
  });

afterEach(() => {
  document.body.innerHTML = '';
});

describe('PantallaExito', () => {
  it('anuncia que la cita quedó registrada, y pendiente', () => {
    const wrapper = montar();

    expect(wrapper.get('[role="status"]').text()).toBe(
      'Tu cita quedó registrada'
    );
    expect(wrapper.get('[data-test="texto-exito"]').text()).toContain(
      'Queda pendiente hasta que el salón la confirme.'
    );
  });

  it('con sesión y sin teléfono, la encuentra en «Mis reservas»', () => {
    expect(montar().get('[data-test="texto-exito"]').text()).toContain(
      'La encuentras en «Mis reservas».'
    );
  });

  it('con teléfono, le avisan por WhatsApp', () => {
    expect(
      montar({ avisoPorWhatsApp: true }).get('[data-test="texto-exito"]').text()
    ).toContain('Te avisaremos por WhatsApp.');
  });

  it('nunca promete un correo', () => {
    expect(montar().text()).not.toMatch(/correo/i);
    expect(montar({ conSesion: false }).text()).not.toMatch(/correo/i);
  });

  it('resume día, franja, estilista, servicios y total', () => {
    const resumen = montar().get('[data-test="resumen-exito"]');

    expect(resumen.text()).toContain('Jueves 8 de octubre');
    expect(resumen.text()).toContain('10:30 a 11:30 · con Monica');
    expect(resumen.findAll('[data-test="linea-exito"]')).toHaveLength(2);
    expect(resumen.text()).toContain('$ 37.000');
    expect(resumen.get('[data-test="total-exito"]').text()).toBe('$ 85.000');
  });

  it('sin estilista conocida no inventa una', () => {
    expect(
      montar({ estilista: null }).get('[data-test="resumen-exito"]').text()
    ).not.toContain('con ');
  });

  it('avisar al salón es un enlace a wa.me que se abre solo si lo pulsa', () => {
    const abrir = jest.spyOn(window, 'open').mockImplementation(() => null);
    const enlace = montar().get('[data-test="avisar-whatsapp"]');

    expect(enlace.element.tagName).toBe('A');
    expect(enlace.attributes('href')).toBe(URL_WHATSAPP);
    expect(enlace.attributes('target')).toBe('_blank');
    expect(enlace.attributes('rel')).toBe('noopener');
    expect(enlace.text()).toContain('Avisar al salón por WhatsApp');
    expect(abrir).not.toHaveBeenCalled();
    abrir.mockRestore();
  });

  it('con sesión, «Ver mis reservas»', async () => {
    const wrapper = montar();

    await wrapper.get('[data-test="ver-mis-reservas"]').trigger('click');
    await wrapper.get('[data-test="seguir-viendo"]').trigger('click');

    expect(wrapper.emitted('ver-mis-reservas')).toHaveLength(1);
    expect(wrapper.emitted('ver-servicios')).toHaveLength(1);
    expect(wrapper.find('[data-test="cerrar-exito"]').exists()).toBe(false);
  });

  it('sin sesión no hay «Mis reservas»: se cierra', async () => {
    const wrapper = montar({ conSesion: false });

    expect(wrapper.find('[data-test="ver-mis-reservas"]').exists()).toBe(false);
    await wrapper.get('[data-test="cerrar-exito"]').trigger('click');
    expect(wrapper.emitted('cerrar')).toHaveLength(1);
  });

  it('al aparecer, el foco va al titular', () => {
    montar();

    expect(document.activeElement?.textContent?.trim()).toBe(
      'Tu cita quedó registrada'
    );
  });
});
