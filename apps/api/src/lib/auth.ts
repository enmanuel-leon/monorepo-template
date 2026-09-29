import { betterAuth, APIError, type BetterAuthPlugin } from 'better-auth';
import { createAuthMiddleware } from 'better-auth/api';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { organization, admin, emailOTP } from 'better-auth/plugins';
import { passkey } from '@better-auth/passkey';
import { prisma } from './prisma.js';
import { env } from '../config/env.js';
import { APP_NAME, AUTH_BASE_PATH } from '../config/constants.js';
import { sendEmail } from '../services/email/email.service.js';
import { logger } from '../config/logger.js';
import { PASSWORD_POLICY } from '../constants/auth.constants.js';

function buildTrustedOrigins(): string[] {
  const origins = [env.BETTER_AUTH_URL];
  origins.push(...env.CORS_ORIGIN);
  return Array.from(new Set(origins));
}

function buildPlugins(): BetterAuthPlugin[] {
  let primaryOrigin = 'http://localhost:5173';
  if (env.CORS_ORIGIN.length > 0 && env.CORS_ORIGIN[0]) {
    primaryOrigin = env.CORS_ORIGIN[0];
  }

  return [
    organization({
      allowUserToCreateOrganization: async (user) => {
        const existingOwnerMembership = await prisma.member.findFirst({
          where: {
            userId: user.id,
            role: 'owner',
          },
        });
        if (existingOwnerMembership) {
          return false;
        }
        return true;
      },
      sendInvitationEmail: async (data) => {
        logger.info(
          { email: data.email, orgName: data.organization.name, role: data.role },
          'Sending organization invitation email...',
        );
        const uniqueRef = Date.now().toString();
        const subject = `Invitación para unirte a ${data.organization.name}`;
        const html = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; background-color: #0f1117; border: 1px solid #1e2330; border-radius: 16px; padding: 32px; color: #f8fafc; text-align: center; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);">
          <h2 style="color: #ffffff; font-size: 20px; font-weight: 700; margin: 0 0 16px;">Has sido invitado a colaborar</h2>
          <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
            Has recibido una invitación para unirte a la organización <strong>${data.organization.name}</strong> con el rol de <strong>${data.role}</strong>.
          </p>
          <div style="margin: 24px 0;">
            <a href="${primaryOrigin}/select-organization" style="background-color: #7B6CF6; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block;">
              Ver y Aceptar Invitación
            </a>
          </div>
          <hr style="border: none; border-top: 1px solid #1e2330; margin: 24px 0 16px;" />
          <p style="color: #64748b; font-size: 11px; margin: 0;">${APP_NAME} · Todos los derechos reservados.</p>
          <div style="display: none; max-height: 0px; overflow: hidden; opacity: 0;">Ref: ${uniqueRef}</div>
        </div>`;

        await sendEmail(data.email, subject, html);
      },
    }),
    passkey({
      rpName: APP_NAME,
      rpID: 'localhost',
      origin: primaryOrigin,
    }),
    admin(),
    emailOTP({
      async sendVerificationOTP({ email, otp, type }, _request) {
        logger.info({ email, type, otp }, 'Sending 6-digit OTP verification code via email...');

        let reqLocale = 'es';
        if (_request?.headers) {
          const headerLocale =
            _request.headers.get('x-app-locale') || _request.headers.get('accept-language');
          if (headerLocale?.toLowerCase().startsWith('en')) {
            reqLocale = 'en';
          }
        }

        const uniqueRef = Date.now().toString();

        let subject = 'Tu código de verificación de 6 dígitos';
        let html = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; background-color: #0f1117; border: 1px solid #1e2330; border-radius: 16px; padding: 32px; color: #f8fafc; text-align: center; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);">
          <div style="margin-bottom: 24px;">
            <div style="width: 48px; height: 48px; margin: 0 auto 12px; background: linear-gradient(135deg, #7B6CF6, #4FB0FF); border-radius: 12px; font-weight: bold; font-size: 22px; line-height: 48px; color: #ffffff; text-align: center;">◈</div>
            <h2 style="color: #ffffff; font-size: 22px; font-weight: 700; margin: 0;">Código de Verificación</h2>
          </div>
          <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">Ingresa el siguiente código de 6 dígitos en la aplicación para verificar tu correo electrónico y activar tu cuenta:</p>
          <div style="background-color: #171a23; border: 2px dashed #7B6CF6; border-radius: 14px; padding: 20px 20px 16px; margin: 0 0 24px;">
            <span style="font-family: monospace, Courier, monospace; font-size: 38px; font-weight: 800; letter-spacing: 12px; color: #a78bfa; display: inline-block; margin-bottom: 12px;">${otp}</span>
            <div style="border-top: 1px solid #272d3d; padding-top: 12px; font-size: 12px; color: #cbd5e1; line-height: 1.5;">
              Este código es válido por 10 minutos. Si no solicitaste esta cuenta, puedes ignorar este correo de forma segura.
            </div>
          </div>
          <hr style="border: none; border-top: 1px solid #1e2330; margin: 24px 0 16px;" />
          <p style="color: #64748b; font-size: 11px; margin: 0;">${APP_NAME} · Todos los derechos reservados.</p>
          <div style="display: none; max-height: 0px; overflow: hidden; opacity: 0;">Ref: ${uniqueRef}</div>
        </div>`;

        if (reqLocale === 'en') {
          subject = 'Your 6-digit verification code';
          html = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; background-color: #0f1117; border: 1px solid #1e2330; border-radius: 16px; padding: 32px; color: #f8fafc; text-align: center; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);">
            <div style="margin-bottom: 24px;">
              <div style="width: 48px; height: 48px; margin: 0 auto 12px; background: linear-gradient(135deg, #7B6CF6, #4FB0FF); border-radius: 12px; font-weight: bold; font-size: 22px; line-height: 48px; color: #ffffff; text-align: center;">◈</div>
              <h2 style="color: #ffffff; font-size: 22px; font-weight: 700; margin: 0;">Verification Code</h2>
            </div>
            <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">Enter the following 6-digit code in the app to verify your email address and activate your account:</p>
            <div style="background-color: #171a23; border: 2px dashed #7B6CF6; border-radius: 14px; padding: 20px 20px 16px; margin: 0 0 24px;">
              <span style="font-family: monospace, Courier, monospace; font-size: 38px; font-weight: 800; letter-spacing: 12px; color: #a78bfa; display: inline-block; margin-bottom: 12px;">${otp}</span>
              <div style="border-top: 1px solid #272d3d; padding-top: 12px; font-size: 12px; color: #cbd5e1; line-height: 1.5;">
                This code is valid for 10 minutes. If you did not request this, you can safely ignore this email.
              </div>
            </div>
            <hr style="border: none; border-top: 1px solid #1e2330; margin: 24px 0 16px;" />
            <p style="color: #64748b; font-size: 11px; margin: 0;">${APP_NAME} · All rights reserved.</p>
            <div style="display: none; max-height: 0px; overflow: hidden; opacity: 0;">Ref: ${uniqueRef}</div>
          </div>`;
        }

        void sendEmail(email, subject, html);
      },
    }),
  ];
}

export const auth = betterAuth({
  appName: APP_NAME,
  baseURL: env.BETTER_AUTH_URL,
  basePath: AUTH_BASE_PATH,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: buildTrustedOrigins(),
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === '/sign-up/email') {
        const body = ctx.body as { email?: string };
        if (body?.email) {
          const existing = await prisma.user.findUnique({
            where: { email: body.email },
          });
          if (existing) {
            throw new APIError('UNPROCESSABLE_ENTITY', {
              message: 'User already exists',
              code: 'USER_ALREADY_EXISTS',
            });
          }
        }
      }
    }),
  },
  advanced: {
    database: {
      generateId: 'uuid',
    },
  },
  session: {
    modelName: 'userSession',
  },
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: PASSWORD_POLICY.MIN_LENGTH,
    maxPasswordLength: PASSWORD_POLICY.MAX_LENGTH,
    requireEmailVerification: env.EMAIL_ENABLED,
    autoSignIn: !env.EMAIL_ENABLED,
  },
  plugins: buildPlugins(),
});
