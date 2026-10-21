/**
 * El éxito dentro del cajón (B5). Ya no ofrece «Avisar al salón por WhatsApp»
 * (plan 06, F7): la reserva ya está en el sistema y la peluquería se entera
 * sola; mandar el resumen a la línea del negocio, donde contesta el asistente,
 * se leería como otra reserva. Y no se promete ningún correo: el backend no lo
 * envía.
 */
import { mount } from '@vue/test-utils';
import PantallaExito from 'src/components/reserva/PantallaExito.vue';
import type { ResumenExito } from 'src/components/reserva/tipos';

const RESUMEN: ResumenExito = {
  fechaTexto: 'Jueves 8 de octubre',
  franja: '10:30 a 11:30',
  estilista: 'Monica',
  lineas: [
    { nombre: 'Wolf cut mujer', precio: 37000 },
    { nombre: 'Uñas de gel', precio: 48000 },
  ],
  total: 85000,
  conSesion: true,
  avisoPorWhatsApp: false,
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

    expect(wrapper.get('[role="status"]').text()).toContain(
      'Tu cita quedó registrada'
    );
    expect(wrapper.get('[data-test="texto-exito"]').text()).toContain(
      'Queda pendiente hasta que el salón la confirme.'
    );
  });

  it('el título sigue siendo un encabezado: la región viva es su envoltorio', () => {
    const wrapper = montar();
    const titulo = wrapper.get('h3');

    expect(titulo.text()).toBe('Tu cita quedó registrada');
    expect(titulo.attributes('role')).toBeUndefined();
    expect(wrapper.get('[role="status"]').find('h3').exists()).toBe(true);
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

  it('no ofrece mandar el resumen por WhatsApp (plan 06, F7)', () => {
    const wrapper = montar();

    expect(wrapper.find('[data-test="avisar-whatsapp"]').exists()).toBe(false);
    expect(wrapper.html()).not.toContain('wa.me');
    expect(wrapper.text()).not.toContain('Avisar al salón');
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
