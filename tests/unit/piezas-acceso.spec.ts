/**
 * Las piezas pequeñas del acceso: la lista viva de reglas de contraseña (A6),
 * el aviso en línea (A7, A15), el separador de Google (A9) y el estado de
 * pantalla completa (A13, A14, A16).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { mount } from '@vue/test-utils';
import ReglasContrasena from 'src/components/auth/ReglasContrasena.vue';
import AvisoAcceso from 'src/components/auth/AvisoAcceso.vue';
import SeparadorAcceso from 'src/components/auth/SeparadorAcceso.vue';
import EstadoAcceso from 'src/components/auth/EstadoAcceso.vue';

const leer = (archivo: string) =>
  readFileSync(join(__dirname, '../../src/components/auth', archivo), 'utf8');

const cuerpoDe = (fuente: string, selector: string) =>
  fuente
    .slice(fuente.indexOf('<style'))
    .match(
      new RegExp(
        `${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`
      )
    )?.[1] ?? '';

describe('ReglasContrasena (A6)', () => {
  const cumple = (valor: string) => {
    const wrapper = mount(ReglasContrasena, { props: { valor } });
    return ['largo', 'mayuscula', 'minuscula', 'numero'].map((clave) =>
      wrapper.find(`[data-test="regla-${clave}"]`).attributes('data-cumple')
    );
  };

  it('lista las cuatro reglas en el orden y con el texto de la especificación', () => {
    const wrapper = mount(ReglasContrasena, { props: { valor: '' } });
    // El texto visible, sin el «(pendiente)» que solo oyen los lectores.
    const textos = wrapper
      .findAll('li')
      .map((li) => li.text().replace(/\((cumplida|pendiente)\)$/, '').trim());

    expect(textos).toEqual([
      '8 caracteres o más',
      'Una mayúscula',
      'Una minúscula',
      'Un número',
    ]);
  });

  it('vacía: todas pendientes', () => {
    expect(cumple('')).toEqual(['no', 'no', 'no', 'no']);
  });

  it('«Marlen»: mayúscula y minúscula sí; largo y número no', () => {
    expect(cumple('Marlen')).toEqual(['no', 'si', 'si', 'no']);
  });

  it('«Marlene2026»: todas cumplidas', () => {
    expect(cumple('Marlene2026')).toEqual(['si', 'si', 'si', 'si']);
  });

  it('es una región viva y lleva el id que enlaza la contraseña', () => {
    const lista = mount(ReglasContrasena, { props: { valor: '' } }).find(
      '[data-test="reglas-contrasena"]'
    );
    expect(lista.attributes('aria-live')).toBe('polite');
    expect(lista.attributes('id')).toBe('reglas-contrasena');
  });

  it('anuncia el estado de cada regla a los lectores de pantalla', () => {
    const wrapper = mount(ReglasContrasena, { props: { valor: 'Marlen' } });
    expect(wrapper.find('[data-test="regla-mayuscula"]').text()).toContain(
      '(cumplida)'
    );
    expect(wrapper.find('[data-test="regla-largo"]').text()).toContain(
      '(pendiente)'
    );
  });

  it('la marca va en oro profundo y el punto pendiente en piedra clara', () => {
    const fuente = leer('ReglasContrasena.vue');
    expect(cuerpoDe(fuente, '.reglas__marca')).toMatch(
      /color: var\(--m-oro-profundo\);/
    );
    expect(cuerpoDe(fuente, '.reglas__punto')).toMatch(
      /background: var\(--m-piedra-clara\);/
    );
  });
});

describe('AvisoAcceso (A7, A15)', () => {
  it('por defecto es un error: role="alert" y el texto de la ranura', () => {
    const aviso = mount(AvisoAcceso, {
      slots: { default: 'El correo o la contraseña no coinciden.' },
    }).find('[data-test="aviso-acceso"]');

    expect(aviso.attributes('role')).toBe('alert');
    expect(aviso.attributes('data-variante')).toBe('error');
    expect(aviso.text()).toBe('El correo o la contraseña no coinciden.');
  });

  it('la variante tranquila es un estado, no una alerta', () => {
    const aviso = mount(AvisoAcceso, {
      props: { variante: 'tranquilo' },
      slots: { default: 'Tu contraseña quedó cambiada. Entra con la nueva.' },
    }).find('[data-test="aviso-acceso"]');

    expect(aviso.attributes('role')).toBe('status');
    expect(aviso.attributes('data-variante')).toBe('tranquilo');
  });

  it('acepta un id para que un campo lo cite en aria-describedby', () => {
    expect(
      mount(AvisoAcceso, { props: { id: 'aviso-entrar' } })
        .find('[data-test="aviso-acceso"]')
        .attributes('id')
    ).toBe('aviso-entrar');
  });

  it('el error va en peligro; el tranquilo, con filete de oro', () => {
    const fuente = leer('AvisoAcceso.vue');
    expect(cuerpoDe(fuente, '.aviso-acceso--error')).toMatch(
      /border-color: var\(--m-peligro\);[\s\S]*color: var\(--m-peligro\);/
    );
    expect(cuerpoDe(fuente, '.aviso-acceso--tranquilo')).toMatch(
      /border-color: var\(--m-oro\);/
    );
    expect(cuerpoDe(fuente, '.aviso-acceso--tranquilo')).not.toMatch(
      /(^|\s)color: var\(--m-oro\);/
    );
  });
});

describe('SeparadorAcceso (A9)', () => {
  it('pinta su texto entre dos filetes decorativos', () => {
    const separador = mount(SeparadorAcceso, {
      props: { texto: 'o con tu correo' },
    }).find('[data-test="separador-google"]');

    expect(separador.text()).toBe('o con tu correo');
    expect(separador.findAll('[aria-hidden="true"]')).toHaveLength(2);
  });
});

describe('EstadoAcceso (A13, A14, A16)', () => {
  type Extra = {
    tono?: 'oro' | 'tinta' | 'peligro';
    titulo?: string;
    antetitulo?: string;
    ocupado?: boolean;
  };
  const montar = (props: Extra = {}) =>
    mount(EstadoAcceso, {
      props: { tono: 'oro', titulo: 'Revisa tu correo', ...props },
      slots: {
        icono: '<svg data-test="icono-de-prueba" />',
        default: '<p>Texto del estado.</p>',
        acciones: '<a data-test="accion-de-prueba">Volver a entrar</a>',
      },
      attachTo: document.body,
    });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('pinta título, texto, icono y acciones', () => {
    const wrapper = montar();

    expect(wrapper.find('h1').text()).toBe('Revisa tu correo');
    expect(wrapper.text()).toContain('Texto del estado.');
    expect(wrapper.find('[data-test="icono-de-prueba"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="accion-de-prueba"]').exists()).toBe(true);
  });

  it('el antetítulo solo sale si se da', () => {
    expect(montar().find('[data-test="estado-antetitulo"]').exists()).toBe(false);
    expect(
      montar({ antetitulo: 'Recuperar contraseña' })
        .find('[data-test="estado-antetitulo"]')
        .text()
    ).toBe('Recuperar contraseña');
  });

  it('el tono llega al marco (la pintura de cada tono se lee de la fuente, abajo)', () => {
    expect(
      montar({ tono: 'peligro' })
        .find('[data-test="estado-acceso"]')
        .attributes('data-tono')
    ).toBe('peligro');
    expect(
      montar({ tono: 'tinta' })
        .find('[data-test="estado-acceso"]')
        .attributes('data-tono')
    ).toBe('tinta');
  });

  it('ocupado se anuncia con aria-busy', () => {
    expect(
      montar({ ocupado: true }).find('[data-test="estado-acceso"]').attributes('aria-busy')
    ).toBe('true');
    expect(
      montar().find('[data-test="estado-acceso"]').attributes('aria-busy')
    ).toBeUndefined();
  });

  /**
   * El estado sustituye a un formulario: el botón que tenía el foco desaparece
   * y el foco caería en <body>. Se lleva al título.
   */
  it('al aparecer, el foco va a su título', () => {
    montar();
    expect(document.activeElement?.tagName).toBe('H1');
  });

  it('círculo de 76 px; tinta con icono en oro; peligro con filete de peligro', () => {
    const fuente = leer('EstadoAcceso.vue');
    expect(cuerpoDe(fuente, '.estado-acceso__circulo')).toMatch(
      /width: 76px;[\s\S]*height: 76px;/
    );
    expect(cuerpoDe(fuente, '.estado-acceso__circulo--tinta')).toMatch(
      /background: var\(--m-tinta\);[\s\S]*color: var\(--m-oro\);/
    );
    expect(cuerpoDe(fuente, '.estado-acceso__circulo--oro')).toMatch(
      /border: var\(--m-filete-grosor\) solid var\(--m-oro\);[\s\S]*color: var\(--m-oro-profundo\);/
    );
    expect(cuerpoDe(fuente, '.estado-acceso__circulo--peligro')).toMatch(
      /border: var\(--m-filete-grosor\) solid var\(--m-peligro\);/
    );
  });
});

describe('las cuatro piezas, sin hexadecimales', () => {
  it.each([
    'ReglasContrasena.vue',
    'AvisoAcceso.vue',
    'SeparadorAcceso.vue',
    'EstadoAcceso.vue',
  ])('%s', (archivo) => {
    expect(leer(archivo)).not.toMatch(/#[0-9a-fA-F]{3,8}(?![\w-])/);
  });
});
