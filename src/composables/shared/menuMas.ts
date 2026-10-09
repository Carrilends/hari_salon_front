import type { RouteLocationRaw } from 'vue-router';
import { redireccionSegura } from 'src/helpers/redireccion-segura';

/**
 * El modelo del menú «Más» de la cabecera (M2 de
 * `docs/superpowers/specs/2026-10-07-menu-y-acceso-design.md`).
 *
 * Una función pura decide qué secciones y entradas ve cada quien. El armazón
 * (`MainLayout.vue`) le pasa el estado de sesión y la ruta actual; la pintura
 * (`MenuMasContenido.vue`) solo dibuja lo que le llega. Así la regla de
 * visibilidad —«El salón» solo para la dueña— se escribe una vez y se prueba
 * sin montar nada.
 */

export type AccionMenu = 'quienes-somos' | 'horarios' | 'cerrar-sesion';

export type EntradaMenu = {
  /** kebab y en español: forma el `data-test="menu-entrada-<id>"`. */
  id: string;
  rotulo: string;
  /** Nombre de un trazo de `StrokeIcon`. */
  icono: string;
  /** Si hay destino, la entrada es un `<router-link>`… */
  destino?: RouteLocationRaw;
  /** …y si hay acción, un `<button>` que resuelve el armazón. */
  accion?: AccionMenu;
  /** Pinta «Hoy · …» a la derecha del rótulo. */
  detalle?: 'horario-hoy';
};

export type SeccionMenu = {
  id: 'cuenta' | 'salon' | 'peluqueria' | 'pie';
  titulo?: string;
  entradas: EntradaMenu[];
};

export function seccionesDelMenu(estado: {
  isLoggedIn: boolean;
  isAdmin: boolean;
  redirect: string;
}): SeccionMenu[] {
  // Solo rutas internas (§7.7): el saneador común del login y el registro.
  const redirect = redireccionSegura(estado.redirect);
  const secciones: SeccionMenu[] = [];

  if (estado.isLoggedIn) {
    secciones.push({
      id: 'cuenta',
      titulo: 'Tu cuenta',
      entradas: [
        {
          id: 'mis-reservas',
          rotulo: 'Mis reservas',
          icono: 'reservas',
          destino: '/mis-reservas',
        },
        {
          id: 'mi-cuenta',
          rotulo: 'Mi cuenta',
          icono: 'cuenta',
          destino: '/mi-cuenta',
        },
      ],
    });
  } else {
    secciones.push({
      id: 'cuenta',
      titulo: 'Tu cuenta',
      entradas: [
        {
          id: 'iniciar-sesion',
          rotulo: 'Iniciar sesión',
          icono: 'entrar',
          destino: { name: 'login', query: { redirect } },
        },
        {
          id: 'crear-cuenta',
          rotulo: 'Crear cuenta',
          icono: 'cuenta',
          destino: { name: 'register', query: { redirect } },
        },
      ],
    });
  }

  // `isLoggedIn` además de `isAdmin`: los roles se persisten y el token no, así
  // que una sesión caducada puede dejar `roles: ['admin']` en el almacén.
  if (estado.isLoggedIn && estado.isAdmin) {
    secciones.push({
      id: 'salon',
      titulo: 'El salón',
      entradas: [
        {
          id: 'reservas',
          rotulo: 'Reservas',
          icono: 'agenda',
          destino: '/reservas',
        },
        {
          id: 'mis-estilistas',
          rotulo: 'Mis estilistas',
          icono: 'estilistas',
          destino: '/mis-empleados',
        },
      ],
    });
  }

  secciones.push({
    id: 'peluqueria',
    titulo: 'La peluquería',
    entradas: [
      {
        id: 'testimonios',
        rotulo: 'Testimonios',
        icono: 'testimonios',
        destino: '/testimonios',
      },
      {
        id: 'quienes-somos',
        rotulo: '¿Quiénes somos?',
        icono: 'equipo',
        accion: 'quienes-somos',
      },
      {
        id: 'horarios',
        rotulo: 'Horarios',
        icono: 'horario',
        accion: 'horarios',
        detalle: 'horario-hoy',
      },
      {
        id: 'preguntas-frecuentes',
        rotulo: 'Preguntas frecuentes',
        icono: 'ayuda',
        destino: '/preguntas-frecuentes',
      },
    ],
  });

  secciones.push({
    id: 'pie',
    entradas: estado.isLoggedIn
      ? [
          {
            id: 'politica-datos',
            rotulo: 'Política de datos',
            icono: 'privacidad',
            destino: { name: 'privacy-policy' },
          },
          {
            id: 'cerrar-sesion',
            rotulo: 'Cerrar sesión',
            icono: 'salir',
            accion: 'cerrar-sesion',
          },
        ]
      : [
          {
            id: 'politica-datos',
            rotulo: 'Política de tratamiento de datos',
            icono: 'privacidad',
            destino: { name: 'privacy-policy' },
          },
        ],
  });

  return secciones;
}

/**
 * Partículas que no dan inicial: «Clienta de ejemplo» es «CE», no «CD». Solo
 * en minúscula: «Ana De Armas» escribe «De» como apellido y sí cuenta.
 */
const PARTICULAS = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'e']);

/**
 * Las iniciales del avatar (M10): la primera letra de las dos primeras palabras
 * ÚTILES del nombre (sin las partículas de arriba); con una sola palabra útil,
 * su inicial; sin nombre —o con un nombre hecho solo de partículas—, la
 * primera del correo; sin ninguno, cadena vacía y el avatar pinta el icono
 * `cuenta`. `fullname` puede venir vacío: se persiste, y hay perfiles de antes
 * de que se pidiera.
 */
export function inicialesDe(nombre: string, correo: string): string {
  const utiles = (nombre ?? '')
    .trim()
    .split(/\s+/)
    .filter((palabra) => palabra.length > 0 && !PARTICULAS.has(palabra));
  if (utiles.length > 0) {
    return utiles
      .slice(0, 2)
      .map((palabra) => palabra.charAt(0))
      .join('')
      .toLocaleUpperCase('es-CO');
  }
  return (correo ?? '').trim().charAt(0).toLocaleUpperCase('es-CO');
}
