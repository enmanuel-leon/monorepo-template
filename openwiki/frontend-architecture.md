# Frontend Architecture & Performance Standards

This document establishes the architecture, design patterns, quality guardrails, and non-functional requirements (NFRs) governing the React 19 and Vite 8 SPA frontend application (`apps/web`).

---

## 1. Presentation & Logic Separation: The Custom Hook 3-File Pattern

To maintain maintainability, testability, and clean decoupling between UI rendering and business logic, all pages and complex view components are organized in dedicated directory modules following the **Custom Hook 3-File Pattern**:

```
apps/web/src/pages/<page-name>/
├── <page-name>.tsx       # Pure presentation component
├── use-<page-name>.ts    # Isolated business logic and state hook
└── index.ts              # Encapsulated barrel export
```

### 1.1 Pure Presentation Component (`<page-name>.tsx`)

The presentation file contains pure JSX rendering, Tailwind CSS styling, and Lucide React icons.

- **Zero Business Logic:** No direct state instantiation (`useState`), side-effects (`useEffect`), network mutations, or API calls are defined within the component body.
- **Hook Consumption:** The component delegates all state and behavior by invoking its paired custom hook (`const page = usePageName()`).
- **Prop Immutability:** Props are wrapped in `Readonly<Props>` to enforce read-only semantics (SonarLint S6759).
- **Branch Rendering:** Conditional rendering is precalculated in helper variables using standard `if/else` control flow or rendered via safe boolean `&&` guards. Ternary operators (`? :`) are strictly forbidden.

### 1.2 Custom Logic Hook (`use-<page-name>.ts`)

The logic hook encapsulates all imperative logic, reactivity, and external communications:

- **State Management:** Manages local state (`useState`, `useRef`, `useReducer`).
- **Data Synchronization:** Executes queries and mutations via TanStack Query (`useQuery`, `useMutation`, `useQueryClient`).
- **Form Validation:** Validates form inputs against Zod schemas using `safeParse`.
- **Event Handlers & Callbacks:** Handles modal toggles, submission flows, and toast alerts (`sonner`).
- **Clean Return Contract:** Exposes a typed object containing only the state properties, derived flags, and action callbacks required by the presentation view.

### 1.3 Encapsulated Barrel Export (`index.ts`)

The barrel file enforces module boundaries by re-exporting the presentation component exclusively:

```typescript
export { ItemsPage } from './items-page';
```

**Invariant:** Barrel files must never export the internal custom hook (`useItemsPage`). This ensures external views consume the component as a cohesive black box.

---

## 2. State Management Architecture

State is segregated into two primary layers: client-side global UI state and server cache state.

### 2.1 Global UI State with Zustand

Persistent client-side settings reside in lightweight Zustand stores located in `apps/web/src/stores/`. Stores leverage browser `localStorage` for cross-session persistence and optionally synchronize settings with backend user profiles.

#### 1. Theme Store (`apps/web/src/stores/theme.store.ts`)
Manages application dark/light theme switching:
- Validates values against `THEMES` constants (`dark` | `light`).
- Automatically updates document root class (`document.documentElement.classList.add('dark')`).
- Dispatches asynchronous preference updates to `/api/v1/me` when authenticated.

#### 2. Locale Store (`apps/web/src/stores/locale.store.ts`)
Manages client-side internationalization (i18n):
- Validates language codes against `LOCALES` constants (`en` | `es`).
- Synchronizes with `i18next` runtime (`i18n.changeLanguage(locale)`).
- Automatically persists locale selection to `localStorage` and synchronizes with `/api/v1/me`.

### 2.2 Server State & Cache Management with TanStack Query v5

Server state is managed through TanStack Query (`@tanstack/react-query`). A centralized client configuration is established in `apps/web/src/lib/query-client.ts`:

```typescript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
```

#### Cache Stability & Smooth Page Transitions
- **`staleTime` Invariant:** Queries configure explicit `staleTime` (typically `30s` to `60s`) to avoid redundant duplicate network requests during rapid user navigation.
- **`placeholderData: keepPreviousData`:** Paginated listings and filtered tables preserve previous data frames during asynchronous fetching, eliminating UI flickering and layout shifts while transitioning between pages.
- **Cache Invalidation:** Mutations proactively invalidate affected query keys (`queryClient.invalidateQueries({ queryKey: ['items'] })`) to guarantee eventual consistency without requiring full page reloads.

---

## 3. Performance Non-Functional Requirements (NFRs)

### 3.1 Strict Table Polling Ban

Automated background polling loops (`refetchInterval` in TanStack Query, recursive `setTimeout`, or `setInterval`) are **strictly prohibited** across all data tables and listing views (such as items, moderation feeds, user catalogs, or audit logs).

#### Rationale
- Prevents server-side connection saturation and excess compute costs.
- Prevents database connection pool exhaustion across multiple active client tabs.
- Protects client battery and network bandwidth on mobile and metered networks.

#### Manual Reload Invariant
Every data view must provide an explicit, visible refresh button. The reload button must trigger on-demand data refetching and display an animated loading spinner (`RotateCw` icon with `animate-spin`) while the query is actively refetching.

```tsx
<button
  type="button"
  onClick={() => refetch()}
  disabled={isRefetching}
  className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium"
>
  <RotateCw className={isRefetching ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} />
  <span>{t('common.refresh')}</span>
</button>
```

*(Note: In implementation, classes are computed via helper variables to uphold the ternary ban).*

### 3.2 Mandatory Server-Side Pagination

Client-side pagination (retrieving unbounded database records to slice them in-memory in the browser) is **strictly prohibited**.

- **Query Parameters:** Endpoints must accept `page` (default: `1`) and `pageSize` (default: `10`, maximum: `50`).
- **Response Structure:** Responses conform to the standardized envelope:
  ```typescript
  interface PaginatedResponse<T> {
    data: T[];
    pagination: {
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  }
  ```
- **Prisma Query Strategy:** The API executes pagination queries concurrently with count queries:
  ```typescript
  const [data, total] = await Promise.all([
    prisma.item.findMany({ skip: (page - 1) * pageSize, take: pageSize }),
    prisma.item.count({ where }),
  ]);
  ```

### 3.3 Heavy Computation Memoization

Heavy operations must be memoized using `useMemo` and `useCallback` to prevent costly component re-renders:
- Static analysis summaries, AST evaluations, and code diff parsing.
- Complex data filtering, multidimensional sorting, and nested tree transformations.
- Form validation schema compilers and dynamic column definitions.

---

## 4. Code Quality & Non-Negotiable Guardrails

### 4.1 Absolute Ban on Ternary Operators

Ternary operators (`condition ? a : b`) are **strictly banned** across all `.ts`, `.tsx`, and `.py` files.

#### Logic Files (`.ts`)
Use explicit `if/else` control flow blocks with clean, early returns:

```typescript
// PROHIBITED
const label = isActive ? 'Active' : 'Inactive';

// COMPLIANT
let label = 'Inactive';
if (isActive) {
  label = 'Active';
}
```

#### Presentation Blocks (`.tsx`)
Pre-calculate render branches inside local helper variables before the `return` statement, or use safe boolean `&&` logical guards:

```tsx
// PROHIBITED
<div>{hasError ? <ErrorView /> : <SuccessView />}</div>

// COMPLIANT
let content = <SuccessView />;
if (hasError) {
  content = <ErrorView />;
}

return (
  <div>
    {content}
    {hasNotification && <NotificationBadge count={count} />}
  </div>
);
```

#### Conditional Styling
Use class merger utilities (`cn`) with boolean conditionals:

```typescript
const buttonClass = cn(
  'rounded-lg px-4 py-2 font-medium',
  isActive && 'bg-[#7B6CF6] text-white',
);
```

### 4.2 Component Prop Immutability

All React functional component props must be explicitly wrapped in `Readonly<Props>` to satisfy SonarLint rule S6759:

```tsx
interface UserCardProps {
  name: string;
  email: string;
  role: string;
}

export function UserCard({ name, email, role }: Readonly<UserCardProps>) {
  return (
    <div className="p-4 border rounded-lg">
      <h3 className="font-semibold">{name}</h3>
      <p className="text-sm text-slate-500">{email}</p>
    </div>
  );
}
```

### 4.3 UI Hygiene & Icon Standards

- **Strict Ban on Unicode Emojis:** Raw unicode emojis (such as ⚡, 🚀, 🌐, ◈) are prohibited in `.tsx` components. All UI iconography must use vector SVG icons from **Lucide React** (`lucide-react`).
- **No Commercial Trade Names:** Avoid hardcoding real commercial service or company names in code, templates, or input placeholders. Use neutral placeholders (e.g., "Example Corp", "Jane Doe", "Storage Provider").
- **Stacked ID Display Standard:** When displaying tenant or resource UUIDs, render them directly underneath the name using vertical `flex flex-col` typography with monospace styling (`font-mono text-[10px] opacity-60`).

### 4.4 Prohibition of Magic Strings

Hardcoded string literals for domain entities, statuses, themes, and roles are banned. All domain keys are centralized in `src/constants/`:

```typescript
// src/constants/theme.constants.ts
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
} as const;

export type Theme = (typeof THEMES)[keyof typeof THEMES];
```

Import and consume constants directly at all call sites:

```typescript
import { THEMES } from '../constants/theme.constants';

if (storedTheme === THEMES.DARK) {
  // ...
}
```

### 4.5 SonarLint Compliance & Accessibility Standards

- **Native Interactive Elements (S6848 / S1082):** Never bind `onClick` handlers to non-interactive containers like `<div>` or `<span>`. Use native `<button>` elements with clear `type="button"` attributes.
- **Predefined Stable IDs for Skeleton Keys (S6479):** Never use array indexes as React list keys. For loading skeleton placeholders, map over arrays with predefined stable keys (`[{ id: 'skeleton-1' }, { id: 'skeleton-2' }]`).
- **No Native Dialogs:** Never invoke `window.confirm`, `window.alert`, or `window.prompt`. Accessible modal dialog components must be used for user prompts and confirmation workflows.
- **Locale-Aware String Sorting (S2871):** Never call `.sort()` without an explicit comparator. Always sort strings with `.sort((a, b) => a.localeCompare(b))`.

---

## 5. Verification Commands

Run the frontend verification suite to validate compliance before committing changes:

```bash
# Typecheck frontend application
pnpm --filter web typecheck

# Run linter and formatting checks across web
pnpm --filter web lint

# Execute root monorepo quality gate
pnpm check
```
