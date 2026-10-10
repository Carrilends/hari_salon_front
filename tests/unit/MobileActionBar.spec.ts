import { mount } from '@vue/test-utils';
import MobileActionBar from 'src/components/index/MobileActionBar.vue';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('MobileActionBar', () => {
  it('«Reservar» avisa a la página, no navega por su cuenta', async () => {
    const wrapper = mount(MobileActionBar);

    await wrapper.get('[data-test="reservar"]').trigger('click');

    expect(wrapper.emitted('reservar')).toHaveLength(1);
  });

  it('el botón de WhatsApp lleva al número del salón y se abre fuera', () => {
    const enlace = mount(MobileActionBar).get('[data-test="whatsapp"]');

    expect(enlace.attributes('href')).toContain('wa.me/573208977471');
    expect(enlace.attributes('target')).toBe('_blank');
    expect(enlace.attributes('rel')).toContain('noopener');
  });

  it('el botón de WhatsApp es solo icono, así que lleva nombre accesible', () => {
    const enlace = mount(MobileActionBar).get('[data-test="whatsapp"]');

    expect(enlace.attributes('aria-label')).toMatch(/whatsapp/i);
  });

  it('no muestra el número de teléfono escrito', () => {
    expect(mount(MobileActionBar).text()).not.toMatch(/\d{3}\s?\d{3}\s?\d{2}\s?\d{2}/);
  });

  /**
   * El flotante del asistente vive en el armazón y se posa en la misma esquina
   * que esta barra: sin aviso, tapa el botón de WhatsApp. La barra marca el
   * `body` mientras está puesta para que el flotante se aparte, y lo desmarca
   * al irse, porque las demás páginas no la tienen.
   */
  it('avisa al armazón de que ocupa el borde inferior, y lo retira al irse', () => {
    const wrapper = mount(MobileActionBar);
    expect(document.body.classList.contains('m-con-barra-movil')).toBe(true);

    wrapper.unmount();
    expect(document.body.classList.contains('m-con-barra-movil')).toBe(false);
  });
});

/**
 * Plan 9, V3: en `/services`, con sesión de dueña, la barra no reserva: crea.
 * Sin variante sigue siendo la barra de la clienta en el inicio.
 */
describe('MobileActionBar · la variante de la dueña', () => {
  it('con «crear» pinta solo «Crear servicio»: ni Reservar ni WhatsApp', () => {
    const wrapper = mount(MobileActionBar, { props: { variante: 'crear' } });

    expect(wrapper.get('[data-test="crear-servicio"]').text()).toBe(
      'Crear servicio'
    );
    expect(wrapper.find('[data-test="reservar"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="whatsapp"]').exists()).toBe(false);
  });

  it('«Crear servicio» avisa a la página, no reserva', async () => {
    const wrapper = mount(MobileActionBar, { props: { variante: 'crear' } });

    await wrapper.get('[data-test="crear-servicio"]').trigger('click');

    expect(wrapper.emitted('crear-servicio')).toHaveLength(1);
    expect(wrapper.emitted('reservar')).toBeUndefined();
  });

  it('sin variante sigue siendo la barra de la clienta', () => {
    const wrapper = mount(MobileActionBar);

    expect(wrapper.find('[data-test="reservar"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="whatsapp"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="crear-servicio"]').exists()).toBe(false);
  });

  it('con «crear» también marca el body, para que el lanzador se aparte', () => {
    const wrapper = mount(MobileActionBar, { props: { variante: 'crear' } });
    expect(document.body.classList.contains('m-con-barra-movil')).toBe(true);

    wrapper.unmount();
    expect(document.body.classList.contains('m-con-barra-movil')).toBe(false);
  });
});

describe('MobileActionBar · lo que se lee en la fuente', () => {
  const FUENTE = readFileSync(
    join(__dirname, '../../src/components/index/MobileActionBar.vue'),
    'utf8'
  );

  /**
   * Foco de revisión 3. La marca del `body` existía pero nadie la leía: en el
   * inicio el lanzador del asistente no sale y no se notaba. En `/services` sí
   * sale (z 2600, por encima de la barra) y taparía «Crear servicio».
   */
  it('en móvil, con la barra puesta, el lanzador del asistente sube por encima de ella', () => {
    const global = FUENTE.slice(FUENTE.lastIndexOf('<style lang="scss">'));

    expect(global).toMatch(
      /@media \(max-width: 699px\) \{\s*body\.m-con-barra-movil \.assistant-launcher__fab \{\s*bottom: calc\(var\(--m-barra-movil-alto\) \+ 18px\);/
    );
  });

  it('«Crear servicio» es oro macizo con texto tinta, a lo ancho', () => {
    expect(FUENTE).toMatch(
      /\.mobile-bar__crear \{[^}]*background: var\(--m-oro\);[^}]*color: var\(--m-tinta\);/
    );
    expect(FUENTE).toContain('class="mobile-bar__crear m-boton--ancho"');
  });
});
