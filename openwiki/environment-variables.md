# OpenWiki: Environment Variables Architecture & Precedence

## 🌐 Hierarchy of Precedence (Highest to Lowest Priority)

1. **System & OS / Container Process Variables** (`process.env`, Kubernetes Secrets/ConfigMaps, Docker) **[Highest Priority]**
2. **Application-Specific `.env`** (`apps/api/.env` or `apps/web/.env`)
3. **Monorepo Root `.env`** (`/.env`)
4. **Code Defaults & Fallbacks** (`env.ts` / Zod defaults) **[Lowest Priority]**

---

## 💻 Local Development Strategy

- Keep server configuration inside `apps/api/.env` and web configuration in `apps/web/.env`.
- Root `/.env` is read by Docker Compose (`pnpm infra:up`) for local PostgreSQL, Redis, and MinIO infrastructure.

---

## 🚀 Production Deployment Strategy

- **Never commit `.env` files to Git**.
- Production variables are injected directly into container memory via Kubernetes ConfigMaps (`k8s/configmap.yaml`) and Secrets (`k8s/secrets.yaml`).

---

## ⚡ Vite Frontend (`VITE_*`) Build-Time Injection

- **Backend (`apps/api`)**: Evaluates `process.env` dynamically at **runtime** on every HTTP request.
- **Frontend (`apps/web`)**: Vite replaces `VITE_*` variables at **compile time** (`pnpm build`). Pass `VITE_API_URL` during the container image build phase.
