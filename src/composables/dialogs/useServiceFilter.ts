import { ref } from 'vue';

export const useFilter = () => {
  const showFilter = ref(false);
  return {
    showFilter
  }
}


