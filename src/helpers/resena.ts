/**
 * Las reglas de la reseña (R1 de
 * `docs/superpowers/specs/2026-10-09-vistas-restantes-design.md`), puras para
 * probarlas sin montar nada.
 *
 * Los límites son los del DTO del backend
 * (`hair_salon_back/src/reviews/dto/create-review.dto.ts`): nombre 2–120,
 * descripción 5–1000, puntaje entero 1–5. El backend mide la cadena tal cual
 * llega; aquí se mide RECORTADA y se envía recortada, así que «    hola » no
 * cuela por cinco caracteres.
 */
import type { CreateReviewBody } from 'src/api/apiTypes';
import {
  estadoDeError,
  MENSAJE_SIN_CONEXION,
} from 'src/helpers/mensajes-acceso';

export const LIMITES_RESENA = {
  nombreMin: 2,
  nombreMax: 120,
  textoMin: 5,
  textoMax: 1000,
} as const;

export const MENSAJES_RESENA = {
  puntaje: 'Elige un puntaje de 1 a 5.',
  nombreCorto: 'Escribe tu nombre: al menos 2 letras.',
  nombreLargo: 'El nombre admite hasta 120 caracteres.',
  textoCorto: 'Escribe al menos 5 caracteres.',
  textoLargo: 'Tu experiencia admite hasta 1000 caracteres.',
  sesion: 'Tu sesión caducó. Entra de nuevo para enviar tu reseña.',
  duena: 'Esta cuenta no puede dejar reseñas.',
  respaldo: 'No pudimos enviar tu reseña. Inténtalo de nuevo en un momento.',
} as const;

// --- Quién -------------------------------------------------------------------

export type QuienResena = 'entrar' | 'clienta' | 'nadie';

export interface SesionResena {
  isLoggedIn: boolean;
  isAdmin: boolean;
  roles: readonly string[];
}

/**
 * La regla de siempre (antes vivía en `MainLayout.vue`): sin sesión hay que
 * entrar; la dueña no deja reseñas (el backend le responde 403); una cuenta
 * sin roles o solo con `user` es una clienta.
 */
export function quienPuedeResenar(sesion: SesionResena): QuienResena {
  if (!sesion.isLoggedIn) return 'entrar';
  if (sesion.isAdmin) return 'nadie';
  return sesion.roles.every((rol) => rol === 'user') ? 'clienta' : 'nadie';
}

export interface DependenciasPoliticaResena {
  /** Se llama al pedir, no al registrar: la sesión puede cambiar entre medias. */
  sesion: () => SesionResena;
  irAlLogin: () => void;
  abrir: () => void;
}

/**
 * La política que el armazón registra con `registrarSolicitud` (contrato §4.4
 * de la hoja de ruta de 2026-10-09) y que ejecuta `solicitar()`: sin sesión,
 * al login; una clienta, el diálogo (que se rellena solo al abrirse); la dueña
 * o cualquier otra cuenta, nada.
 */
export function politicaDeResena(deps: DependenciasPoliticaResena): () => void {
  return () => {
    const quien = quienPuedeResenar(deps.sesion());
    if (quien === 'entrar') deps.irAlLogin();
    else if (quien === 'clienta') deps.abrir();
  };
}

// --- Puntaje -----------------------------------------------------------------

export const ETIQUETAS_PUNTAJE: Readonly<Record<number, string>> = {
  1: 'Mala',
  2: 'Regular',
  3: 'Buena',
  4: 'Muy bien',
  5: 'Excelente',
};

/** «4 de 5 · Muy bien»; sin puntaje (o con uno imposible), la invitación. */
export function textoPuntaje(puntaje: number | null): string {
  if (puntaje === null || !ETIQUETAS_PUNTAJE[puntaje]) return 'Elige de 1 a 5';
  return `${puntaje} de 5 · ${ETIQUETAS_PUNTAJE[puntaje]}`;
}

// --- Validación --------------------------------------------------------------

export type CampoResena = 'puntaje' | 'nombre' | 'texto';

export interface CamposResena {
  nombre: string;
  texto: string;
  puntaje: number | null;
}

export type ErroresResena = Partial<Record<CampoResena, string>>;

/** El orden en que se ven en pantalla: el foco va al primero con error. */
export const ORDEN_CAMPOS_RESENA: readonly CampoResena[] = [
  'puntaje',
  'nombre',
  'texto',
];

export function validarResena(campos: CamposResena): ErroresResena {
  const errores: ErroresResena = {};
  const { puntaje } = campos;
  if (
    puntaje === null ||
    !Number.isInteger(puntaje) ||
    puntaje < 1 ||
    puntaje > 5
  ) {
    errores.puntaje = MENSAJES_RESENA.puntaje;
  }

  const nombre = campos.nombre.trim();
  if (nombre.length < LIMITES_RESENA.nombreMin) {
    errores.nombre = MENSAJES_RESENA.nombreCorto;
  } else if (nombre.length > LIMITES_RESENA.nombreMax) {
    errores.nombre = MENSAJES_RESENA.nombreLargo;
  }

  const texto = campos.texto.trim();
  if (texto.length < LIMITES_RESENA.textoMin) {
    errores.texto = MENSAJES_RESENA.textoCorto;
  } else if (texto.length > LIMITES_RESENA.textoMax) {
    errores.texto = MENSAJES_RESENA.textoLargo;
  }

  return errores;
}

export function primerError(errores: ErroresResena): CampoResena | null {
  return ORDEN_CAMPOS_RESENA.find((campo) => Boolean(errores[campo])) ?? null;
}

/** El cuerpo de `POST /reviews`. Solo se llama tras validar. */
export function cuerpoDeResena(campos: CamposResena): CreateReviewBody {
  if (campos.puntaje === null) {
    throw new Error('cuerpoDeResena: falta el puntaje');
  }
  return {
    name: campos.nombre.trim(),
    description: campos.texto.trim(),
    score: campos.puntaje,
  };
}

// --- Errores del envío -------------------------------------------------------

/**
 * La frase para el aviso en línea. Nunca el texto crudo del servidor (viene en
 * inglés desde class-validator). Sin respuesta y con `request` o
 * `ERR_NETWORK`: la red. 401: la sesión caducó y no se pudo renovar. 403: la
 * cuenta es de la dueña.
 */
export function mensajeErrorResena(err: unknown): string {
  const estado = estadoDeError(err);
  if (estado === undefined) {
    const error = err as { request?: unknown; code?: string } | null;
    const sinRespuesta =
      !!error &&
      typeof error === 'object' &&
      (error.request !== undefined || error.code === 'ERR_NETWORK');
    return sinRespuesta ? MENSAJE_SIN_CONEXION : MENSAJES_RESENA.respaldo;
  }
  if (estado === 401) return MENSAJES_RESENA.sesion;
  if (estado === 403) return MENSAJES_RESENA.duena;
  return MENSAJES_RESENA.respaldo;
}
