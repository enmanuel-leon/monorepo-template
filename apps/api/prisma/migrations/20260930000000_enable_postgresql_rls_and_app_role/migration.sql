-- ==============================================================================
-- 1. DATABASE ROLE SEGREGATION (Scoped Application Role)
-- ==============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'monorepo_app') THEN
    CREATE ROLE monorepo_app WITH LOGIN PASSWORD 'monorepo_app_secret'
      NOSUPERUSER
      NOCREATEDB
      NOCREATEROLE
      NOBYPASSRLS;
  END IF;
END $$;

-- Scope privileges strictly to schema 'public'
REVOKE ALL ON SCHEMA "public" FROM PUBLIC;
GRANT USAGE ON SCHEMA "public" TO monorepo_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "public" TO monorepo_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA "public" GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO monorepo_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA "public" TO monorepo_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA "public" GRANT USAGE, SELECT ON SEQUENCES TO monorepo_app;

-- ==============================================================================
-- 2. HELPER SCHEMA & REUSABLE FUNCTIONS (rls_auth)
-- ==============================================================================
CREATE SCHEMA IF NOT EXISTS rls_auth;
GRANT USAGE ON SCHEMA rls_auth TO monorepo_app;

-- Current User ID
CREATE OR REPLACE FUNCTION rls_auth.uid() RETURNS uuid AS $$
BEGIN
  RETURN NULLIF(current_setting('app.current_user_id', true), '')::uuid;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Current User Email
CREATE OR REPLACE FUNCTION rls_auth.user_email() RETURNS text AS $$
BEGIN
  RETURN NULLIF(current_setting('app.current_user_email', true), '');
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Platform Admin Check
CREATE OR REPLACE FUNCTION rls_auth.is_admin() RETURNS boolean AS $$
BEGIN
  RETURN coalesce(current_setting('app.is_admin', true), 'false') = 'true';
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Organization Membership Check (SECURITY DEFINER avoids recursion on member table)
CREATE OR REPLACE FUNCTION rls_auth.is_org_member(target_org_id uuid) RETURNS boolean AS $$
DECLARE
  v_uid uuid;
BEGIN
  v_uid := rls_auth.uid();
  IF v_uid IS NULL OR target_org_id IS NULL THEN
    RETURN false;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.member
    WHERE organization_id = target_org_id
      AND user_id = v_uid
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Organization Role Check (owner / admin / member)
CREATE OR REPLACE FUNCTION rls_auth.has_org_role(target_org_id uuid, allowed_roles text[]) RETURNS boolean AS $$
DECLARE
  v_uid uuid;
BEGIN
  v_uid := rls_auth.uid();
  IF v_uid IS NULL OR target_org_id IS NULL THEN
    RETURN false;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.member
    WHERE organization_id = target_org_id
      AND user_id = v_uid
      AND role = ANY(allowed_roles)
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA rls_auth TO monorepo_app;

-- ==============================================================================
-- 3. ENABLE ROW LEVEL SECURITY ON TARGET TABLES
-- ==============================================================================
ALTER TABLE "organization" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "member" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "invitation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "item" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "two_factor" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "passkey" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "verification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "country" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "timezone" ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 4. POLICIES: organization
-- ==============================================================================
DROP POLICY IF EXISTS organization_select_policy ON "organization";
CREATE POLICY organization_select_policy ON "organization"
  FOR SELECT USING (
    rls_auth.is_admin() OR rls_auth.is_org_member(id)
  );

DROP POLICY IF EXISTS organization_insert_policy ON "organization";
CREATE POLICY organization_insert_policy ON "organization"
  FOR INSERT WITH CHECK (
    rls_auth.is_admin() OR rls_auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS organization_update_policy ON "organization";
CREATE POLICY organization_update_policy ON "organization"
  FOR UPDATE USING (
    rls_auth.is_admin() OR rls_auth.has_org_role(id, ARRAY['owner', 'admin'])
  );

DROP POLICY IF EXISTS organization_delete_policy ON "organization";
CREATE POLICY organization_delete_policy ON "organization"
  FOR DELETE USING (
    rls_auth.is_admin() OR rls_auth.has_org_role(id, ARRAY['owner'])
  );

-- ==============================================================================
-- 5. POLICIES: member
-- ==============================================================================
DROP POLICY IF EXISTS member_select_policy ON "member";
CREATE POLICY member_select_policy ON "member"
  FOR SELECT USING (
    rls_auth.is_admin() OR rls_auth.is_org_member(organization_id)
  );

DROP POLICY IF EXISTS member_insert_policy ON "member";
CREATE POLICY member_insert_policy ON "member"
  FOR INSERT WITH CHECK (
    rls_auth.is_admin()
    OR rls_auth.has_org_role(organization_id, ARRAY['owner', 'admin'])
    OR user_id = rls_auth.uid()
  );

DROP POLICY IF EXISTS member_update_policy ON "member";
CREATE POLICY member_update_policy ON "member"
  FOR UPDATE USING (
    rls_auth.is_admin()
    OR rls_auth.has_org_role(organization_id, ARRAY['owner'])
    OR (rls_auth.has_org_role(organization_id, ARRAY['admin']) AND role != 'owner')
  );

DROP POLICY IF EXISTS member_delete_policy ON "member";
CREATE POLICY member_delete_policy ON "member"
  FOR DELETE USING (
    rls_auth.is_admin()
    OR (user_id = rls_auth.uid() AND role != 'owner')
    OR rls_auth.has_org_role(organization_id, ARRAY['owner'])
  );

-- ==============================================================================
-- 6. POLICIES: invitation
-- ==============================================================================
DROP POLICY IF EXISTS invitation_select_policy ON "invitation";
CREATE POLICY invitation_select_policy ON "invitation"
  FOR SELECT USING (
    rls_auth.is_admin()
    OR rls_auth.has_org_role(organization_id, ARRAY['owner', 'admin'])
    OR lower(email) = lower(rls_auth.user_email())
  );

DROP POLICY IF EXISTS invitation_insert_policy ON "invitation";
CREATE POLICY invitation_insert_policy ON "invitation"
  FOR INSERT WITH CHECK (
    rls_auth.is_admin() OR rls_auth.has_org_role(organization_id, ARRAY['owner', 'admin'])
  );

DROP POLICY IF EXISTS invitation_update_policy ON "invitation";
CREATE POLICY invitation_update_policy ON "invitation"
  FOR UPDATE USING (
    rls_auth.is_admin()
    OR rls_auth.has_org_role(organization_id, ARRAY['owner', 'admin'])
    OR (lower(email) = lower(rls_auth.user_email()) AND status IN ('accepted', 'rejected'))
  );

DROP POLICY IF EXISTS invitation_delete_policy ON "invitation";
CREATE POLICY invitation_delete_policy ON "invitation"
  FOR DELETE USING (
    rls_auth.is_admin() OR rls_auth.has_org_role(organization_id, ARRAY['owner', 'admin'])
  );

-- ==============================================================================
-- 7. POLICIES: item (Personal & Organization Hybrid)
-- ==============================================================================
DROP POLICY IF EXISTS item_select_policy ON "item";
CREATE POLICY item_select_policy ON "item"
  FOR SELECT USING (
    rls_auth.is_admin()
    OR (organization_id IS NULL AND user_id = rls_auth.uid())
    OR (organization_id IS NOT NULL AND rls_auth.is_org_member(organization_id))
  );

DROP POLICY IF EXISTS item_insert_policy ON "item";
CREATE POLICY item_insert_policy ON "item"
  FOR INSERT WITH CHECK (
    user_id = rls_auth.uid()
    AND (organization_id IS NULL OR rls_auth.is_org_member(organization_id))
  );

DROP POLICY IF EXISTS item_update_policy ON "item";
CREATE POLICY item_update_policy ON "item"
  FOR UPDATE USING (
    rls_auth.is_admin()
    OR (organization_id IS NULL AND user_id = rls_auth.uid())
    OR (organization_id IS NOT NULL AND (user_id = rls_auth.uid() OR rls_auth.has_org_role(organization_id, ARRAY['owner', 'admin'])))
  );

DROP POLICY IF EXISTS item_delete_policy ON "item";
CREATE POLICY item_delete_policy ON "item"
  FOR DELETE USING (
    rls_auth.is_admin()
    OR (organization_id IS NULL AND user_id = rls_auth.uid())
    OR (organization_id IS NOT NULL AND (user_id = rls_auth.uid() OR rls_auth.has_org_role(organization_id, ARRAY['owner', 'admin'])))
  );

-- ==============================================================================
-- 8. POLICIES: notification (Strict Recipient Isolation)
-- ==============================================================================
DROP POLICY IF EXISTS notification_all_policy ON "notification";
CREATE POLICY notification_all_policy ON "notification"
  FOR ALL USING (
    rls_auth.is_admin() OR user_id = rls_auth.uid()
  ) WITH CHECK (
    rls_auth.is_admin() OR user_id = rls_auth.uid()
  );

-- ==============================================================================
-- 9. POLICIES: user (Profile Visibility)
-- ==============================================================================
DROP POLICY IF EXISTS user_select_policy ON "user";
CREATE POLICY user_select_policy ON "user"
  FOR SELECT USING (
    rls_auth.is_admin()
    OR id = rls_auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.member m1
      JOIN public.member m2 ON m1.organization_id = m2.organization_id
      WHERE m1.user_id = rls_auth.uid()
        AND m2.user_id = public."user".id
    )
  );

DROP POLICY IF EXISTS user_insert_policy ON "user";
CREATE POLICY user_insert_policy ON "user"
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS user_update_policy ON "user";
CREATE POLICY user_update_policy ON "user"
  FOR UPDATE USING (
    rls_auth.is_admin() OR id = rls_auth.uid()
  );

DROP POLICY IF EXISTS user_delete_policy ON "user";
CREATE POLICY user_delete_policy ON "user"
  FOR DELETE USING (
    rls_auth.is_admin() OR id = rls_auth.uid()
  );

-- ==============================================================================
-- 10. POLICIES: Authentication Secrets (user_session, account, two_factor, passkey)
-- ==============================================================================
DROP POLICY IF EXISTS user_session_policy ON "user_session";
CREATE POLICY user_session_policy ON "user_session"
  FOR ALL USING (user_id = rls_auth.uid()) WITH CHECK (user_id = rls_auth.uid());

DROP POLICY IF EXISTS account_policy ON "account";
CREATE POLICY account_policy ON "account"
  FOR ALL USING (user_id = rls_auth.uid()) WITH CHECK (user_id = rls_auth.uid());

DROP POLICY IF EXISTS two_factor_policy ON "two_factor";
CREATE POLICY two_factor_policy ON "two_factor"
  FOR ALL USING (user_id = rls_auth.uid()) WITH CHECK (user_id = rls_auth.uid());

DROP POLICY IF EXISTS passkey_policy ON "passkey";
CREATE POLICY passkey_policy ON "passkey"
  FOR ALL USING (user_id = rls_auth.uid()) WITH CHECK (user_id = rls_auth.uid());

-- Verification tokens (Better Auth Email OTP lookup)
DROP POLICY IF EXISTS verification_policy ON "verification";
CREATE POLICY verification_policy ON "verification"
  FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- 11. POLICIES: Reference Catalogs (country, timezone)
-- ==============================================================================
DROP POLICY IF EXISTS country_select_policy ON "country";
CREATE POLICY country_select_policy ON "country" FOR SELECT USING (true);
DROP POLICY IF EXISTS country_write_policy ON "country";
CREATE POLICY country_write_policy ON "country"
  FOR ALL USING (rls_auth.is_admin()) WITH CHECK (rls_auth.is_admin());

DROP POLICY IF EXISTS timezone_select_policy ON "timezone";
CREATE POLICY timezone_select_policy ON "timezone" FOR SELECT USING (true);
DROP POLICY IF EXISTS timezone_write_policy ON "timezone";
CREATE POLICY timezone_write_policy ON "timezone"
  FOR ALL USING (rls_auth.is_admin()) WITH CHECK (rls_auth.is_admin());
