# Authentication, Passkeys & Security Architecture

This document details the architecture, cryptographic flows, session lifecycle, and client integration for the authentication and security subsystems of the monorepo application.

---

## 1. System Architecture: Fastify 5 & Better Auth Integration

The backend application (`apps/api`) implements standards-compliant authentication powered by [Better Auth](https://www.better-auth.com/), utilizing PostgreSQL 17 as the persistence layer via the official Prisma 7 adapter (`@better-auth/adapters/prisma`).

### 1.1 Architectural Component Overview

```
                                      +---------------------------------------------+
                                      |            Fastify 5 HTTP Pipeline           |
                                      +---------------------------------------------+
                                                             |
                                           [Route: /api/v1/auth/*]
                                                             v
+------------------------+   HTTP Request     +-------------------------------------+
|   React 19 Client      | -----------------> |       auth.controller.ts            |
| (apps/web/src/lib/     |                    | (Translates Node.js req to Web Req) |
|   auth-client.ts)      | <----------------- +-------------------------------------+
+------------------------+    HTTP Response                  |
                                               auth.handler(webRequest)
                                                             v
                                              +-------------------------------------+
                                              |       Better Auth Core Engine       |
                                              |      (apps/api/src/lib/auth.ts)     |
                                              +-------------------------------------+
                                                             |
                                         +-------------------+-------------------+
                                         |                   |                   |
                                         v                   v                   v
                                  +--------------+    +--------------+    +--------------+
                                  |   Passkey    |    |  Email OTP   |    | Organization |
                                  |   Plugin     |    |   Plugin     |    |   Plugin     |
                                  +--------------+    +--------------+    +--------------+
                                         |                   |                   |
                                         +-------------------+-------------------+
                                                             |
                                                             v
                                              +-------------------------------------+
                                              |     Prisma 7 Adapter (@prisma)      |
                                              +-------------------------------------+
                                                             |
                                                             v
                                              +-------------------------------------+
                                              |       PostgreSQL 17 Database        |
                                              +-------------------------------------+
```

### 1.2 Configuration Layer (`apps/api/src/lib/auth.ts`)

Authentication settings are initialized through `betterAuth({...})` with PostgreSQL native UUID generation and custom session mapping:

```typescript
import { betterAuth, APIError, type BetterAuthPlugin } from 'better-auth';
import { createAuthMiddleware } from 'better-auth/api';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { organization, admin, emailOTP } from 'better-auth/plugins';
import { passkey } from '@better-auth/passkey';
import { prisma } from './prisma.js';
import { env } from '../config/env.js';
import { APP_NAME, AUTH_BASE_PATH } from '../config/constants.js';
import { PASSWORD_POLICY } from '../constants/auth.constants.js';

export const auth = betterAuth({
  appName: APP_NAME,
  baseURL: env.BETTER_AUTH_URL,
  basePath: AUTH_BASE_PATH, // Resolves to '/api/v1/auth'
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
```

### 1.3 Fastify Route Integration (`apps/api/src/routes/v1/auth.route.ts`)

The authentication suite is registered as a wildcard sub-router mounted under prefix `/api/v1`:

```typescript
import type { FastifyInstance } from 'fastify';
import { handleAuth } from '../../controllers/auth.controller.js';

const AUTH_METHODS: Array<'GET' | 'POST' | 'OPTIONS'> = ['GET', 'POST', 'OPTIONS'];

export async function authRoutes(fastify: FastifyInstance) {
  // Custom content parser to gracefully manage empty or raw string JSON bodies
  fastify.addContentTypeParser(
    'application/json',
    { parseAs: 'string' },
    (_request, body, done) => {
      let text = '';
      if (typeof body === 'string') {
        text = body;
      }
      if (text.length === 0) {
        done(null, undefined);
        return;
      }
      try {
        done(null, JSON.parse(text));
      } catch (error) {
        let err = new Error(String(error));
        if (error instanceof Error) {
          err = error;
        }
        done(err, undefined);
      }
    },
  );

  fastify.route({
    method: AUTH_METHODS,
    url: '/auth/*',
    schema: { hide: true },
    handler: handleAuth,
  });
}
```

### 1.4 Web Request Bridge Controller (`apps/api/src/controllers/auth.controller.ts`)

Fastify uses Node.js HTTP stream abstractions, whereas Better Auth expects Web Standard `Request` and `Response` objects. The bridge controller handles bidirectional translation:

1. **Preflight Optimization:** Resolves `OPTIONS` requests immediately with HTTP 204 No Content.
2. **Header Normalization:** Utilizes `fromNodeHeaders` from `better-auth/node` to transform incoming Node headers into standard Web Headers, stripping hop-by-hop metadata such as `content-length`.
3. **Body Serialization:** Translates parsed request payloads into JSON string streams for non-GET/HEAD verbs.
4. **Execution & Header Pipe:** Passes the constructed `Request` to `auth.handler(authRequest)` and maps response headers back to `FastifyReply`, skipping response headers (`content-length`, `content-encoding`, `transfer-encoding`) managed directly by Fastify.

---

## 2. Core Authentication Flows & Security Policies

### 2.1 Email & Password Policy

Credential-based authentication strictly adheres to centralized length constraints defined in `apps/api/src/constants/auth.constants.ts`:

```typescript
export const PASSWORD_POLICY = {
  MIN_LENGTH: 8,
  MAX_LENGTH: 128,
} as const;
```

Passwords are salted and hashed using modern key derivation functions (Scrypt / Argon2id) managed by Better Auth. Client passwords must be validated against `registrationPasswordSchema` using Zod before submission.

When `env.EMAIL_ENABLED` evaluates to `true`:
- `requireEmailVerification` is active (`true`).
- `autoSignIn` is disabled (`false`), requiring explicit email OTP confirmation prior to session generation.

### 2.2 6-Digit Email OTP Verification

Verification codes are managed by the `emailOTP` plugin (`better-auth/plugins`).

```typescript
emailOTP({
  async sendVerificationOTP({ email, otp, type }, _request) {
    logger.info({ email, type, otp }, 'Sending 6-digit OTP verification code via email...');

    let reqLocale = 'en';
    if (_request?.headers) {
      const headerLocale =
        _request.headers.get('x-app-locale') || _request.headers.get('accept-language');
      if (headerLocale?.toLowerCase().startsWith('es')) {
        reqLocale = 'es';
      }
    }

    let subject = 'Your 6-digit verification code';
    let heading = 'Verification Code';
    let bodyText =
      'Enter the following 6-digit code in the app to verify your email address and activate your account:';
    let footerNotice =
      'This code is valid for 10 minutes. If you did not request this account, you can safely ignore this email.';

    if (reqLocale === 'es') {
      subject = 'Tu código de verificación de 6 dígitos';
      heading = 'Código de Verificación';
      bodyText =
        'Ingresa el siguiente código de 6 dígitos en la aplicación para verificar tu correo electrónico y activar tu cuenta:';
      footerNotice =
        'Este código es válido por 10 minutos. Si no solicitaste esta cuenta, puedes ignorar este correo de forma segura.';
    }

    // Dispatches responsive dark-themed HTML template via Nodemailer
    await sendEmail(email, subject, html);
  },
})
```

#### Verification Lifecycle & Security Invariants

- **Lifespan:** OTP codes expire exactly **10 minutes** after issuance.
- **Header Locale Detection:** The server inspects `x-app-locale` followed by `accept-language`. Spanish copy is dispatched only when the header prefix matches `es`; otherwise, all system transactional emails default strictly to English.
- **Anti-Cache Nonce:** Each outgoing message injects an invisible unique timestamp reference (`Ref: ${Date.now()}`) to prevent email client thread collapsion.
- **Delivery Engine:** Handled via Nodemailer SMTP abstraction in `apps/api/src/services/email/email.service.ts`.

### 2.3 WebAuthn Passkeys

Passwordless authentication is powered by `@better-auth/passkey`, supporting hardware authenticators (e.g., YubiKey, Apple Touch ID, Windows Hello) via the FIDO2 / WebAuthn standard.

#### Backend Registration (`apps/api/src/lib/auth.ts`)

```typescript
passkey({
  rpName: APP_NAME,
  rpID: 'localhost', // Production environment injects the primary domain
  origin: primaryOrigin, // Validated against env.CORS_ORIGIN
})
```

#### Credential Storage (`passkey` table in PostgreSQL)

Passkey credentials are bound to specific user records in `schema.prisma`:

| Column | Type | Description |
|---|---|---|
| `id` | `uuid` | Primary key identifier for the registered credential record. |
| `name` | `text` | User-assigned friendly label (e.g., "MacBook Touch ID"). |
| `publicKey` | `text` | Base64-encoded public key bytes used to verify assertions. |
| `userId` | `uuid` | Foreign key referencing `user(id)` with `ON DELETE CASCADE`. |
| `credentialID` | `text` | Unique credential ID emitted by the WebAuthn authenticator. |
| `counter` | `integer` | Monotonically increasing signature counter preventing replay attacks. |
| `deviceType` | `text` | Categorization identifier (e.g., `singleDevice`, `multiDevice`). |
| `backedUp` | `boolean` | Flag indicating whether the passkey is synced to a cloud keychain. |
| `transports` | `text` | Supported hardware transport protocols (`usb`, `nfc`, `ble`, `internal`). |
| `aaguid` | `text` | Authenticator Attestation Globally Unique Identifier. |

### 2.4 Two-Factor Authentication (2FA)

TOTP multi-factor authentication stores encrypted secret seeds and pre-computed recovery tokens in the `two_factor` table:

```prisma
model TwoFactor {
  id          String  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  secret      String
  backupCodes String  @map("backup_codes")
  userId      String  @map("user_id") @db.Uuid
  verified    Boolean @default(false)
  user        User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("two_factor")
}
```

- **Algorithm:** RFC 6238 Time-based One-Time Password algorithm (30-second interval, HMAC-SHA1/SHA256).
- **Recovery:** Emergency fallback via one-time backup codes persisted in `backupCodes`.

---

## 3. Session Lifecycle, Cookies & Security Guardrails

### 3.1 Session Data Model (`user_session` table)

Session records track authentication state across browser instances and API requests:

```prisma
model UserSession {
  id                   String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  expiresAt            DateTime @map("expires_at")
  token                String   @unique
  createdAt            DateTime @default(now()) @map("created_at")
  updatedAt            DateTime @updatedAt @map("updated_at")
  ipAddress            String?  @map("ip_address")
  userAgent            String?  @map("user_agent")
  userId               String   @map("user_id") @db.Uuid
  activeOrganizationId String?  @map("active_organization_id")
  impersonatedBy       String?  @map("impersonated_by")
  user                 User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("user_session")
}
```

#### Active Tenant Context

The column `active_organization_id` designates the tenant scope currently selected by the authenticated user. Changing active organizations updates this value without requiring a full re-authentication lifecycle.

### 3.2 Cookie & Transport Security

Authentication tokens are transmitted via HTTP cookies:

- **Cookie Identifier:** `better-auth.session_token` (or `__Secure-better-auth.session_token` in TLS/HTTPS environments).
- **Attributes:** Set with `HttpOnly`, `SameSite=Lax` (or `None` in cross-origin setups), and `Secure` flags.
- **CORS Credentials:** Fastify explicitly permits credentials in `apps/api/src/app.ts`:
  ```typescript
  await app.register(cors, {
    origin: env.CORS_ORIGIN,
    credentials: true,
  });
  ```
- **Origin Whitelisting:** Better Auth validates request origins against `buildTrustedOrigins()`:
  ```typescript
  function buildTrustedOrigins(): string[] {
    const origins = [env.BETTER_AUTH_URL];
    origins.push(...env.CORS_ORIGIN);
    return Array.from(new Set(origins));
  }
  ```

### 3.3 Account Duplication Guard

To prevent user enumeration leaks or silent overwrites, `apps/api/src/lib/auth.ts` intercepts registration attempts using a dedicated Better Auth `before` hook:

```typescript
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
}
```

When an existing email is detected, the API immediately throws an `APIError` with code `USER_ALREADY_EXISTS`. This allows the client to highlight the collision deterministically and guide the user to the login view.

---

## 4. Frontend Client Integration (`apps/web/src/lib/auth-client.ts`)

### 4.1 Client Instance Initialization

The React application interfaces with Better Auth through a strongly-typed client instance initialized in `apps/web/src/lib/auth-client.ts`:

```typescript
import { createAuthClient } from 'better-auth/react';
import { organizationClient, adminClient, emailOTPClient } from 'better-auth/client/plugins';
import { passkeyClient } from '@better-auth/passkey/client';

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL || '',
  basePath: '/api/v1/auth',
  plugins: [organizationClient(), passkeyClient(), adminClient(), emailOTPClient()],
});
```

### 4.2 Core Client Operations Across Pages

#### 1. Sign In & Registration (`apps/web/src/pages/login/use-login-page.ts`)

```typescript
// Email & Password Registration
const { data, error } = await authClient.signUp.email({
  email,
  password,
  name,
});

// Email OTP Verification
const { error: otpError } = await authClient.emailOtp.verifyEmail({
  email,
  otp: otpCode,
});

// Resending OTP Code
await authClient.emailOtp.sendVerificationOtp({
  email,
  type: 'email-verification',
});

// Standard Credential Sign In
const { error: signInError } = await authClient.signIn.email({
  email,
  password,
});

// Passwordless Sign In via Passkey
const { error: passkeyError } = await authClient.signIn.passkey();
```

#### 2. Passkey Management (`apps/web/src/pages/settings/use-settings-page.ts`)

Passkey administration is isolated strictly inside `SettingsPage` under an active session:

```typescript
// Querying active passkeys
const passkeysQuery = authClient.useListPasskeys();

// Enrolling a new passkey
const result = await authClient.passkey.addPasskey({
  name: passkeyName.trim() || undefined,
});

// Renaming an existing passkey
const result = await authClient.passkey.updatePasskey({
  id: targetPasskeyId,
  name: updatedName.trim(),
});

// Revoking a passkey
const result = await authClient.passkey.deletePasskey({
  id: targetPasskeyId,
});
```

### 4.3 Active Session Navigation Guard

Authenticated users must not remain on unauthenticated entry routes (`/login` or `/register`). Pages enforce reactive redirects using custom hooks:

```typescript
// Inside use-login-page.ts and use-register-page.ts
const session = authClient.useSession();

useEffect(() => {
  if (session.data?.user?.emailVerified) {
    navigate('/', { replace: true });
  }
}, [session.data?.user, navigate]);
```

When an active session is detected, the browser is immediately transitioned to `/`, maintaining navigation state integrity.
