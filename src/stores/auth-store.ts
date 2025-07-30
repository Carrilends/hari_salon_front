import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useAuthStore = defineStore(
  'auth',
  () => {
    const token = ref('');
    const fullname = ref('');
    const email = ref('');
    const roles = ref<string[]>([]);

    return {
      token,
      fullname,
      email,
      roles,
    };
  },
  { persist: true }
);
