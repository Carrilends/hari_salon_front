import { watch } from 'vue';
import { useAuthStore } from 'src/stores/auth-store';
import { useAviso } from 'src/composables/shared/useAviso';
import { MENSAJE_SESION_CERRADA } from 'src/constants/mensajes-sesion';

/**
 * RF32: avisa cuando la sesión se cierra sola (token vencido o refresco
 * rechazado). `caducar()` pone `sesionCaducada` en verdadero; `setSession` la
 * devuelve a falso, y un `logout()` voluntario no la toca. Sin `immediate`.
 */
export function useAvisoSesionCerrada(): void {
  const auth = useAuthStore();
  const aviso = useAviso();

  watch(
    () => auth.sesionCaducada,
    (ahora, antes) => {
      if (ahora && !antes) aviso.atencion(MENSAJE_SESION_CERRADA);
    },
    // El arranque (`boot/auth-expiry`) intenta restaurar la sesión antes de que
    // monte `App.vue`: si falla, la bandera ya está en verdadero al montar. La
    // bandera no se persiste, así que solo puede estarlo por ese fallo.
    { immediate: true },
  );
}
