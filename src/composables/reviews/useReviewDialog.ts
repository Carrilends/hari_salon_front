import { ref } from 'vue';

/**
 * Estado compartido del diálogo de reseña. Lo monta `ResenaDialog` (dentro de
 * `MainLayout`) y lo piden «Deja la tuya →» del inicio, «Deja tu reseña →» de
 * Testimonios y el de una cita cumplida en Mis reservas.
 *
 * Quién puede dejar una reseña NO se decide aquí. Se pide con `solicitar()`,
 * que ejecuta la política que registra el armazón (`politicaDeResena`: sin
 * sesión → al login con `redirect`; una clienta → abrir; la dueña → nada).
 * `abrir()` solo pone `abierto = true`; aun así `ResenaDialog` no se deja
 * abrir por quien no puede (contrato §4.4 de
 * `docs/superpowers/plans/2026-10-09-vistas-hoja-de-ruta.md`).
 */
const abierto = ref(false);

/**
 * La política que atiende `solicitar()`. La registra `MainLayout`, donde viven
 * la sesión y el router. Sin nadie registrado, pedir la reseña no abre nada.
 */
let politica: (() => void) | null = null;

export const useReviewDialog = () => ({
  abierto,
  registrarSolicitud: (fn: (() => void) | null) => {
    politica = fn;
  },
  solicitar: () => {
    politica?.();
  },
  abrir: () => {
    abierto.value = true;
  },
  cerrar: () => {
    abierto.value = false;
  },
  alternar: () => {
    abierto.value = !abierto.value;
  },
});
