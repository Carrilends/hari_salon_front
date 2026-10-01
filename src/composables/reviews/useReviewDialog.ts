import { ref } from 'vue';

/**
 * Estado compartido del diálogo de reseña. Lo abre el botón del armazón y el
 * enlace «Deja la tuya» de la banda de reseñas del inicio.
 */
const abierto = ref(false);

export const useReviewDialog = () => ({
  abierto,
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
