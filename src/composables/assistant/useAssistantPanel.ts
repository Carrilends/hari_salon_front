import { ref } from 'vue';

/**
 * Estado compartido del panel del asistente. Vive en el módulo —no dentro de
 * un componente— porque lo abren dos sitios lejanos en el árbol: el botón
 * flotante de `AssistantLauncher` y la tarjeta del inicio.
 */
const abierto = ref(false);

export const useAssistantPanel = () => ({
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
