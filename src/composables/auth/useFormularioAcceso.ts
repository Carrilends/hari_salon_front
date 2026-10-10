import { computed, ref, type ComputedRef, type Ref } from 'vue';
import type { Rule } from 'src/helpers/validators';

/**
 * Validación de los formularios de acceso (decisión A4).
 *
 * Cada campo tiene sus reglas (`Rule<string>[]`, los validadores de
 * `src/helpers/validators.ts`) y su error se ENSEÑA solo cuando la clienta sale
 * del campo (`tocar`, en el `blur`) o cuando intenta enviar (`validarTodo`).
 * Mientras escribe por primera vez no se le regaña; una vez tocado, el error
 * sigue a lo que escribe y desaparece al corregir.
 *
 * Las claves de `reglas` van en el orden visual de los campos y son el `id` de
 * su `CampoAcceso`: `validarTodo()` devuelve el primero que falla, que es justo
 * adonde hay que mandar el foco (`enfocarCampo`).
 */
export type FormularioAcceso<K extends string> = {
  valores: Record<K, Ref<string>>;
  errores: ComputedRef<Record<K, string>>;
  tocar: (campo: K) => void;
  validarTodo: () => K | null;
  esValido: ComputedRef<boolean>;
  /**
   * Vuelve a empezar: pone esos valores (o vacío), olvida lo tocado y el
   * intento de envío. Lo usa Mi cuenta (plan 6) para «Descartar» y tras
   * guardar; el acceso no lo necesita.
   */
  reiniciar: (nuevos?: Partial<Record<K, string>>) => void;
};

export function useFormularioAcceso<K extends string>(
  reglas: Record<K, Rule<string>[]>
): FormularioAcceso<K> {
  const campos = Object.keys(reglas) as K[];
  const valores = {} as Record<K, Ref<string>>;
  campos.forEach((campo) => {
    valores[campo] = ref('');
  });

  const tocados = ref<string[]>([]);
  const intentoEnviar = ref(false);

  function primerError(campo: K): string {
    const reglasDelCampo = reglas[campo];
    for (let i = 0; i < reglasDelCampo.length; i += 1) {
      const resultado = reglasDelCampo[i](valores[campo].value);
      if (resultado !== true) return resultado;
    }
    return '';
  }

  const errores = computed(() => {
    const visibles = {} as Record<K, string>;
    campos.forEach((campo) => {
      const visible = intentoEnviar.value || tocados.value.includes(campo);
      visibles[campo] = visible ? primerError(campo) : '';
    });
    return visibles;
  });

  const esValido = computed(() =>
    campos.every((campo) => primerError(campo) === '')
  );

  function tocar(campo: K): void {
    if (!tocados.value.includes(campo)) {
      tocados.value = tocados.value.concat(campo);
    }
  }

  function validarTodo(): K | null {
    intentoEnviar.value = true;
    const primero = campos.find((campo) => primerError(campo) !== '');
    return primero ?? null;
  }

  function reiniciar(nuevos: Partial<Record<K, string>> = {}): void {
    campos.forEach((campo) => {
      valores[campo].value = nuevos[campo] ?? '';
    });
    tocados.value = [];
    intentoEnviar.value = false;
  }

  return { valores, errores, tocar, validarTodo, esValido, reiniciar };
}

/**
 * Lleva el foco al control con ese `id`. Solo se llama desde manejadores de
 * envío, nunca en `setup`: el acceso es SPA, pero ningún componente toca
 * `document` antes de montarse.
 */
export function enfocarCampo(id: string): void {
  if (typeof document === 'undefined') return;
  const campo = document.getElementById(id);
  if (campo) campo.focus();
}
