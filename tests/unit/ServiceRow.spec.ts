/**
 * El renglón de móvil (≤500 px): la ficha tumbada del lienzo. Mismo contenido
 * que la tarjeta, sin velo —en un teléfono no hay ratón que lo descubra— y con
 * la foto a 104 px, que es lo que de verdad se pinta.
 */
import { mount } from '@vue/test-utils';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import ServiceRow from 'src/components/servicePage/ServiceRow.vue';
import { FOTO_CLOUDINARY, servicio } from './fixtures/servicios';

const FUENTE = readFileSync(
  join(__dirname, '../../src/components/servicePage/ServiceRow.vue'),
  'utf8'
);
const ESTILOS = FUENTE.slice(FUENTE.indexOf('<style'));

const montar = (props: Record<string, unknown> = {}, slots = {}) =>
  mount(ServiceRow, { props: { servicio: servicio(), ...props }, slots });

describe('ServiceRow', () => {
  it('pinta categoría, nombre, precio y «Detalle»', () => {
    const fila = montar();

    expect(fila.get('[data-test="fila-categoria"]').text()).toBe(
      'Cortes de dama'
    );
    expect(fila.get('[data-test="fila-nombre"]').text()).toBe('Bob clásico');
    expect(fila.get('[data-test="fila-precio"]').text()).toContain('$45.000');
    expect(fila.text()).toContain('Detalle');
  });

  /**
   * Igual que la tarjeta: el sembrado no escribe `type`, así que el rótulo sale
   * de la primera etiqueta (§8.1 de la hoja de ruta). Las dos superficies tienen
   * que decir lo mismo del mismo servicio.
   */
  it('sin «type» rotula con la primera etiqueta, y sin ninguna no pinta la línea', () => {
    const conEtiqueta = montar({
      servicio: servicio({
        type: '',
        tags: [{ id: 't1', name: 'Fade/Degradado' }] as unknown as string[],
      }),
    });
    const sinNada = montar({ servicio: servicio({ type: '', tags: [] }) });

    expect(conEtiqueta.get('[data-test="fila-categoria"]').text()).toBe(
      'Fade/Degradado'
    );
    expect(sinNada.find('[data-test="fila-categoria"]').exists()).toBe(false);
  });

  it('al pulsarlo avisa con el id del servicio', async () => {
    const fila = montar();

    await fila.get('[data-test="fila-enlace"]').trigger('click');

    expect(fila.emitted('detalle')?.[0]).toEqual(['s1']);
  });

  it('lo que se pulsa es un botón de verdad, y dice qué abre', () => {
    const enlace = montar().get('[data-test="fila-enlace"]');

    expect(enlace.element.tagName).toBe('BUTTON');
    expect(enlace.attributes('aria-label')).toContain('Bob clásico');
  });

  it('pide a Cloudinary una foto de 208, que es el doble de los 104 que pinta', () => {
    const img = montar().get('img');

    expect(img.attributes('src')).toContain(
      '/upload/f_auto,q_auto,w_208,c_limit/'
    );
    expect(img.attributes('src')).not.toBe(FOTO_CLOUDINARY);
    expect(img.attributes('srcset')).toContain(' 208w');
    expect(img.attributes('loading')).toBe('lazy');
    expect(img.attributes('alt')).toContain('Bob clásico');
  });

  /**
   * El orden de los atributos no es cosmético (medido en WebKit para
   * `FotoResponsiva`): un `<img>` arranca la descarga en cuanto recibe `src`.
   * Con `loading="lazy"` detrás, la foto de una tarjeta fuera de pantalla ya
   * estaba bajando. `loading` y `decoding` primero, luego `srcset`/`sizes`, y
   * `src` el último.
   */
  it('pone loading, decoding, srcset y sizes antes del src', () => {
    const html = montar().get('img').html();
    const src = html.search(/\ssrc="/);

    expect(src).toBeGreaterThan(-1);
    for (const atributo of ['loading=', 'decoding=', 'srcset=', 'sizes=']) {
      const donde = html.indexOf(atributo);

      expect({ atributo, antes: donde > -1 && donde < src }).toEqual({
        atributo,
        antes: true,
      });
    }
  });

  /** Misma regla que la bolsa y el WhatsApp: la principal, no la primera. */
  it('pinta la foto principal aunque no sea la primera', () => {
    const otra = FOTO_CLOUDINARY.replace('bob.jpg', 'otra.jpg');
    const fila = montar({
      servicio: servicio({
        images: [
          {
            id: 'i0',
            url: otra,
            isPrincipal: false,
            publicId: 'm/o',
            version: '1',
          },
          {
            id: 'i1',
            url: FOTO_CLOUDINARY,
            isPrincipal: true,
            publicId: 'm/b',
            version: '1',
          },
        ],
      }),
    });

    expect(fila.get('img').attributes('src')).toContain('bob.jpg');
    expect(fila.get('img').attributes('src')).not.toContain('otra.jpg');
  });

  it('con promoción pinta el precio efectivo y el base tachado', () => {
    const fila = montar({
      servicio: servicio({ havePromotion: true, porcentageDiscount: 20 }),
    });

    expect(fila.get('[data-test="fila-precio"]').text()).toContain('$36.000');
    expect(fila.get('[data-test="fila-precio-base"]').text()).toBe(
      'antes $45.000'
    );
    expect(fila.get('[data-test="fila-precio-base"] .sr').text()).toBe('antes');
  });

  it('sin promoción pinta un solo precio', () => {
    expect(montar().find('[data-test="fila-precio-base"]').exists()).toBe(
      false
    );
  });

  it('sin foto no pide nada a Cloudinary: lo dice', () => {
    const fila = montar({ servicio: servicio({ images: [] }) });

    expect(fila.find('img').exists()).toBe(false);
    expect(fila.get('[data-test="fila-sin-foto"]').text()).toContain(
      'Sin foto'
    );
  });

  /** Punto 2 del enfoque de revisión. */
  it('una foto que no carga cae en «Sin foto»', async () => {
    const fila = montar();

    await fila.get('img').trigger('error');

    expect(fila.find('img').exists()).toBe(false);
    expect(fila.find('[data-test="fila-sin-foto"]').exists()).toBe(true);
  });

  /** Punto 1 del enfoque de revisión: `numeric` de Postgres llega como cadena. */
  it('un precio que llega como texto se pinta igual', () => {
    const fila = montar({
      servicio: servicio({ price: '38000.00' as unknown as number }),
    });

    expect(fila.get('[data-test="fila-precio"]').text()).toContain('$38.000');
    expect(fila.text()).not.toContain('NaN');
  });

  it('la ranura de acciones se pinta cuando el padre la rellena', () => {
    const fila = montar(
      {},
      { acciones: '<button data-test="editar">Editar</button>' }
    );

    expect(fila.find('[data-test="acciones"]').exists()).toBe(true);
    expect(fila.find('[data-test="editar"]').exists()).toBe(true);
  });

  it('sin ranura no deja una columna de acciones vacía', () => {
    expect(montar().find('[data-test="acciones"]').exists()).toBe(false);
  });

  it('no pinta con hexadecimales sueltos', () => {
    expect(ESTILOS).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  /**
   * Con las acciones de la dueña apiladas (3 × 44 px) el renglón crece por
   * encima de 104 px, y la foto tiene que estirarse con él. Pero la foto NO
   * puede decidir el alto del renglón: Cloudinary (`c_limit`) conserva la
   * proporción, y un `<img>` con alto `auto` en la fila flexible aporta su alto
   * natural — un retrato de 2:3 dejaba el renglón en 158 px para todo el mundo,
   * y los renglones crecían a medida que cargaban las fotos. Por eso la foto va
   * en un marco de 104 px que se estira (y nunca baja de 104), y la imagen se
   * posiciona en absoluto dentro: no aporta alto a nadie.
   */
  it('la foto va en un marco que se estira, y la imagen no aporta alto al renglón', () => {
    const fila = montar();
    const marco = fila.get('[data-test="fila-marco"]');

    expect(marco.find('img').exists()).toBe(true);
    expect(ESTILOS).toMatch(
      /\.fila-servicio__marco \{[^}]*position:\s*relative;[^}]*align-self:\s*stretch;[^}]*width:\s*104px;[^}]*min-height:\s*104px;/
    );
    expect(ESTILOS).toMatch(
      /\.fila-servicio__foto \{[^}]*position:\s*absolute;[^}]*top:\s*0;[^}]*right:\s*0;[^}]*bottom:\s*0;[^}]*left:\s*0;[^}]*width:\s*100%;[^}]*height:\s*100%;[^}]*object-fit:\s*contain;[^}]*object-position:\s*center;/
    );
    // La foto entera, no recortada: lo que sobra del marco se ve carbón.
    expect(ESTILOS).toMatch(
      /\.fila-servicio__marco \{[^}]*background:\s*var\(--m-carbon\);/
    );
    expect(ESTILOS).not.toMatch(/object-fit:\s*cover/);
    expect(ESTILOS).not.toMatch(/\.fila-servicio__foto \{[^}]*[\s;]height:\s*auto;/);
  });

  it('el «Sin foto» vive en el mismo marco', () => {
    const fila = montar({ servicio: servicio({ images: [] }) });

    expect(
      fila.get('[data-test="fila-marco"]').find('[data-test="fila-sin-foto"]').exists()
    ).toBe(true);
  });
});
