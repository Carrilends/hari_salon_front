import { ref } from 'vue';

/**
 * Estado compartido del diálogo de reseña. Lo abre el botón del armazón y el
 * enlace «Deja la tuya» de la banda de reseñas del inicio.
 */
const abierto = ref(false);

/**
 * Quién puede dejar una reseña NO se decide aquí: sin sesión hay que mandar al
 * login, y con sesión hay que rellenar el nombre antes de abrir. Eso vive en el
 * armazón, que es donde están la sesión y el router; este módulo solo guarda su
 * política y la ofrece a quien la pida desde fuera.
 *
 * Abrir el diálogo sin pasar por aquí deja a una visitante anónima rellenando
 * un formulario cuyo envío no hace nada.
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
