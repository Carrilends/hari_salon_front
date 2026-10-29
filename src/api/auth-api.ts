import { servicesApi, adminServiceApi } from './services-api';
import type { AuthResponse } from './apiTypes';

/** Confirmación del borrado: `password` si la cuenta la tiene, si no `email`. */
export interface DeleteAccountBody {
  password?: string;
  email?: string;
}

export interface GenericMessage {
  message: string;
}

/**
 * Cliente único de autenticación. Centraliza los endpoints que antes estaban
 * dispersos entre `composables/auth.ts`, `RegisterPage.vue` y `MyAccountPage`.
 * `servicesApi` es la instancia pública; `adminServiceApi` añade el Bearer.
 */
export const authApi = {
  register: (body: {
    email: string;
    password: string;
    fullName: string;
    dataPolicyAccepted: boolean;
  }) =>
    servicesApi
      .post<AuthResponse>('/auth/register', body)
      .then((r) => r.data),

  login: (body: { email: string; password: string }) =>
    servicesApi.post<AuthResponse>('/auth/login', body).then((r) => r.data),

  forgotPassword: (email: string) =>
    servicesApi
      .post<GenericMessage>('/auth/forgot-password', { email })
      .then((r) => r.data),

  resetPassword: (token: string, newPassword: string) =>
    servicesApi
      .post<GenericMessage>('/auth/reset-password', { token, newPassword })
      .then((r) => r.data),

  verifyEmail: (token: string) =>
    servicesApi
      .post<GenericMessage>('/auth/verify-email', { token })
      .then((r) => r.data),

  resendVerification: (email: string) =>
    servicesApi
      .post<GenericMessage>('/auth/resend-verification', { email })
      .then((r) => r.data),

  updateProfile: (body: { fullName: string }) =>
    adminServiceApi
      .patch<AuthResponse>('/auth/me/profile', body)
      .then((r) => r.data),

  updateEmail: (body: { newEmail: string; currentPassword: string }) =>
    adminServiceApi
      .patch<AuthResponse>('/auth/me/email', body)
      .then((r) => r.data),

  updatePassword: (body: { currentPassword: string; newPassword: string }) =>
    adminServiceApi
      .patch<AuthResponse>('/auth/me/password', body)
      .then((r) => r.data),

  // Fase 3b: sesión con refresh en cookie httpOnly.
  refresh: () =>
    servicesApi.post<AuthResponse>('/auth/refresh').then((r) => r.data),

  logout: () => servicesApi.post<void>('/auth/logout').then((r) => r.data),

  loginWithGoogle: (idToken: string, dataPolicyAccepted?: boolean) =>
    servicesApi
      .post<AuthResponse>('/auth/google', { idToken, dataPolicyAccepted })
      .then((r) => r.data),

  // Plan 6 · Mi cuenta. La sesión fresca al abrir la página: trae
  // `hasPassword` y `emailVerified` al día aunque el perfil persistido sea de
  // otro dispositivo o de antes de crear la contraseña.
  checkStatus: () =>
    adminServiceApi.get<AuthResponse>('/auth/check-status').then((r) => r.data),

  // Cierra la sesión en todos los dispositivos: el backend revoca todos los
  // refresh de la cuenta y limpia la cookie. Lleva Bearer (`@Auth()`).
  logoutAll: (): Promise<void> =>
    adminServiceApi.post<void>('/auth/logout-all').then(() => undefined),

  // Elimina la cuenta de la clienta (`DELETE /auth/me`, `@Auth()`). Se confirma
  // con la contraseña o, si la cuenta no tiene (Google), con el correo. 204 sin
  // cuerpo; el servidor limpia la cookie del refresh. 422 = confirmación
  // equivocada, 403 = cuenta de administración, 429 = demasiados intentos.
  deleteAccount: (body: DeleteAccountBody): Promise<void> =>
    adminServiceApi
      .delete<void>('/auth/me', { data: body })
      .then(() => undefined),
};
