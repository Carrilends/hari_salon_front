<template>
  <q-btn
    v-if="authStore.roles.includes('admin')"
    fab
    icon="delete"
    @click="emit('delete', props.element)"
  />
</template>

<script setup lang="ts">
import { useAuthStore } from 'src/stores/auth-store';

const authStore = useAuthStore();

const props = defineProps<{
  element: string;
}>();
const emit = defineEmits(['delete']);
</script>

<style scoped></style>
