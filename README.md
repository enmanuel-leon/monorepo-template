# Monorepo App Template

Production-ready, highly optimized fullstack monorepo template built with **Fastify 5**, **React 19**, **Vite 8**, **Prisma 7**, **Better Auth**, and **Docker**.

---

## 🚀 Quickstart

### 1. Prerequisites

- **Node.js**: `>= 24.0.0`
- **pnpm**: `>= 10.33.0`
- **Docker**: Docker Desktop / Engine with Docker Compose

### 2. Installation

```bash
# Clone or copy template
cd monorepo-app-template

# Install dependencies and generate Prisma Client
pnpm install

# The install hook runs this automatically; this is the explicit equivalent:
pnpm prisma:generate

# Copy environment variables
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

### WSL/Linux Host Requirement

When working inside WSL, install Node.js and pnpm inside the Linux distribution. Do not rely on
Windows `node`, `npm`, or `pnpm` shims exposed through `/mnt/c`.

Verify the active Linux tools before running the CLI:

```bash
command -v node
command -v pnpm
node --version
pnpm --version
```

Both commands must resolve to Linux paths. `npm cli` is not a valid project command; use `pnpm cli`
after the Linux Node.js and pnpm prerequisites are available.

VS Code tasks in this workspace use a login Bash automation profile so that NVM and the Linux Node.js
toolchain are loaded automatically. Reload the VS Code window after changing shell configuration.

### 3. Start Local Infrastructure & DB Seed

```bash
# Start Postgres, Redis, and MinIO in Docker
pnpm infra:up

# Push database schema & seed reference data
pnpm db:push
pnpm db:seed
```

The reference seed does not create users or organizations. To create an administrator separately,
use the `Create Administrator User` option in `pnpm cli`, or run `pnpm db:seed:admin` with
`SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` set. The password must contain between 8 and 128
characters and is never stored in the seed source code.

### 4. Interactive Developer & SRE Console (`pnpm cli`)

Launch the interactive Clack CLI console to test database connections, Redis, run SMTP email diagnostics, run seeds, or control Docker:

```bash
pnpm cli
```

### 5. Start Development Servers

```bash
pnpm dev
```

- **Frontend SPA**: `http://localhost:5173`
- **Backend API**: `http://localhost:3000`
- **OpenAPI Swagger Docs**: `http://localhost:3000/docs`

---

## 🌐 Environment Variables & Precedence Architecture

Environment variables follow a strict hierarchy of precedence across local development and production environments:

### Precedence Hierarchy (Highest to Lowest Priority)

1. **System & OS / Process Environment** (`process.env`, Docker Secrets, K8s ConfigMap/Secret) **[Highest Priority]**
2. **App-Specific Environment File** (`apps/api/.env` or `apps/web/.env`)
3. **Monorepo Root Environment File** (`/.env`)
4. **Code Fallbacks** (`env.ts` / Zod defaults) **[Lowest Priority]**

### Development vs Production Strategy

- **Development (Local)**:
  - Keep configuration separated inside `apps/api/.env` and `apps/web/.env` for clean application isolation.
  - Root `/.env` is used by Docker Compose (`pnpm infra:up`) for local infrastructure services.
- **Production (Docker & Kubernetes)**:
  - **Do NOT commit `.env` files** to Git.
  - Production variables are injected directly into container memory via Kubernetes Secrets (`k8s/secrets.yaml`), ConfigMaps (`k8s/configmap.yaml`), or cloud provider environments.

### Environment File Responsibilities

- `.env` at the repository root is used for shared local infrastructure managed by Docker Compose.
- `apps/api/.env` contains backend runtime configuration and secrets.
- `apps/web/.env` contains frontend build-time values, normally using the `VITE_*` prefix.
- When the same variable exists in multiple sources, process variables have the highest priority, followed by the application file, the root file, and finally code defaults.
- The root `.env` is not automatically merged into every app process. Keep application files explicit unless a loader intentionally implements the root file as a fallback.
- Backend-only values such as `DATABASE_URL`, `REDIS_URL`, storage credentials, and authentication secrets must not be exposed through the frontend.

### Frontend Build-Time Injection (`VITE_*`)

- **Backend (`apps/api`)**: Node.js evaluates `process.env` at **runtime** on every request.
- **Frontend (`apps/web`)**: Vite replaces `VITE_*` variables at **build-time** (`pnpm build`). Production builds require `VITE_API_URL` to be provided during the container image build phase.

---

## 🛠️ VS Code & Cursor Task Integration

The repository includes `.vscode/tasks.json` preconfigured with 8 one-click tasks:

- `Infra: Start (Docker)` — Spin up local Postgres + Redis + MinIO.
- `Dev: All (BE + FE)` — Run both apps in parallel with Turborepo.
- `Dev: API (Backend)` — Fastify API with hot reload (`tsx watch`).
- `Dev: Web (Frontend)` — React SPA with Vite.
- `DB: Push & Seed` — Apply Prisma schema changes & seed reference data.
- `Dev: Clean & Reset Local` — Wipes local docker volumes, rebuilds DB, and re-seeds cleanly.
- `Quality: Check All` — Run format checks, linters, typechecks, and test suite.

---

## 📦 Monorepo Layout

```
monorepo-app-template/
├── .github/
│   └── workflows/        # CI, Security (pnpm audit & gitleaks) & OpenWiki workflows
├── apps/
│   ├── api/             # Fastify 5 + Prisma 7 + Better Auth + Clack CLI
│   └── web/             # React 19 + Vite 8 + TanStack Query + Sonner + Tailwind
├── docker/
│   ├── docker-compose.dev.yml  # Local Dev Infra (Postgres, Redis, MinIO)
│   └── docker-compose.yml      # Containerized Full Stack
├── k8s/                 # Kubernetes Production Manifests (Deployments, Ingress, Secrets)
├── packages/
│   └── config-typescript/ # Shared TSConfig presets
├── openwiki/            # Architecture & TODO Configuration Wiki
├── sonar-project.properties # SonarQube / SonarCloud configuration
├── Taskfile.yml         # Go Task runner configuration
└── turbo.json           # Turborepo build pipeline
```

---

## 🧪 Quality Gates & Verification

```bash
# Standard verification suite
pnpm check

# Pre-push full verification (format, lint, typecheck, test, build)
pnpm prepush:verify

# Vitest code coverage (V8 LCOV)
pnpm --filter api test:coverage

# Unused code & dependency scanner
pnpm knip
```

Runs `oxfmt --check`, `oxlint`, `typecheck`, `vitest`, and production build verification.
