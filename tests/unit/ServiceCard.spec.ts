/**
 * La tarjeta de servicio: **la tarjeta es la foto**, y la información vive sobre
 * ella en un velo.
 *
 * Lo que más se vigila aquí es que la información no dependa del ratón (D5) y
 * que la rebaja se vea donde la clienta mira. Hasta hoy la tarjeta pintaba el
 * precio base y la bolsa cobraba el efectivo: dos cifras distintas para el mismo
 * servicio.
 */
import { mount } from '@vue/test-utils';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import ServiceCard from 'src/components/servicePage/ServiceCard.vue';
import { FOTO_CLOUDINARY, servicio } from './fixtures/servicios';

const FUENTE = readFileSync(
  join(__dirname, '../../src/components/servicePage/ServiceCard.vue'),
  'utf8'
);
const ESTILOS = FUENTE.slice(FUENTE.indexOf('<style'));

const montar = (props: Record<string, unknown> = {}, slots = {}) =>
  mount(ServiceCard, { props: { servicio: servicio(), ...props }, slots });

describe('ServiceCard', () => {
  it('el velo lleva categoría, nombre, precio y «Detalle»', () => {
    const tarjeta = montar();
    const velo = tarjeta.get('[data-test="velo"]');

    expect(velo.text()).toContain('Cortes de dama');
    expect(tarjeta.get('[data-test="nombre"]').text()).toBe('Bob clásico');
    expect(tarjeta.get('[data-test="precio"]').text()).toContain('$45.000');
    expect(velo.text()).toContain('Detalle');
  });

  /**
   * El caso normal del catálogo real: el sembrado no escribe `type`, así que la
   * categoría sale de la primera etiqueta (§8.1 de la hoja de ruta). Sin este
   * respaldo la tarjeta se quedaría casi siempre sin la versalita del lienzo.
   */
  it('sin «type» rotula con la primera etiqueta', () => {
    const tarjeta = montar({
      servicio: servicio({
        type: '',
        tags: [{ id: 't1', name: 'Fade/Degradado' }] as unknown as string[],
      }),
    });

    expect(tarjeta.get('[data-test="categoria"]').text()).toBe(
      'Fade/Degradado'
    );
  });

  /** Sin tipo y sin etiquetas no se inventa una categoría: la línea no se pinta. */
  it('sin categoría no deja una línea vacía en el velo', () => {
    const tarjeta = montar({ servicio: servicio({ type: '', tags: [] }) });

    expect(tarjeta.find('[data-test="categoria"]').exists()).toBe(false);
    expect(tarjeta.get('[data-test="nombre"]').text()).toBe('Bob clásico');
  });

  it('al pulsarla avisa con el id del servicio', async () => {
    const tarjeta = montar();

    await tarjeta.get('[data-test="tarjeta-enlace"]').trigger('click');

    expect(tarjeta.emitted('detalle')?.[0]).toEqual(['s1']);
  });

  /**
   * Un `div` con `@click` lo salta el tabulador. Y el nombre accesible tiene que
   * decir qué abre: el botón está estirado sobre la foto y no tiene texto propio.
   */
  it('lo que se pulsa es un botón de verdad, y dice qué abre', () => {
    const enlace = montar().get('[data-test="tarjeta-enlace"]');

    expect(enlace.element.tagName).toBe('BUTTON');
    expect(enlace.attributes('type')).toBe('button');
    expect(enlace.attributes('aria-label')).toContain('Bob clásico');
  });

  it('con mostrarSiempre el velo se queda fijo, sin que nadie pase el ratón', () => {
    const fija = montar({ mostrarSiempre: true });
    const suelta = montar();

    expect(fija.get('[data-test="velo"]').classes()).toContain(
      'tarjeta-servicio__velo--fijo'
    );
    expect(suelta.get('[data-test="velo"]').classes()).not.toContain(
      'tarjeta-servicio__velo--fijo'
    );
  });

  /** El CSS está mockeado: la regla que hace visible el velo se lee en la fuente. */
  it('el velo aparece al pasar el ratón, al enfocar con teclado y cuando es fijo', () => {
    expect(ESTILOS).toMatch(
      /\.tarjeta-servicio:hover \.tarjeta-servicio__velo,\s*\n\.tarjeta-servicio:focus-within \.tarjeta-servicio__velo,\s*\n\.tarjeta-servicio__velo--fijo \{\s*\n\s*opacity: 1;/
    );
  });

  /**
   * La página se prerenderiza con SSG: el primer pintado no trae `mostrarSiempre`
   * calculado. Sin esta red en CSS, en un móvil la lista se vería sin nombres
   * hasta que arranque el JavaScript.
   */
  it('en un puntero grueso el velo no depende del JavaScript', () => {
    expect(ESTILOS).toMatch(
      /@media \(hover: none\) \{[^}]*\.tarjeta-servicio__velo \{\s*\n\s*opacity: 1;/
    );
  });

  /**
   * La foto se ve ENTERA, centrada, y lo que sobra del marco se pinta en
   * carbón: es el equivalente cálido del fondo gris del diseño viejo. Recortar
   * (`cover`) le quitaba la cabeza a un retrato en una tarjeta apaisada.
   */
  it('la foto se ve entera, centrada, sobre carbón y sin recortar', () => {
    expect(ESTILOS).toMatch(
      /\.tarjeta-servicio__foto \{[^}]*object-fit: contain;[^}]*object-position: center;[^}]*background: var\(--m-carbon\);/
    );
    expect(ESTILOS).toMatch(
      /\.tarjeta-servicio \{[^}]*background: var\(--m-carbon\);/
    );
    expect(ESTILOS).not.toContain('object-fit: cover');
  });

  it('con promoción pinta la píldora, el precio efectivo y el base tachado', () => {
    const tarjeta = montar({
      servicio: servicio({ havePromotion: true, porcentageDiscount: 20 }),
    });

    expect(tarjeta.get('[data-test="promo-pildora"]').text()).toContain('20 %');
    expect(tarjeta.get('[data-test="precio"]').text()).toContain('$36.000');
    expect(tarjeta.get('[data-test="precio-base"]').text()).toBe(
      'antes $45.000'
    );
    // El tachado no se oye: «antes» lo dice al lector de pantalla y no se ve.
    expect(tarjeta.get('[data-test="precio-base"] .sr').text()).toBe('antes');
    expect(ESTILOS).toMatch(
      /\.tarjeta-servicio__precio-base \{[^}]*text-decoration: line-through/
    );
  });

  it('sin promoción pinta un solo precio y ninguna píldora', () => {
    const tarjeta = montar();

    expect(tarjeta.find('[data-test="promo-pildora"]').exists()).toBe(false);
    expect(tarjeta.find('[data-test="precio-base"]').exists()).toBe(false);
    expect(tarjeta.get('[data-test="precio"]').text()).toContain('$45.000');
  });

  /** La rebaja se ve en reposo: la píldora no vive dentro del velo. */
  it('la píldora de promoción se ve sin velo', () => {
    const tarjeta = montar({
      servicio: servicio({ havePromotion: true, porcentageDiscount: 20 }),
    });

    expect(
      tarjeta
        .get('[data-test="velo"]')
        .find('[data-test="promo-pildora"]')
        .exists()
    ).toBe(false);
  });

  it('pide la foto optimizada a Cloudinary, nunca la URL cruda', () => {
    const img = montar().get('img');

    // La tarjeta mide 282 px: 560 cubre las pantallas de 2×.
    expect(img.attributes('src')).toContain(
      '/upload/f_auto,q_auto,w_560,c_limit/'
    );
    expect(img.attributes('src')).not.toBe(FOTO_CLOUDINARY);
    expect(img.attributes('srcset')).toContain(' 560w');
  });

  it('la foto se aplaza y se describe', () => {
    const img = montar().get('img');

    expect(img.attributes('loading')).toBe('lazy');
    expect(img.attributes('decoding')).toBe('async');
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
    const tarjeta = montar({
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

    expect(tarjeta.get('img').attributes('src')).toContain('bob.jpg');
    expect(tarjeta.get('img').attributes('src')).not.toContain('otra.jpg');
  });

  it('sin foto no pide nada a Cloudinary: lo dice', () => {
    const tarjeta = montar({ servicio: servicio({ images: [] }) });

    expect(tarjeta.find('img').exists()).toBe(false);
    expect(tarjeta.get('[data-test="sin-foto"]').text()).toContain('Sin foto');
  });

  /**
   * Punto 2 del enfoque de revisión. Una foto borrada en Cloudinary responde 404
   * y el navegador pinta su icono de imagen rota dentro de la tarjeta.
   */
  it('una foto que no carga cae en «Sin foto», no deja el hueco roto', async () => {
    const tarjeta = montar();

    await tarjeta.get('img').trigger('error');

    expect(tarjeta.find('img').exists()).toBe(false);
    expect(tarjeta.find('[data-test="sin-foto"]').exists()).toBe(true);
  });

  /**
   * Punto 1 del enfoque de revisión. `price` es `numeric` en Postgres y TypeORM
   * lo devuelve como cadena: `'45000.00'`.
   */
  it('un precio que llega como texto se pinta igual', () => {
    const tarjeta = montar({
      servicio: servicio({ price: '45000.00' as unknown as number }),
    });

    expect(tarjeta.get('[data-test="precio"]').text()).toContain('$45.000');
    expect(tarjeta.text()).not.toContain('NaN');
  });

  /** Punto 3 del enfoque de revisión: una promoción sin porcentaje no es rebaja. */
  it('havePromotion sin porcentaje no es una promoción', () => {
    const tarjeta = montar({
      servicio: servicio({ havePromotion: true, porcentageDiscount: 0 }),
    });

    expect(tarjeta.find('[data-test="promo-pildora"]').exists()).toBe(false);
    expect(tarjeta.find('[data-test="precio-base"]').exists()).toBe(false);
    expect(tarjeta.get('[data-test="precio"]').text()).toContain('$45.000');
  });

  it('la ranura de acciones se pinta cuando el padre la rellena', () => {
    const tarjeta = montar(
      {},
      { acciones: '<button data-test="editar">Editar</button>' }
    );

    expect(tarjeta.find('[data-test="acciones"]').exists()).toBe(true);
    expect(tarjeta.find('[data-test="editar"]').exists()).toBe(true);
  });

  it('sin ranura no deja una caja de acciones vacía encima de la foto', () => {
    expect(montar().find('[data-test="acciones"]').exists()).toBe(false);
  });

  /** Un nombre de cuatro líneas no puede empujar el precio fuera de la tarjeta. */
  it('el nombre se corta a dos líneas', () => {
    expect(ESTILOS).toContain('-webkit-line-clamp: 2');
  });

  it('no pinta con hexadecimales sueltos', () => {
    expect(ESTILOS).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});
