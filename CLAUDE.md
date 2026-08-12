# CLAUDE.md - AI Agent Context & Reference Guide

This repository is a production-ready fullstack monorepo template built with Node 24, Fastify 5, React 19, Vite 8, Prisma 7, Better Auth, and Tailwind CSS.

---

## 🚀 Primary Commands

- `pnpm dev` — Start development servers for API & Web via Turborepo (`http://localhost:5173`)
- `pnpm cli` — Interactive SRE & Developer CLI console (Clack) for DB, Redis, SMTP test, and Docker management
- `pnpm check` — Run format check (`oxfmt --check`), oxlint, typecheck, and vitest suite
- `pnpm prepush:verify` — Full pre-push verification (format, lint, typecheck, tests, build)
- `pnpm --filter api test:coverage` — Run Vitest suite with V8 LCOV code coverage
- `pnpm knip` — Scan for dead code, unused exports, and unlisted dependencies
- `pnpm infra:up` — Spin up local Postgres, Redis, and MinIO Docker containers
- `pnpm db:push` — Push Prisma schema updates to database
- `pnpm db:seed` — Seed default admin user, countries (with ISO3 codes), timezones, and demo data
- `pnpm clean:reset` — Wipe local Docker volumes, recreate database, push schema & seed

---

## 🛠️ Code Style & Architectural Guidelines

### 1. The "NO Ternary Operators" Rule (Strictly Enforced)

- Ternary expressions (`condition ? a : b`) are forbidden in all `.ts` and `.tsx` files.
- In logic files (`.ts`): Use explicit `if/else` control flow blocks with early returns.
- In React render blocks (`.tsx`): Pre-calculate conditional layouts into local variables before the `return` statement, or use safe boolean `&&` guards.
- For CSS classes: Always use `cn("base", isActive && "active-style")`.

### 2. NO Emojis in UI Components

- Raw unicode emojis (e.g. ◈, ⚡, 🚀, 🌐) are strictly prohibited in React UI components (`.tsx`).
- Always use Lucide React vector SVG icons (e.g. `<Sparkles />`, `<Building2 />`, `<Layers />`, `<Globe />`).

### 3. NO Commercial Trade Names

- Do not hardcode real commercial company or service names in templates, input placeholders, or translation JSONs.
- Use generic placeholders (e.g. "Jane Doe", "Example Corp", "App Template", "Storage Provider").

### 4. NO Magic Strings (Centralized Constants)

- Do not use hardcoded string literals for status values (`"active"`, `"pending"`), user roles (`"admin"`, `"user"`), storage providers (`"local"`, `"s3"`, `"gcs"`), or locales (`"es"`, `"en"`).
- Always define domain string values inside `as const` constant objects or TypeScript enums in centralized `constants/` files (`src/constants/*.constants.ts`) and import them at call sites.

### 5. React & Auth Guidelines

- **Active Session Navigation Fallback:** Navigating to `/login` or `/register` with an active session automatically redirects to `/`.
- **Passkey Isolation:** WebAuthn passkey registration is available exclusively inside authenticated `SettingsPage`.
- **Readonly Component Props:** Type functional component props as `Readonly<Props>` to satisfy SonarLint `S6759`.
- **Custom Hook Separation:** Split pages into `page-name.tsx` (JSX presentation), `use-page-name.ts` (state/handlers hook), and `index.ts` (barrel export).
- **Internationalization (i18n):** All client-facing UI text must use `useTranslation()` from `react-i18next`.
- **Stacked ID Display:** Render organization/tenant UUIDs directly underneath the name using a vertical `flex flex-col` layout with font-mono text (`font-mono text-[10px] opacity-60`).

### 6. Environment Variable Priority & Precedence

- **Precedence Hierarchy**: System OS / Process Environment (`process.env`, Docker/K8s) > App `.env` (`apps/api/.env`) > Monorepo Root `/.env` > Code Defaults.
- **Local Dev Strategy**: Keep environment variables inside `apps/api/.env` and `apps/web/.env`.
- **Production Strategy**: Inject via Kubernetes Secrets & ConfigMaps (`k8s/`). Never commit `.env` files to Git.
- **Vite Client (`VITE_*`)**: Variables are evaluated and injected at **build-time** (`pnpm build`).

### 7. Quality & Sonar Compliance

- **No `eslint-disable` or `oxlint-disable`:** Fix the root cause of linter warnings.
- **Sonar Coverage Exclusions:** Configured via `sonar-project.properties` targeting LCOV output at `coverage/lcov.info`.

### 8. Input Validation and Frontend Conventions

- Validate user and external input at its boundary with Zod. Use `safeParse` for interactive validation so invalid input can be reported without throwing.
- Keep password validation aligned with Better Auth: minimum 8 and maximum 128 characters.
- Use `SyntheticEvent<HTMLFormElement>` for form handlers that only call `preventDefault`, and use a more specific event type when event data is needed. Do not use deprecated `FormEvent` aliases.
- Use canonical Tailwind CSS v4 utilities, such as `bg-linear-to-r` instead of `bg-gradient-to-r`.

### 9. Git & Commit Conventions

- **Conventional Commits:** Use `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`.
- **Strict Line Length (100-char max in body):** Wrap commit headers and every line in body to <= 100 characters.
- **Mandatory User Approval Before Git Operations:** AI Agents MUST NOT run `git add`, `git commit`, `git push`, `git tag`, `git merge`, `git rebase`, or branch deletion commands without explicit authorization for that exact operation.
- Commit authorization does not authorize pushing. Never amend commits, force-push, skip hooks, or change Git configuration unless explicitly requested.
- Before an authorized commit, inspect `git status`, `git diff`, `git diff --cached`, and `git log --oneline -10`.
- Stage only intended files. Never stage secrets, `.env` files, generated output, or unrelated user changes.
- Keep unrelated concerns in separate commits and report the commit hash and included files after committing.

See `CONTRIBUTING.md` for the complete collaboration and repository protection policy.
