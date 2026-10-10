import { computed, reactive, ref } from 'vue';
import { useQueryClient } from '@tanstack/vue-query';
import { crearResena } from 'src/api/reviews-api';
import { queryKeys } from 'src/api/query-keys';
import {
  cuerpoDeResena,
  mensajeErrorResena,
  primerError,
  validarResena,
  type CampoResena,
  type CamposResena,
  type ErroresResena,
} from 'src/helpers/resena';

export type EstadoEnvioResena = 'editando' | 'enviando' | 'enviada';

/**
 * El estado del formulario de reseña (R1). Lo usa `ResenaDialog`, que vive
 * montado en el armazón: el borrador sobrevive a cerrar el diálogo.
 *
 * - **Borrador:** cerrar sin enviar (la X, Escape o un toque en el velo de la
 *   hoja) no borra nada. Se vacía tras una reseña enviada o si abre otra
 *   cuenta: el borrador de una clienta no lo ve la siguiente en el mismo
 *   navegador.
 * - **Errores:** ninguno hasta el primer intento; desde ahí, en vivo.
 * - **Envío único:** mientras hay uno en vuelo, `enviar()` no hace nada.
 * - **Fallo:** vuelve a «editando» con el aviso; lo escrito sigue ahí.
 */
export function useFormularioResena() {
  const queryClient = useQueryClient();

  const campos = reactive<CamposResena>({ nombre: '', texto: '', puntaje: null });
  const intentado = ref(false);
  const estado = ref<EstadoEnvioResena>('editando');
  const errorEnvio = ref('');
  let duenaDelBorrador: string | null = null;

  const errores = computed<ErroresResena>(() =>
    intentado.value ? validarResena(campos) : {}
  );

  function vaciar(nombre: string): void {
    campos.nombre = nombre.trim();
    campos.texto = '';
    campos.puntaje = null;
    intentado.value = false;
    estado.value = 'editando';
    errorEnvio.value = '';
  }

  /** Al abrir el diálogo, con la cuenta que lo abre. */
  function preparar(cuenta: { nombre: string; correo: string }): void {
    if (estado.value === 'enviada' || duenaDelBorrador !== cuenta.correo) {
      vaciar(cuenta.nombre);
      duenaDelBorrador = cuenta.correo;
      return;
    }
    errorEnvio.value = '';
  }

  /** Devuelve el primer campo con error (para enfocarlo) o `null`. */
  async function enviar(): Promise<CampoResena | null> {
    if (estado.value !== 'editando') return null;
    intentado.value = true;
    const campo = primerError(validarResena(campos));
    if (campo) return campo;

    estado.value = 'enviando';
    errorEnvio.value = '';
    try {
      await crearResena(cuerpoDeResena(campos));
      estado.value = 'enviada';
      void queryClient.invalidateQueries({ queryKey: queryKeys.reviews.all });
    } catch (err) {
      estado.value = 'editando';
      errorEnvio.value = mensajeErrorResena(err);
    }
    return null;
  }

  return { campos, errores, estado, errorEnvio, preparar, enviar };
}
