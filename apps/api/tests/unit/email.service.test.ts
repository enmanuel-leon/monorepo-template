import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Email Service Unit Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('logs mock message and skips sending when transporter is disabled', async () => {
    vi.resetModules();
    vi.doMock('../../src/config/env.js', () => ({
      env: {
        EMAIL_ENABLED: false,
        SMTP_HOST: undefined,
      },
    }));

    const { logger } = await import('../../src/config/logger.js');
    const infoSpy = vi.spyOn(logger, 'info');

    const { sendEmail } = await import('../../src/services/email/email.service.js');

    await sendEmail('user@example.com', 'Test Subject', '<p>Hello world</p>');

    expect(infoSpy).toHaveBeenCalledWith(
      { to: 'user@example.com', subject: 'Test Subject' },
      'Email disabled or mock mode. Skipping actual send.',
    );
  });

  it('logs mock message and skips sending when EMAIL_ENABLED is true but SMTP_HOST is undefined', async () => {
    vi.resetModules();
    vi.doMock('../../src/config/env.js', () => ({
      env: {
        EMAIL_ENABLED: true,
        SMTP_HOST: undefined,
      },
    }));

    const { logger } = await import('../../src/config/logger.js');
    const infoSpy = vi.spyOn(logger, 'info');

    const { sendEmail } = await import('../../src/services/email/email.service.js');

    await sendEmail('user@example.com', 'No Host Subject', '<p>No Host</p>');

    expect(infoSpy).toHaveBeenCalledWith(
      { to: 'user@example.com', subject: 'No Host Subject' },
      'Email disabled or mock mode. Skipping actual send.',
    );
  });

  it('sends email successfully with port 465 and secure option', async () => {
    vi.resetModules();
    const mockSendMail = vi.fn().mockResolvedValue({ messageId: 'msg-success-123' });
    const mockCreateTransport = vi.fn().mockReturnValue({
      sendMail: mockSendMail,
    });

    vi.doMock('nodemailer', () => ({
      default: {
        createTransport: mockCreateTransport,
      },
    }));

    vi.doMock('../../src/config/env.js', () => ({
      env: {
        EMAIL_ENABLED: true,
        SMTP_HOST: 'smtp.example.com',
        SMTP_PORT: 465,
        SMTP_USER: 'smtp-user',
        SMTP_PASS: 'smtp-pass',
        SMTP_FROM: 'support@example.com',
      },
    }));

    const { logger } = await import('../../src/config/logger.js');
    const infoSpy = vi.spyOn(logger, 'info');

    const { sendEmail } = await import('../../src/services/email/email.service.js');

    expect(mockCreateTransport).toHaveBeenCalledWith({
      host: 'smtp.example.com',
      port: 465,
      secure: true,
      auth: {
        user: 'smtp-user',
        pass: 'smtp-pass',
      },
    });

    await sendEmail('recipient@example.com', 'Invoice Ready', '<p>Your invoice</p>');

    expect(mockSendMail).toHaveBeenCalledWith({
      from: 'support@example.com',
      to: 'recipient@example.com',
      subject: 'Invoice Ready',
      html: '<p>Your invoice</p>',
    });

    expect(infoSpy).toHaveBeenCalledWith(
      { to: 'recipient@example.com', subject: 'Invoice Ready' },
      'Sending transactional email via SMTP...',
    );
    expect(infoSpy).toHaveBeenCalledWith(
      { to: 'recipient@example.com', messageId: 'msg-success-123' },
      'Email sent successfully via SMTP',
    );
  });

  it('falls back to port 587 and default SMTP_FROM when port and from are omitted', async () => {
    vi.resetModules();
    const mockSendMail = vi.fn().mockResolvedValue({ messageId: 'msg-fallback-456' });
    const mockCreateTransport = vi.fn().mockReturnValue({
      sendMail: mockSendMail,
    });

    vi.doMock('nodemailer', () => ({
      default: {
        createTransport: mockCreateTransport,
      },
    }));

    vi.doMock('../../src/config/env.js', () => ({
      env: {
        EMAIL_ENABLED: true,
        SMTP_HOST: 'smtp.mailtrap.io',
        SMTP_PORT: undefined,
        SMTP_USER: 'user-trap',
        SMTP_PASS: 'pass-trap',
        SMTP_FROM: undefined,
      },
    }));

    const { sendEmail } = await import('../../src/services/email/email.service.js');

    expect(mockCreateTransport).toHaveBeenCalledWith({
      host: 'smtp.mailtrap.io',
      port: 587,
      secure: false,
      auth: {
        user: 'user-trap',
        pass: 'pass-trap',
      },
    });

    await sendEmail('user@test.org', 'Fallback Test', '<p>Fallback</p>');

    expect(mockSendMail).toHaveBeenCalledWith({
      from: 'App Template <onboarding@resend.dev>',
      to: 'user@test.org',
      subject: 'Fallback Test',
      html: '<p>Fallback</p>',
    });
  });

  it('catches and logs error when transporter sendMail fails without rethrowing', async () => {
    vi.resetModules();
    const failureError = new Error('SMTP connection refused');
    const mockSendMail = vi.fn().mockRejectedValue(failureError);
    const mockCreateTransport = vi.fn().mockReturnValue({
      sendMail: mockSendMail,
    });

    vi.doMock('nodemailer', () => ({
      default: {
        createTransport: mockCreateTransport,
      },
    }));

    vi.doMock('../../src/config/env.js', () => ({
      env: {
        EMAIL_ENABLED: true,
        SMTP_HOST: 'smtp.example.com',
        SMTP_PORT: 587,
        SMTP_USER: 'smtp-user',
        SMTP_PASS: 'smtp-pass',
        SMTP_FROM: 'support@example.com',
      },
    }));

    const { logger } = await import('../../src/config/logger.js');
    const errorSpy = vi.spyOn(logger, 'error');

    const { sendEmail } = await import('../../src/services/email/email.service.js');

    await expect(
      sendEmail('failed-user@example.com', 'Failing Subject', '<p>Fail</p>'),
    ).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalledWith(
      {
        err: failureError,
        to: 'failed-user@example.com',
        subject: 'Failing Subject',
      },
      'Failed to send email via SMTP transporter',
    );
  });
});
