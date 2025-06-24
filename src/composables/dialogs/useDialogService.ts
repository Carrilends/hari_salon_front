import { computed } from 'vue';

export type DialogEmits = {
  (e: 'update:dialog', value: boolean): void;
};

export function useDialog(props: { dialog: boolean }, emit: DialogEmits) {
  const dialog = computed({
    get: () => props.dialog,
    set: (val) => emit('update:dialog', val),
  });

  function show() {
    dialog.value = true;
  }

  function hide() {
    dialog.value = false;
  }

  return {
    dialog,
    show,
    hide,
  };
}

// useDialog(emit);
