/**
 * El modelo del menú «Más» (M2, M3, M4, M10): qué ve cada quien, en qué
 * orden, y a dónde lleva cada entrada. Es una función pura a propósito: la
 * regla de visibilidad se escribe UNA vez y se prueba sin montar el armazón.
 *
 * Aquí vive ahora la guarda que antes leía `MainLayout.vue` buscando
 * «Mis estilistas» junto a `authStore.isAdmin`: la entrada de estilistas, y la
 * de la agenda, solo para la dueña (spec §7.6).
 */
import {
  inicialesDe,
  seccionesDelMenu,
  type EntradaMenu,
  type SeccionMenu,
} from 'src/composables/shared/menuMas';

type Estado = { isLoggedIn: boolean; isAdmin: boolean };

const SIN_SESION: Estado = { isLoggedIn: false, isAdmin: false };
const CLIENTA: Estado = { isLoggedIn: true, isAdmin: false };
const DUENA: Estado = { isLoggedIn: true, isAdmin: true };

const ESTADOS: Array<[string, Estado]> = [
  ['sin sesión', SIN_SESION],
  ['clienta', CLIENTA],
  ['dueña', DUENA],
];

const menu = (estado: Estado, redirect = '/testimonios') =>
  seccionesDelMenu({ ...estado, redirect });

const seccion = (secciones: SeccionMenu[], id: SeccionMenu['id']) => {
  const encontrada = secciones.find((s) => s.id === id);
  if (!encontrada) throw new Error(`no hay sección ${id}`);
  return encontrada;
};

const entradas = (secciones: SeccionMenu[]): EntradaMenu[] =>
  secciones.reduce<EntradaMenu[]>((acc, s) => acc.concat(s.entradas), []);

const idsDe = (lista: EntradaMenu[]) => lista.map((e) => e.id);

const entrada = (secciones: SeccionMenu[], id: string) => {
  const encontrada = entradas(secciones).find((e) => e.id === id);
  if (!encontrada) throw new Error(`no hay entrada ${id}`);
  return encontrada;
};

describe('seccionesDelMenu · el orden y las secciones (M3)', () => {
  it('sin sesión: Tu cuenta, La peluquería y el pie', () => {
    expect(menu(SIN_SESION).map((s) => s.id)).toEqual(['cuenta', 'peluqueria', 'pie']);
  });

  it('la clienta ve las mismas tres secciones', () => {
    expect(menu(CLIENTA).map((s) => s.id)).toEqual(['cuenta', 'peluqueria', 'pie']);
  });

  it('la dueña ve además «El salón», justo después de su cuenta', () => {
    expect(menu(DUENA).map((s) => s.id)).toEqual(['cuenta', 'salon', 'peluqueria', 'pie']);
  });

  it('los títulos son los del tablero, y el pie no lleva', () => {
    const secciones = menu(DUENA);

    expect(seccion(secciones, 'cuenta').titulo).toBe('Tu cuenta');
    expect(seccion(secciones, 'salon').titulo).toBe('El salón');
    expect(seccion(secciones, 'peluqueria').titulo).toBe('La peluquería');
    expect(seccion(secciones, 'pie').titulo).toBeUndefined();
  });

  it.each(ESTADOS)('%s: ninguna sección sale vacía', (_nombre, estado) => {
    for (const s of menu(estado)) {
      expect(s.entradas.length).toBeGreaterThan(0);
    }
  });
});

describe('seccionesDelMenu · Tu cuenta', () => {
  it('sin sesión ofrece «Iniciar sesión» y «Crear cuenta», en ese orden', () => {
    const cuenta = seccion(menu(SIN_SESION), 'cuenta');

    expect(idsDe(cuenta.entradas)).toEqual(['iniciar-sesion', 'crear-cuenta']);
    expect(cuenta.entradas.map((e) => e.rotulo)).toEqual(['Iniciar sesión', 'Crear cuenta']);
  });

  it('«Iniciar sesión» lleva al login con el regreso a la página actual', () => {
    expect(entrada(menu(SIN_SESION), 'iniciar-sesion').destino).toEqual({
      name: 'login',
      query: { redirect: '/testimonios' },
    });
  });

  /** M4: hoy registrarse exige pasar por el login. */
  it('«Crear cuenta» va al registro con el MISMO regreso que «Iniciar sesión»', () => {
    const secciones = menu(SIN_SESION, '/services?genero=g1');

    expect(entrada(secciones, 'crear-cuenta').destino).toEqual({
      name: 'register',
      query: { redirect: '/services?genero=g1' },
    });
    expect(entrada(secciones, 'iniciar-sesion').destino).toEqual({
      name: 'login',
      query: { redirect: '/services?genero=g1' },
    });
  });

  it('con sesión: «Mis reservas» y «Mi cuenta», sin las entradas de acceso', () => {
    const secciones = menu(CLIENTA);

    expect(idsDe(seccion(secciones, 'cuenta').entradas)).toEqual(['mis-reservas', 'mi-cuenta']);
    expect(idsDe(entradas(secciones))).not.toContain('iniciar-sesion');
    expect(idsDe(entradas(secciones))).not.toContain('crear-cuenta');
    expect(entrada(secciones, 'mis-reservas').destino).toBe('/mis-reservas');
    expect(entrada(secciones, 'mi-cuenta').destino).toBe('/mi-cuenta');
  });

  /** §6.3: «Mis reservas» también para la dueña, como hoy. */
  it('la dueña conserva «Mis reservas»', () => {
    expect(idsDe(seccion(menu(DUENA), 'cuenta').entradas)).toEqual(['mis-reservas', 'mi-cuenta']);
  });
});

/**
 * §7.7: solo rutas internas. Un `redirect` que no empieza por `/` o empieza por
 * `//` es una redirección abierta: se sustituye por `/services`. `/\` y
 * `/<tab>/` también, porque los navegadores los normalizan a `//`; y `/auth…`,
 * que tras entrar devolvería al acceso (bucle).
 */
describe('seccionesDelMenu · el regreso saneado', () => {
  it.each([
    ['https://malo.example/robar', '/services'],
    ['//malo.example/robar', '/services'],
    ['/\\malo.example', '/services'],
    ['/\t/malo.example', '/services'],
    ['javascript:alert(1)', '/services'],
    ['/auth/login', '/services'],
    ['/auth?redirect=/x', '/services'],
    ['services', '/services'],
    ['', '/services'],
    ['/autorizado', '/autorizado'],
    ['/preguntas-frecuentes', '/preguntas-frecuentes'],
    ['/services?genero=g1#lista', '/services?genero=g1#lista'],
  ])('«%s» → «%s»', (pedido, esperado) => {
    const secciones = menu(SIN_SESION, pedido);

    expect(entrada(secciones, 'iniciar-sesion').destino).toEqual({
      name: 'login',
      query: { redirect: esperado },
    });
    expect(entrada(secciones, 'crear-cuenta').destino).toEqual({
      name: 'register',
      query: { redirect: esperado },
    });
  });
});

describe('seccionesDelMenu · El salón, solo para la dueña (§7.6)', () => {
  it('la dueña ve «Reservas» y «Mis estilistas», en ese orden', () => {
    const salon = seccion(menu(DUENA), 'salon');

    expect(idsDe(salon.entradas)).toEqual(['reservas', 'mis-estilistas']);
    expect(entrada(menu(DUENA), 'reservas').destino).toBe('/reservas');
    expect(entrada(menu(DUENA), 'mis-estilistas').destino).toBe('/mis-empleados');
  });

  it.each([
    ['sin sesión', SIN_SESION],
    ['clienta', CLIENTA],
  ] as Array<[string, Estado]>)('%s no ve ni estilistas ni la agenda', (_n, estado) => {
    const ids = idsDe(entradas(menu(estado)));

    expect(ids).not.toContain('mis-estilistas');
    expect(ids).not.toContain('reservas');
    expect(menu(estado).map((s) => s.id)).not.toContain('salon');
  });

  /**
   * Los roles se persisten y el token no (S7): con la sesión caducada puede
   * quedar `roles: ['admin']` en el almacén. Sin sesión no hay «El salón».
   */
  it('roles de dueña sin sesión viva no abren «El salón»', () => {
    expect(menu({ isLoggedIn: false, isAdmin: true }).map((s) => s.id)).toEqual([
      'cuenta',
      'peluqueria',
      'pie',
    ]);
  });
});

describe('seccionesDelMenu · La peluquería', () => {
  it.each(ESTADOS)('%s: Testimonios, ¿Quiénes somos?, Horarios y Preguntas frecuentes', (_n, estado) => {
    const peluqueria = seccion(menu(estado), 'peluqueria');

    expect(idsDe(peluqueria.entradas)).toEqual([
      'testimonios',
      'quienes-somos',
      'horarios',
      'preguntas-frecuentes',
    ]);
    expect(peluqueria.entradas.map((e) => e.rotulo)).toEqual([
      'Testimonios',
      '¿Quiénes somos?',
      'Horarios',
      'Preguntas frecuentes',
    ]);
  });

  it('«¿Quiénes somos?» y «Horarios» son acciones; Horarios pinta la línea de hoy', () => {
    const secciones = menu(SIN_SESION);

    expect(entrada(secciones, 'quienes-somos').accion).toBe('quienes-somos');
    expect(entrada(secciones, 'horarios').accion).toBe('horarios');
    expect(entrada(secciones, 'horarios').detalle).toBe('horario-hoy');
    expect(entrada(secciones, 'testimonios').destino).toBe('/testimonios');
    expect(entrada(secciones, 'preguntas-frecuentes').destino).toBe('/preguntas-frecuentes');
  });
});

describe('seccionesDelMenu · el pie', () => {
  it('sin sesión: «Política de tratamiento de datos», sola', () => {
    const pie = seccion(menu(SIN_SESION), 'pie');

    expect(idsDe(pie.entradas)).toEqual(['politica-datos']);
    expect(pie.entradas[0].rotulo).toBe('Política de tratamiento de datos');
    expect(pie.entradas[0].destino).toEqual({ name: 'privacy-policy' });
  });

  it('con sesión: «Política de datos» y «Cerrar sesión»', () => {
    const pie = seccion(menu(CLIENTA), 'pie');

    expect(idsDe(pie.entradas)).toEqual(['politica-datos', 'cerrar-sesion']);
    expect(pie.entradas.map((e) => e.rotulo)).toEqual(['Política de datos', 'Cerrar sesión']);
    expect(pie.entradas[1].accion).toBe('cerrar-sesion');
  });
});

describe('seccionesDelMenu · invariantes', () => {
  it.each(ESTADOS)('%s: cada entrada lleva destino o acción, nunca las dos ni ninguna', (_n, estado) => {
    for (const e of entradas(menu(estado))) {
      expect(Boolean(e.destino) !== Boolean(e.accion)).toBe(true);
    }
  });

  /** El `data-test` de cada fila es `menu-entrada-<id>`: dos iguales chocarían. */
  it.each(ESTADOS)('%s: no hay dos entradas con el mismo id', (_n, estado) => {
    const ids = idsDe(entradas(menu(estado)));

    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(ESTADOS)('%s: los rótulos van en caja normal, no en mayúsculas (M5)', (_n, estado) => {
    for (const e of entradas(menu(estado))) {
      expect(e.rotulo).not.toBe(e.rotulo.toUpperCase());
    }
  });
});

describe('inicialesDe (M10)', () => {
  it('las primeras letras de las dos primeras palabras del nombre', () => {
    expect(inicialesDe('Ana María López', 'ana@correo.com')).toBe('AM');
  });

  /** M10 (revisión del 2026-10-07): «de», «del», «la», «las», «los», «y», «e» no cuentan. */
  it('se salta las partículas en minúscula', () => {
    expect(inicialesDe('Clienta de ejemplo', '')).toBe('CE');
    expect(inicialesDe('María de los Ángeles', '')).toBe('MÁ');
    expect(inicialesDe('Luz del Carmen Ruiz', '')).toBe('LC');
    expect(inicialesDe('Ana y Luz', '')).toBe('AL');
  });

  it('una partícula escrita con mayúscula sí cuenta como palabra', () => {
    expect(inicialesDe('Ana De Armas', '')).toBe('AD');
  });

  it('con una sola palabra útil, una sola letra', () => {
    expect(inicialesDe('Marlene de', '')).toBe('M');
  });

  it('un nombre hecho solo de partículas cuenta como «sin nombre»', () => {
    expect(inicialesDe('de la', 'luz@correo.com')).toBe('L');
  });

  it('pone mayúsculas, también a las tildes', () => {
    expect(inicialesDe('álvaro ruiz', '')).toBe('ÁR');
  });

  it('ignora los espacios de sobra', () => {
    expect(inicialesDe('   luz    dary   ', '')).toBe('LD');
  });

  it('con una sola palabra, una sola letra', () => {
    expect(inicialesDe('Marlene', 'marlene@correo.com')).toBe('M');
  });

  it('sin nombre, la primera letra del correo', () => {
    expect(inicialesDe('', 'clienta@correo.com')).toBe('C');
    expect(inicialesDe('   ', 'clienta@correo.com')).toBe('C');
  });

  it('sin nombre ni correo, cadena vacía (el avatar pinta el icono)', () => {
    expect(inicialesDe('', '')).toBe('');
  });
});
