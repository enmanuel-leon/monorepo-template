# AGENTS.md - Developer & AI Agent Guidelines

Welcome, AI Agent / Developer! Read this document carefully before modifying code in this workspace.

---

## 🛑 Strict Workspace Rules

1. **NO Ternary Operators**: Ternary expressions (`condition ? a : b`) are forbidden in all `.ts`, `.tsx`, and `.py` files.
   - Use standard `if/else` control flow or pre-calculated local variables.
2. **NO Emojis in UI Components**: Raw unicode emojis (e.g. ◈, ⚡, 🚀) are strictly prohibited in `.tsx` components.
   - Always use Lucide React vector SVG icons (e.g. `<Sparkles />`, `<Building2 />`, `<Layers />`, `<Globe />`).
3. **NO Commercial Trade Names**: Do not hardcode real commercial company or service names in templates, input placeholders, or translation JSONs.
   - Use generic template placeholders (e.g. "Jane Doe", "Example Corp", "App Template", "Storage Provider").
4. **Readonly Props in React**: Functional component props must be typed as `Readonly<Props>` (SonarLint `S6759`).
5. **Custom Hook Architecture**: Every SPA page must follow:
   - `page-name.tsx`: Pure JSX presentation.
   - `use-page-name.ts`: Custom hook managing state and handlers.
   - `index.ts`: Barrel export.
6. **No Hardcoded Client Text**: All UI text must use `useTranslation()` from i18next (`src/locales/en.json` & `es.json`).
7. **NO Magic Strings**: Always define domain string literals inside `as const` constant objects or TypeScript enums in centralized constants/service files (`src/constants/*.constants.ts`) and import them at call sites.
8. **Stacked ID Display Rule**: Render organization/tenant UUIDs directly underneath the name using a vertical `flex flex-col` layout with font-mono text (`font-mono text-[10px] opacity-60`).
9. **Auth & Passkey Isolation**:
   - WebAuthn Passkeys require an active authenticated session and are managed exclusively in `SettingsPage`.
   - Accessing `/login` or `/register` with an active session automatically redirects to `/`.
10. **Environment Variable Hierarchy & Precedence**:
    - **Priority Order**: OS/Container System Process > App `.env` (`apps/api/.env`) > Root `/.env` > Code Defaults.
    - **Local Dev**: Use `apps/api/.env` and `apps/web/.env`.
    - **Production**: Inject via Kubernetes Secrets/ConfigMaps (`k8s/`). Never commit `.env` files to Git.
    - **Vite Client (`VITE_*`)**: Variables are compiled at build-time (`pnpm build`).
11. **English Documentation Policy**: All comments, commit messages, JSDoc, and markdown documentation MUST be in English.
12. **Git Authorization Policy**:
    - Agents MUST NOT run `git add`, `git commit`, `git push`, `git tag`, `git merge`, `git rebase`, or branch deletion commands unless the user explicitly authorizes that exact operation.
    - Commit authorization and push authorization are separate. Permission to commit does not imply permission to push.
    - Agents MUST NOT amend commits, force-push, skip hooks, or change Git configuration unless explicitly requested.
    - Before any authorized commit, inspect `git status`, `git diff`, `git diff --cached`, and `git log --oneline -10`.
    - Stage only files belonging to the requested change. Never stage secrets, `.env` files, generated output, or unrelated user changes.
    - Use English Conventional Commit messages and keep unrelated concerns in separate commits.
    - After an authorized commit, report the commit hash and the exact files included. Do not push unless separately authorized.

---

## 🛠️ Verification & Quality Commands

Always verify your changes before marking a task complete:

```bash
# Standard verification suite (format check, oxlint, typecheck, vitest)
pnpm check

# Pre-push verification (format, lint, typecheck, test, build)
pnpm prepush:verify

# Unused code & dependency scanner
pnpm knip

# Interactive SRE & Developer CLI
pnpm cli
```

---

## 🔒 Security & Dependency Overrides

Dependencies and vulnerabilities are managed centrally in `pnpm-workspace.yaml`.
All security overrides (e.g. `nanoid`, `hono`, `fast-uri`, `brace-expansion`) are enforced at the root workspace level.
Run `pnpm audit` to verify CVE status.

See `CONTRIBUTING.md` for the complete collaboration, commit, review, and branch protection policy.
