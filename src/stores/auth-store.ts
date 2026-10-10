// src/stores/auth-store.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { limpiarDatosDeSesion } from 'src/stores/session-cleanup';

type DecodedJwt = { exp?: number; [k: string]: unknown };

function decodeJwtExpMs(token: string): number {
  try {
    const [, payload] = token.split('.');
    // base64url -> base64 antes de atob: sin esto un payload con `-`/`_` reventaba
    // y devolvía exp=0 ("sesión que nunca expira"). Es solo respaldo: la vigencia
    // real llega en `expiresIn` desde el backend (Fase 3b).
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = JSON.parse(atob(base64));
    const exp = (json as DecodedJwt).exp;
    return typeof exp === 'number' ? exp * 1000 : 0;
  } catch {
    return 0;
  }
}

export const useAuthStore = defineStore(
  'auth',
  () => {
    const token = ref('');
    const fullname = ref('');
    const email = ref('');
    const roles = ref<string[]>([]);
    const expiresAt = ref(0);
    // Por defecto true: las sesiones persistidas antes de la Fase 3a no traen
    // este campo, y asumir `true` evita mostrarles un aviso que nunca pidieron.
    const emailVerified = ref(true);
    // Plan 6: ¿la cuenta tiene contraseña local? `null` = no se sabe todavía:
    // el login, el registro y Google de las páginas del acceso no lo pasan, y
    // las sesiones persistidas de antes no lo traen. La renovación sí (pasa la
    // sesión entera) y Mi cuenta lo pregunta al abrir (`checkStatus`).
    const hasPassword = ref<boolean | null>(null);

    const isExpired = computed(
      () => !!expiresAt.value && Date.now() >= expiresAt.value
    );
    const isLoggedIn = computed(() => !!token.value && !isExpired.value);
    const isAdmin = computed(
      () => isLoggedIn.value && roles.value.includes('admin')
    );

    function setSession(
      newToken: string,
      profile: {
        fullName: string;
        email: string;
        roles: string[];
        emailVerified?: boolean;
        hasPassword?: boolean;
      },
      expMs?: number
    ) {
      token.value = newToken;
      fullname.value = profile.fullName;
      email.value = profile.email;
      roles.value = profile.roles ?? [];
      // undefined solo en respuestas antiguas: asumir verificado (ver arriba).
      emailVerified.value = profile.emailVerified ?? true;
      hasPassword.value = profile.hasPassword ?? null;
      // si el back no manda exp, se decodifica del JWT
      const decoded = expMs && expMs > 0 ? expMs : decodeJwtExpMs(newToken);
      expiresAt.value = decoded || 0;
    }

    function logout() {
      // Lo que cada dueño haya registrado: hoy, el hilo del asistente. Vive en
      // ámbito de módulo y ya no muere al cerrar el panel, así que cerrar sesión
      // tiene que llevárselo — en un ordenador compartido el gesto de fin de
      // turno es salir, no recargar, y con la herramienta `misReservas` en esa
      // conversación puede haber citas y fechas de quien se acaba de ir.
      limpiarDatosDeSesion();
      token.value = '';
      fullname.value = '';
      email.value = '';
      roles.value = [];
      expiresAt.value = 0;
      emailVerified.value = true;
      hasPassword.value = null;
    }

    function sweepIfExpired() {
      if (token.value && isExpired.value) logout();
    }

    return {
      token,
      fullname,
      email,
      roles,
      expiresAt,
      emailVerified,
      hasPassword,
      isExpired,
      isLoggedIn,
      isAdmin,
      setSession,
      logout,
      sweepIfExpired,
    };
  },
  {
    // S7: el access token deja de persistirse (vive en memoria y se recupera con
    // una renovación silenciosa al arrancar). El perfil sí se persiste para
    // evitar el parpadeo de "sesión cerrada" al recargar.
    persist: {
      pick: ['fullname', 'email', 'roles', 'emailVerified', 'hasPassword'],
    },
  }
);
