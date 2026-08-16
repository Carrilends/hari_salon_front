jest.mock('src/api/services-api', () => ({
  servicesApi: { post: jest.fn() },
  adminServiceApi: { post: jest.fn(), patch: jest.fn() },
}));

import { authApi } from 'src/api/auth-api';
import { servicesApi, adminServiceApi } from 'src/api/services-api';

const post = servicesApi.post as jest.Mock;
const patch = adminServiceApi.patch as jest.Mock;

describe('authApi client', () => {
  beforeEach(() => {
    post.mockReset();
    patch.mockReset();
  });

  test('forgotPassword posts the email and returns the message body', async () => {
    post.mockResolvedValue({ data: { message: 'ok' } });

    const res = await authApi.forgotPassword('a@b.com');

    expect(post).toHaveBeenCalledWith('/auth/forgot-password', {
      email: 'a@b.com',
    });
    expect(res).toEqual({ message: 'ok' });
  });

  test('resetPassword posts token and new password', async () => {
    post.mockResolvedValue({ data: { message: 'done' } });

    await authApi.resetPassword('tok', 'New-1234!');

    expect(post).toHaveBeenCalledWith('/auth/reset-password', {
      token: 'tok',
      newPassword: 'New-1234!',
    });
  });

  test('verifyEmail posts the token', async () => {
    post.mockResolvedValue({ data: { message: 'ok' } });

    await authApi.verifyEmail('tok');

    expect(post).toHaveBeenCalledWith('/auth/verify-email', { token: 'tok' });
  });

  test('resendVerification posts the email', async () => {
    post.mockResolvedValue({ data: { message: 'ok' } });

    await authApi.resendVerification('a@b.com');

    expect(post).toHaveBeenCalledWith('/auth/resend-verification', {
      email: 'a@b.com',
    });
  });

  test('login returns the auth session body', async () => {
    post.mockResolvedValue({
      data: { id: 'u-1', token: 't', emailVerified: false },
    });

    const res = await authApi.login({ email: 'a@b.com', password: 'x' });

    expect(post).toHaveBeenCalledWith('/auth/login', {
      email: 'a@b.com',
      password: 'x',
    });
    expect(res.emailVerified).toBe(false);
  });

  test('updatePassword uses the authenticated instance', async () => {
    patch.mockResolvedValue({ data: { id: 'u-1', token: 't' } });

    await authApi.updatePassword({
      currentPassword: 'old',
      newPassword: 'New-1234!',
    });

    expect(patch).toHaveBeenCalledWith('/auth/me/password', {
      currentPassword: 'old',
      newPassword: 'New-1234!',
    });
  });
});
