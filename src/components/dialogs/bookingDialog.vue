<template>
  <CajonReserva :abierto="dialog" @update:abierto="alCambiar" />
</template>

<script setup lang="ts">
import CajonReserva from 'src/components/reserva/CajonReserva.vue';
import { useDialog } from 'src/composables/dialogs/useDialogService';

/**
 * Envoltorio delgado del cajón de reserva (plan 1 de las vistas). Se queda
 * con este nombre y este contrato —`v-model:dialog`— porque lo importa
 * `MainLayout.vue` y lo abren la cabecera, la barra fija de móvil y la ficha
 * de un servicio a través de `bookStore.showDialog`.
 *
 * La pestaña de administración y el segundo diálogo de fecha y hora que
 * vivían aquí ya no existen (B1, B7): la dueña administra en `/reservas`.
 */
defineOptions({ name: 'BookingDialog' });

const props = defineProps<{ dialog: boolean }>();
/**
 * Los mismos emits que `DialogEmits`, escritos aquí: el compilador de SFC de
 * jest no resuelve tipos importados en `defineEmits`.
 */
const emit = defineEmits<{ (e: 'update:dialog', value: boolean): void }>();
const { dialog } = useDialog(props, emit);

function alCambiar(valor: boolean) {
  dialog.value = valor;
}
</script>
