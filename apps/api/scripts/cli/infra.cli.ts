import { spinner, log, text } from '@clack/prompts';
import { spawnSync } from 'node:child_process';
import { z } from 'zod';
import { sendEmail } from '../../src/services/email/email.service.js';
import { getSafeCommandEnvironment, SYSTEM_COMMANDS } from '../../src/config/command.js';

const emailSchema = z.email();

export async function runInfraUp(): Promise<void> {
  const s = spinner();
  s.start('Starting local Docker containers (Postgres, Redis, MinIO)...');

  const res = spawnSync(
    SYSTEM_COMMANDS.DOCKER,
    ['compose', '-f', '../../docker/docker-compose.dev.yml', 'up', '-d'],
    {
      stdio: 'pipe',
      encoding: 'utf-8',
      env: getSafeCommandEnvironment(),
    },
  );

  if (res.status !== 0) {
    s.stop('Failed to start Docker containers!');
    log.error(res.stderr || res.stdout || 'Docker command failed');
    return;
  }

  s.stop('Docker infrastructure started successfully!');
}

export async function runInfraDown(): Promise<void> {
  const s = spinner();
  s.start('Stopping local Docker containers...');

  const res = spawnSync(
    SYSTEM_COMMANDS.DOCKER,
    ['compose', '-f', '../../docker/docker-compose.dev.yml', 'down'],
    {
      stdio: 'pipe',
      encoding: 'utf-8',
      env: getSafeCommandEnvironment(),
    },
  );

  if (res.status !== 0) {
    s.stop('Failed to stop Docker containers!');
    log.error(res.stderr || res.stdout || 'Docker command failed');
    return;
  }

  s.stop('Docker infrastructure stopped successfully!');
}

export async function runInfraStatus(): Promise<void> {
  const s = spinner();
  s.start('Checking Docker container status...');

  const res = spawnSync(
    SYSTEM_COMMANDS.DOCKER,
    ['compose', '-f', '../../docker/docker-compose.dev.yml', 'ps'],
    {
      stdio: 'pipe',
      encoding: 'utf-8',
      env: getSafeCommandEnvironment(),
    },
  );

  if (res.status !== 0) {
    s.stop('Docker status check failed or Docker is not running.');
    log.error(res.stderr || res.stdout || 'Docker status failed');
    return;
  }

  s.stop('Docker status retrieved!');
  log.info(res.stdout || 'No containers running.');
}

export async function runSmtpTest(): Promise<void> {
  const recipientEmail = await text({
    message: 'Enter recipient email address for SMTP test:',
    placeholder: 'user@example.com',
    validate: (val) => {
      if (!emailSchema.safeParse(val).success) {
        return 'Please enter a valid email address';
      }
    },
  });

  if (typeof recipientEmail !== 'string') {
    log.warn('SMTP test cancelled.');
    return;
  }

  const s = spinner();
  s.start(`Sending test email to ${recipientEmail}...`);

  try {
    const testSubject = 'SMTP Connectivity Diagnostic Test';
    const testHtml = `<div style="font-family: sans-serif; padding: 24px; background: #0f1117; color: #fff; border-radius: 12px; border: 1px solid #1e2330;">
      <h2 style="color: #a78bfa; margin-top: 0;">SMTP Diagnostic Test Successful</h2>
      <p style="color: #cbd5e1;">This diagnostic test email confirms that your SMTP server configuration and transactional email service are functioning properly.</p>
      <p style="font-size: 12px; color: #64748b; margin-bottom: 0;">Sent at: ${new Date().toISOString()}</p>
    </div>`;

    await sendEmail(recipientEmail, testSubject, testHtml);
    s.stop(`Diagnostic email successfully sent to ${recipientEmail}!`);
  } catch (err: unknown) {
    s.stop('Failed to send SMTP test email!');
    log.error((err as Error)?.message || 'SMTP delivery failed.');
  }
}
