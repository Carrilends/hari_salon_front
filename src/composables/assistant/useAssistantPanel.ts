import { ref } from 'vue';

/**
 * Estado compartido del panel del asistente. Vive en el módulo —no dentro de
 * un componente— porque lo abren dos sitios lejanos en el árbol: el botón
 * flotante de `AssistantLauncher` y la tarjeta del inicio.
 */
const abierto = ref(false);

/**
 * Pregunta con la que se abrió el panel, si se abrió desde un chip del inicio.
 * El panel la consume al montarse y la deja en null: abrir el panel a mano
 * más tarde no debe repetir una pregunta de hace un rato.
 */
const pendiente = ref<string | null>(null);

export const useAssistantPanel = () => ({
  abierto,
  abrir: () => {
    abierto.value = true;
  },
  /** Abre el panel llevándole la pregunta del chip que lo invocó. */
  abrirCon: (prompt: string) => {
    pendiente.value = prompt;
    abierto.value = true;
  },
  consumirPendiente: () => {
    const prompt = pendiente.value;
    pendiente.value = null;
    return prompt;
  },
  cerrar: () => {
    abierto.value = false;
  },
  alternar: () => {
    abierto.value = !abierto.value;
  },
});
