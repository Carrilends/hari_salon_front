import { useQuasar } from 'quasar';
import ServiceDialog from 'src/components/dialogs/serviceDialog.vue';
const q = useQuasar();

export const generateDialog = () => {
  q.dialog({
    component: ServiceDialog,
    persistent: true,
  })
}
