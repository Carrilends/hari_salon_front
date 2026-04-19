import { boot } from 'quasar/wrappers';
import { createHead } from '@vueuse/head';

export default boot(({ app }) => {
  const head = createHead();
  app.use(head);
});
