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

    const isExpired = computed(
      () => !!expiresAt.value && Date.now() >= expiresAt.value
    );
    const isLoggedIn = computed(() => !!token.value && !isExpired.value);
    const isAdmin = computed(
      () => isLoggedIn.value && roles.value.includes('admin')
    );

    function setSession(
      newToken: string,
      profile: { fullName: string; email: string; roles: string[] },
      expMs?: number
    ) {
      token.value = newToken;
      fullname.value = profile.fullName;
      email.value = profile.email;
      roles.value = profile.roles ?? [];
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
