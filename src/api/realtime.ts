import { io, type Socket } from 'socket.io-client';
import { WS_URL } from './ws-url';

let socket: Socket | null = null;

/** Decisión pura: ¿debe estar conectado el socket de administración? */
export function shouldConnectSocket(isAdmin: boolean, token: string): boolean {
  return isAdmin && !!token;
}

/**
 * Conecta el socket del panel. Se reconstruye siempre: cambiar el token de una
 * conexión viva no es posible porque el servidor solo lo valida en el handshake
 * (Fase 3b: el access token dura 15 min). Apunta directo a Railway vía
 * `VITE_WS_URL` (N4), no al proxy de Netlify, que no negocia el `Upgrade`.
 *
 * Sin límite de reintentos (el valor por defecto de socket.io, con espera
 * creciente hasta 5 s): con cinco intentos, un redeploy de Railway o una red
 * intermitente de más de ~20 s dejaban el panel sin canal hasta recargar. Al
 * reconectar, `useAdminNotifications` refresca lo que se perdió entretanto.
 */
export function connectAdminSocket(token: string): Socket {
  disconnectAdminSocket();
  socket = io(`${WS_URL}/eventos`, {
    auth: { token }, // N5: nunca en la query string
    transports: ['websocket'],
  });
  return socket;
}

export function disconnectAdminSocket(): void {
  socket?.disconnect();
  socket = null;
}

export function getAdminSocket(): Socket | null {
  return socket;
}
