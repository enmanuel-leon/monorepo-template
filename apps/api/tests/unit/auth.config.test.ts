import { describe, it, expect, vi, beforeEach } from 'vitest';
import { auth } from '../../src/lib/auth.js';
import { prisma } from '../../src/lib/prisma.js';
import * as emailService from '../../src/services/email/email.service.js';

describe('Auth Configuration and Helper Unit Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('verifies basic auth options configuration', () => {
    expect(auth.options.appName).toBeDefined();
    expect(auth.options.baseURL).toBeDefined();
    expect(auth.options.basePath).toBe('/api/v1/auth');
    expect(auth.options.trustedOrigins).toBeDefined();
    expect(auth.options.plugins).toBeDefined();
    expect(auth.options.plugins?.length).toBeGreaterThan(0);
  });

  it('tests before hook on sign-up with new email and other endpoints', async () => {
    const beforeHook = auth.options.hooks?.before as any;
    expect(beforeHook).toBeDefined();

    const findUniqueSpy = vi.spyOn(prisma.user, 'findUnique');

    // Case 1: different path
    await beforeHook({ path: '/other-path', body: { email: 'test@example.com' } });
    expect(findUniqueSpy).not.toHaveBeenCalled();

    // Case 2: sign-up path without email
    await beforeHook({ path: '/sign-up/email', body: {} });
    expect(findUniqueSpy).not.toHaveBeenCalled();

    // Case 3: sign-up path with new non-existing email
    findUniqueSpy.mockResolvedValueOnce(null);
    await beforeHook({ path: '/sign-up/email', body: { email: 'newuser@example.com' } });
    expect(findUniqueSpy).toHaveBeenCalledWith({ where: { email: 'newuser@example.com' } });
  });

  it('tests before hook on sign-up with existing email throws USER_ALREADY_EXISTS', async () => {
    const beforeHook = auth.options.hooks?.before as any;
    expect(beforeHook).toBeDefined();

    vi.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce({
      id: 'existing-user-id',
      email: 'taken@example.com',
      name: 'Existing User',
      emailVerified: true,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      role: 'user',
      banned: false,
      banReason: null,
      banExpires: null,
    } as any);

    await expect(
      beforeHook({ path: '/sign-up/email', body: { email: 'taken@example.com' } }),
    ).rejects.toThrow();
  });

  it('tests organization allowUserToCreateOrganization logic', async () => {
    const orgPlugin = auth.options.plugins?.find((p: any) => p.id === 'organization') as any;
    expect(orgPlugin).toBeDefined();
    expect(orgPlugin.options?.allowUserToCreateOrganization).toBeDefined();

    const allowUserFn = orgPlugin.options.allowUserToCreateOrganization;

    vi.spyOn(prisma.member, 'findFirst').mockResolvedValueOnce({
      id: 'member-owner-1',
      organizationId: 'org-1',
      userId: 'user-1',
      role: 'owner',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const isDenied = await allowUserFn({ id: 'user-1' });
    expect(isDenied).toBe(false);

    vi.spyOn(prisma.member, 'findFirst').mockResolvedValueOnce(null);
    const isAllowed = await allowUserFn({ id: 'user-2' });
    expect(isAllowed).toBe(true);
  });

  it('tests organization sendInvitationEmail logic', async () => {
    const orgPlugin = auth.options.plugins?.find((p: any) => p.id === 'organization') as any;
    expect(orgPlugin).toBeDefined();
    expect(orgPlugin.options?.sendInvitationEmail).toBeDefined();

    const sendInvitationFn = orgPlugin.options.sendInvitationEmail;
    const sendEmailSpy = vi.spyOn(emailService, 'sendEmail').mockResolvedValue(undefined);

    await sendInvitationFn({
      email: 'invitee@example.com',
      organization: { name: 'Acme Global' },
      role: 'member',
    });

    expect(sendEmailSpy).toHaveBeenCalledTimes(1);
    expect(sendEmailSpy).toHaveBeenCalledWith(
      'invitee@example.com',
      expect.stringContaining('Acme Global'),
      expect.stringContaining('Acme Global'),
    );
  });

  it('tests emailOTP sendVerificationOTP with Spanish (default) locale', async () => {
    const emailOtpPlugin = auth.options.plugins?.find((p: any) => p.id === 'email-otp') as any;
    expect(emailOtpPlugin).toBeDefined();
    expect(emailOtpPlugin.options?.sendVerificationOTP).toBeDefined();

    const sendOtpFn = emailOtpPlugin.options.sendVerificationOTP;
    const sendEmailSpy = vi.spyOn(emailService, 'sendEmail').mockResolvedValue(undefined);

    await sendOtpFn(
      { email: 'user-es@example.com', otp: '123456', type: 'email-verification' },
      undefined,
    );

    expect(sendEmailSpy).toHaveBeenCalledTimes(1);
    expect(sendEmailSpy).toHaveBeenCalledWith(
      'user-es@example.com',
      'Tu código de verificación de 6 dígitos',
      expect.stringContaining('123456'),
    );
  });

  it('tests emailOTP sendVerificationOTP with English locale via x-app-locale', async () => {
    const emailOtpPlugin = auth.options.plugins?.find((p: any) => p.id === 'email-otp') as any;
    const sendOtpFn = emailOtpPlugin.options.sendVerificationOTP;
    const sendEmailSpy = vi.spyOn(emailService, 'sendEmail').mockResolvedValue(undefined);

    const mockRequest = {
      headers: new Headers({
        'x-app-locale': 'en',
      }),
    };

    await sendOtpFn(
      { email: 'user-en@example.com', otp: '654321', type: 'email-verification' },
      mockRequest,
    );

    expect(sendEmailSpy).toHaveBeenCalledTimes(1);
    expect(sendEmailSpy).toHaveBeenCalledWith(
      'user-en@example.com',
      'Your 6-digit verification code',
      expect.stringContaining('654321'),
    );
  });

  it('tests emailOTP sendVerificationOTP with English locale via accept-language', async () => {
    const emailOtpPlugin = auth.options.plugins?.find((p: any) => p.id === 'email-otp') as any;
    const sendOtpFn = emailOtpPlugin.options.sendVerificationOTP;
    const sendEmailSpy = vi.spyOn(emailService, 'sendEmail').mockResolvedValue(undefined);

    const mockRequest = {
      headers: new Headers({
        'accept-language': 'en-US,en;q=0.9',
      }),
    };

    await sendOtpFn(
      { email: 'user-accept@example.com', otp: '999888', type: 'email-verification' },
      mockRequest,
    );

    expect(sendEmailSpy).toHaveBeenCalledTimes(1);
    expect(sendEmailSpy).toHaveBeenCalledWith(
      'user-accept@example.com',
      'Your 6-digit verification code',
      expect.stringContaining('999888'),
    );
  });

  it('tests emailOTP sendVerificationOTP with Spanish locale via accept-language', async () => {
    const emailOtpPlugin = auth.options.plugins?.find((p: any) => p.id === 'email-otp') as any;
    const sendOtpFn = emailOtpPlugin.options.sendVerificationOTP;
    const sendEmailSpy = vi.spyOn(emailService, 'sendEmail').mockResolvedValue(undefined);

    const mockRequest = {
      headers: new Headers({
        'accept-language': 'es-ES,es;q=0.9',
      }),
    };

    await sendOtpFn(
      { email: 'user-es2@example.com', otp: '333444', type: 'email-verification' },
      mockRequest,
    );

    expect(sendEmailSpy).toHaveBeenCalledTimes(1);
    expect(sendEmailSpy).toHaveBeenCalledWith(
      'user-es2@example.com',
      'Tu código de verificación de 6 dígitos',
      expect.stringContaining('333444'),
    );
  });

  it('covers buildPlugins fallback when CORS_ORIGIN is empty', async () => {
    vi.resetModules();
    vi.doMock('../../src/config/env.js', async () => {
      const actual = await vi.importActual<Record<string, unknown>>('../../src/config/env.js');
      const mockEnv = {
        ...(actual.env as Record<string, unknown>),
        CORS_ORIGIN: [],
      };
      return {
        ...actual,
        env: mockEnv,
      };
    });

    const modulePath = '../../src/lib/auth.js?test=empty-cors';
    const { auth: isolatedAuth } = (await import(
      modulePath
    )) as typeof import('../../src/lib/auth.js');
    const passkeyPlugin = isolatedAuth.options.plugins?.find((p: any) => p.id === 'passkey') as any;
    expect(passkeyPlugin.options.origin).toBe('http://localhost:5173');
  });
});
