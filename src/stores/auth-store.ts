// src/stores/auth-store.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

type DecodedJwt = { exp?: number; [k: string]: unknown };

function decodeJwtExpMs(token: string): number {
  try {
    const [, payload] = token.split('.');
    const json = JSON.parse(atob(payload));
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
      },
      expMs?: number
    ) {
      token.value = newToken;
      fullname.value = profile.fullName;
      email.value = profile.email;
      roles.value = profile.roles ?? [];
      // undefined solo en respuestas antiguas: asumir verificado (ver arriba).
      emailVerified.value = profile.emailVerified ?? true;
      // si el back no manda exp, se decodifica del JWT
      const decoded = expMs && expMs > 0 ? expMs : decodeJwtExpMs(newToken);
      expiresAt.value = decoded || 0;
    }

    function logout() {
      token.value = '';
      fullname.value = '';
      email.value = '';
      roles.value = [];
      expiresAt.value = 0;
      emailVerified.value = true;
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
      isExpired,
      isLoggedIn,
      isAdmin,
      setSession,
      logout,
      sweepIfExpired,
    };
  },
  { persist: true }
);
