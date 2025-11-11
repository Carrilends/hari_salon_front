import { boot } from 'quasar/wrappers';
import { useAuthStore } from 'src/stores/auth-store';

export default boot(() => {
  const auth = useAuthStore();

  // Barrido inmediato al iniciar
  auth.sweepIfExpired();

  // Cada minuto (ligero y suficiente)
  const id = setInterval(() => {
    auth.sweepIfExpired();
    console.log('Auth expiry check run');
  }, 60_000);

  // Al volver a la pestaña
  const onFocus = () => auth.sweepIfExpired();
  window.addEventListener('visibilitychange', onFocus);
  window.addEventListener('focus', onFocus);

  // Limpieza (opcional si tu boot no se descarga nunca)
  window.addEventListener('beforeunload', () => {
    clearInterval(id);
    window.removeEventListener('visibilitychange', onFocus);
    window.removeEventListener('focus', onFocus);
  });
});
