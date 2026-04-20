
-- =====================================================================
-- SECURITY FIXES — minimal lockdown (no full refactor)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) portal_users: remove broad anon SELECT (which exposed password column)
--    and replace with a SECURITY INVOKER view that omits the password.
--    Add a SECURITY DEFINER helper for password validation used by the
--    new edge function only.
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view active portal users" ON public.portal_users;
DROP POLICY IF EXISTS "Anon can update portal users for verification" ON public.portal_users;

-- Safe public view (no password, no created_by). Demo flow uses this for reads.
CREATE OR REPLACE VIEW public.portal_users_public
WITH (security_invoker = on) AS
SELECT
  id,
  email,
  display_name,
  is_active,
  is_default,
  is_super,
  profile_data,
  registration_code,
  registration_code_expires_at,
  verification_status,
  created_at,
  updated_at
FROM public.portal_users
WHERE is_active = true;

GRANT SELECT ON public.portal_users_public TO anon, authenticated;

-- Allow anon to read non-sensitive columns through the view by re-adding a
-- restricted base SELECT that only matches when accessed via the view's
-- security_invoker context. Simpler: re-add a row-only SELECT but make sure
-- application code never selects `password`. To enforce at the DB layer we
-- revoke column SELECT on `password` from anon.
GRANT SELECT (
  id, email, display_name, is_active, is_default, is_super, profile_data,
  registration_code, registration_code_expires_at, verification_status,
  created_at, updated_at, created_by
) ON public.portal_users TO anon;
-- Explicitly DO NOT grant SELECT on the `password` column to anon.
REVOKE SELECT (password) ON public.portal_users FROM anon;

-- Re-add a row-restricted SELECT policy so anon can read active rows
-- (column-level grants above keep `password` invisible to anon).
CREATE POLICY "Public can view active portal user fields"
ON public.portal_users
FOR SELECT
TO anon
USING (is_active = true);

-- Narrow anon UPDATE to verification_status only (and only on active rows).
-- Use column-level GRANT to enforce which columns anon may write.
REVOKE UPDATE ON public.portal_users FROM anon;
GRANT UPDATE (verification_status) ON public.portal_users TO anon;

CREATE POLICY "Anon can update verification status only"
ON public.portal_users
FOR UPDATE
TO anon
USING (is_active = true)
WITH CHECK (is_active = true);

-- Server-side password validator used by new edge function only.
-- Returns the user id when password matches and the user has access to demo,
-- otherwise null. Never exposes the password value.
CREATE OR REPLACE FUNCTION public.validate_portal_login(
  _email text,
  _password text,
  _demo_id uuid
)
RETURNS TABLE (
  user_id uuid,
  email text,
  display_name text,
  is_default boolean,
  profile_data jsonb,
  verification_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user record;
BEGIN
  SELECT pu.* INTO v_user
  FROM public.portal_users pu
  WHERE lower(pu.email) = lower(_email)
    AND pu.is_active = true
  LIMIT 1;

  IF v_user IS NULL THEN
    RETURN;
  END IF;

  IF v_user.password <> _password THEN
    RETURN;
  END IF;

  IF NOT v_user.is_default THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.portal_user_demo_assignments
      WHERE portal_user_id = v_user.id AND demo_id = _demo_id
    ) THEN
      RETURN;
    END IF;
  END IF;

  RETURN QUERY SELECT
    v_user.id,
    v_user.email,
    v_user.display_name,
    v_user.is_default,
    v_user.profile_data,
    v_user.verification_status;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_portal_login(text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_portal_login(text, text, uuid) TO service_role;

-- ---------------------------------------------------------------------
-- 2) portal_user_demo_assignments: remove anon-arbitrary INSERT.
--    Public SELECT can stay (no PII; just join keys), but tighten anon INSERT.
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Anon can insert demo assignments" ON public.portal_user_demo_assignments;

-- Keep "Public can view assignments" — it only contains UUID join keys, used
-- by the credit-card matcher in the demo flow. (Read-only is acceptable.)

-- ---------------------------------------------------------------------
-- 3) Storage: restrict demo-logos writes to admins only.
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete logos" ON storage.objects;

CREATE POLICY "Admins can upload demo logos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'demo-logos' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can update demo logos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'demo-logos' AND public.is_admin(auth.uid()))
WITH CHECK (bucket_id = 'demo-logos' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete demo logos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'demo-logos' AND public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------
-- 4) Realtime: stop broadcasting sensitive log tables.
-- ---------------------------------------------------------------------
ALTER PUBLICATION supabase_realtime DROP TABLE public.admin_audit_logs;
ALTER PUBLICATION supabase_realtime DROP TABLE public.portal_activity_logs;

-- ---------------------------------------------------------------------
-- 5) Bootstrap function: stop leaking whether admins exist.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bootstrap_first_admin(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role IN ('admin', 'global_admin')) THEN
    RETURN false;
  END IF;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, 'global_admin');
  RETURN true;
END;
$$;
