import { servicesApi, adminServiceApi } from './services-api';
import type { AuthResponse } from './apiTypes';

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
};
