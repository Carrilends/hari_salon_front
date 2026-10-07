import { useQuasar } from 'quasar';

/**
 * Los avisos flotantes del portal, con la paleta de la remodelación.
 *
 * `$q.notify` sale de fábrica en el verde y el rojo de Quasar, que no están en
 * tinta/hueso/oro, y su `color` no acepta CSS: lo convierte en la clase
 * `bg-<color>`. Encima el aviso se teletransporta al `body`, donde ninguna
 * regla `scoped` llega. De ahí la decisión: la pintura viaja en `attrs.style`,
 * que Quasar reparte sobre el nodo del aviso, y vive en esta constante en vez
 * de en una hoja de estilo.
 */
export type TonoAviso = 'logro' | 'fallo' | 'atencion';

export const ESTILO_AVISO: Record<TonoAviso, string> = {
  logro: [
    'background: var(--m-tinta)',
    'color: var(--m-hueso)',
    'border: var(--m-filete-grosor) solid var(--m-oro)',
  ].join('; '),
  /**
   * `--m-peligro` queda reservado al botón que borra: un fallo usa la misma
   * tinta por su nombre de paleta, `--m-rosa-profundo`, con hueso encima
   * (6,4:1).
   */
  fallo: [
    'background: var(--m-rosa-profundo)',
    'color: var(--m-hueso)',
    'border: var(--m-filete-grosor) solid var(--m-hueso)',
  ].join('; '),
  atencion: [
    'background: var(--m-aviso-fondo)',
    'color: var(--m-tinta)',
    'border: var(--m-filete-grosor) solid var(--m-filete)',
  ].join('; '),
};

/** Arriba: es donde ya salían los avisos de promoción de la página. */
export const POSICION_AVISO = 'top' as const;

const COMUN = [
  'font-family: var(--m-font-sans)',
  'border-radius: var(--m-radio-tarjeta)',
  'box-shadow: none',
].join('; ');

/** Un fallo se lee más despacio que un «hecho». */
const DURACION: Record<TonoAviso, number> = {
  logro: 3200,
  atencion: 4000,
  fallo: 5000,
};

export function useAviso() {
  const $q = useQuasar();

  const avisar = (tono: TonoAviso, mensaje: string) => {
    $q.notify({
      message: mensaje,
      position: POSICION_AVISO,
      timeout: DURACION[tono],
      attrs: {
        style: `${ESTILO_AVISO[tono]}; ${COMUN}`,
        'data-tono': tono,
      },
    });
  };

  return {
    logro: (mensaje: string) => avisar('logro', mensaje),
    fallo: (mensaje: string) => avisar('fallo', mensaje),
    atencion: (mensaje: string) => avisar('atencion', mensaje),
  };
}
