# PostgreSQL Native Row-Level Security (RLS)

This document details the architecture, configuration, policies, and operational procedures for PostgreSQL Native Row-Level Security (RLS) in the monorepo.

---

## 1. Architecture Overview: Database Role Segregation

PostgreSQL Row-Level Security ensures data isolation directly at the database engine level. This creates defense-in-depth: even if application-level tenant checks fail or a raw SQL injection vulnerability occurs, the database engine denies access to rows outside the authenticated tenant or user context.

### Role Segregation Model

Two database roles govern database interactions:

1. **Scoped Application Role (`monorepo_app`)**
   - Created with `NOBYPASSRLS`, `NOSUPERUSER`, `NOCREATEDB`, and `NOCREATEROLE`.
   - Granted `SELECT`, `INSERT`, `UPDATE`, `DELETE` privileges exclusively within schema `public`.
   - Cannot bypass Row-Level Security policies under any circumstance.
   - Used for normal API request execution via session transaction wrappers (`withRLS`).

2. **Administrative Superuser Role (`root` / `postgres`)**
   - Possesses `BYPASSRLS` and superuser privileges.
   - Bypasses all RLS policies automatically.
   - Reserved strictly for running database migrations (`prisma migrate`), schema pushing, integration test database setup, and administrative CLI utilities (`pnpm cli`).

### Session Variable Propagation

PostgreSQL transaction-local settings (`set_config(name, value, is_local = true)`) convey the request context to PostgreSQL:

| Setting Key | Type | Description |
|---|---|---|
| `app.current_user_id` | `uuid` | Current authenticated user ID (`sub` / session subject). |
| `app.current_user_email` | `text` | Current authenticated user email address. |
| `app.is_admin` | `boolean` | Flag indicating whether the caller has platform superadmin rights. |

These variables are initialized at the start of each scoped transaction and are automatically purged at transaction commit or rollback.

---

## 2. SQL Helper Functions (`rls_auth` Schema)

All reusable RLS predicates are encapsulated within a dedicated `rls_auth` schema to prevent naming collisions and decouple policy logic from underlying table schemas.

### `rls_auth.uid() -> uuid`
Reads `app.current_user_id`, converts empty strings to `NULL`, and casts to `uuid`. Catches exceptions if the value is malformed.

### `rls_auth.user_email() -> text`
Reads `app.current_user_email`, returning the trimmed email address or `NULL` when unset.

### `rls_auth.is_admin() -> boolean`
Evaluates whether `app.is_admin` is set to `'true'`. Returns `false` by default.

### `rls_auth.is_org_member(target_org_id uuid) -> boolean`
Executed with `SECURITY DEFINER` to avoid infinite recursion when querying the `member` table. Checks whether the current user (`rls_auth.uid()`) holds an active membership record in `target_org_id`.

### `rls_auth.has_org_role(target_org_id uuid, allowed_roles text[]) -> boolean`
Executed with `SECURITY DEFINER`. Evaluates whether the current user belongs to `target_org_id` and possesses one of the roles specified in `allowed_roles` (e.g., `ARRAY['owner', 'admin']`).

---

## 3. Granular Table Policies

Row-Level Security is enabled on all core tables:

### 3.1 Organization (`organization`)
- **SELECT**: Accessible by platform admins or active members (`rls_auth.is_org_member(id)`).
- **INSERT**: Permitted for any authenticated user (`rls_auth.uid() IS NOT NULL`) or platform admin.
- **UPDATE**: Restricted to platform admins and organization `owner` or `admin`.
- **DELETE**: Restricted to platform admins and organization `owner`.

### 3.2 Member (`member`)
- **SELECT**: Permitted if the user is an admin or a member of the same organization.
- **INSERT**: Permitted for admins, existing organization owners/admins, or self-registration when joining.
- **UPDATE**: Owners can update any member; admins can update non-owner members.
- **DELETE**: Owners can delete members; members can leave (delete self) unless they are the sole owner.

### 3.3 Invitation (`invitation`)
- **SELECT**: Accessible by admins, organization owners/admins, or recipients whose email matches `rls_auth.user_email()`.
- **INSERT**: Restricted to organization owners and admins.
- **UPDATE**: Owners/admins can manage invitations; invitees can update status to `accepted` or `rejected`.
- **DELETE**: Restricted to organization owners and admins.

### 3.4 Item (`item` - Hybrid Personal & Multi-Tenant Model)
- **SELECT**:
  - Personal items: accessible only by the creator (`organization_id IS NULL AND user_id = rls_auth.uid()`).
  - Organization items: accessible by any active organization member (`rls_auth.is_org_member(organization_id)`).
  - Platform admins can view all items.
- **INSERT**: Allowed when `user_id` matches the authenticated caller and either `organization_id` is null or caller is a member.
- **UPDATE / DELETE**: Allowed for personal items by the owner. Allowed for organization items by the creator or organization owners/admins.

### 3.5 Notification (`notification`)
- **ALL**: Strictly isolated to recipient (`user_id = rls_auth.uid()`) or platform admins.

### 3.6 User (`user`)
- **SELECT**: Visible to self, platform admins, or members who share an organization membership.
- **INSERT**: Open for registration (`true`).
- **UPDATE / DELETE**: Strictly limited to self or platform admins.

### 3.7 Authentication Secrets (`user_session`, `account`, `two_factor`, `passkey`)
- **ALL**: Strictly limited to `user_id = rls_auth.uid()`. Cross-user inspection is prohibited at the database engine level.

### 3.8 Reference Catalogs (`country`, `timezone`)
- **SELECT**: Public read for all authenticated and unauthenticated queries.
- **WRITE**: Restricted to platform admins.

---

## 4. Protecting New Tables: 3-Step Guide

Follow these three steps whenever introducing a new table to the schema:

### Step 1: Enable Row-Level Security
In your Prisma migration SQL file:
```sql
ALTER TABLE "my_new_table" ENABLE ROW LEVEL SECURITY;
```

### Step 2: Define Policies Using `rls_auth`
Create declarative policies specifying `USING` (for reads, updates, deletes) and `WITH CHECK` (for inserts and updates):
```sql
CREATE POLICY my_new_table_select_policy ON "my_new_table"
  FOR SELECT USING (
    rls_auth.is_admin()
    OR (organization_id IS NOT NULL AND rls_auth.is_org_member(organization_id))
    OR (organization_id IS NULL AND user_id = rls_auth.uid())
  );

CREATE POLICY my_new_table_insert_policy ON "my_new_table"
  FOR INSERT WITH CHECK (
    user_id = rls_auth.uid()
    AND (organization_id IS NULL OR rls_auth.is_org_member(organization_id))
  );
```

### Step 3: Grant Privileges to the Scoped Application Role
Ensure `monorepo_app` has operational permissions on the table:
```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "my_new_table" TO monorepo_app;
```

---

## 5. Troubleshooting & Operational Guide

### Application-Level vs. Administrative Connection Strings

In `apps/api/.env`, two connection strings are configured:
```bash
# Application connection string (RLS strictly enforced via monorepo_app role)
# DATABASE_URL=postgresql://monorepo_app:monorepo_app_secret@localhost:5432/app_template_db?schema=public

# Administrative / Superuser connection string (Bypass RLS for CLI, Migrations, Seeds & Tests)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/app_template_db?schema=public
```

### Diagnosing Issues

1. **Query Returns Zero Rows Unexpectedly**
   - Check if RLS is enabled on the table:
     ```sql
     SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'item';
     ```
   - Verify whether session variables are set in the active transaction:
     ```sql
     SELECT current_setting('app.current_user_id', true);
     ```
   - Ensure the transaction is running under `SET LOCAL ROLE monorepo_app` and wrapped in `withRLS()`.

2. **Permission Denied for Relation**
   - The `monorepo_app` role may be missing table grants. Run:
     ```sql
     GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "public" TO monorepo_app;
     GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA "public" TO monorepo_app;
     ```

3. **Running CLI Diagnostics Without RLS Restraints**
   - When running administrative data repairs or offline CLI tasks, ensure `DATABASE_URL` uses the superuser role (`postgres` / `root`).
