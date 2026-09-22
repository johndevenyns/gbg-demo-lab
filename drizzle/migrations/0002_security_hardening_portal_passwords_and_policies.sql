-- 1. pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 2. Hash portal_users.password on write
CREATE OR REPLACE FUNCTION public.hash_portal_user_password()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NEW.password IS NOT NULL AND NEW.password <> '' AND NEW.password NOT LIKE '$2%' THEN
    NEW.password := extensions.crypt(NEW.password, extensions.gen_salt('bf'));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS hash_portal_user_password ON public.portal_users;
CREATE TRIGGER hash_portal_user_password
BEFORE INSERT OR UPDATE OF password ON public.portal_users
FOR EACH ROW EXECUTE FUNCTION public.hash_portal_user_password();

-- Backfill existing plaintext passwords
UPDATE public.portal_users
SET password = extensions.crypt(password, extensions.gen_salt('bf'))
WHERE password IS NOT NULL AND password <> '' AND password NOT LIKE '$2%';

-- 3. Compare hashed passwords on login
CREATE OR REPLACE FUNCTION public.validate_portal_login(_email text, _password text, _demo_id uuid)
RETURNS TABLE(user_id uuid, email text, display_name text, is_default boolean, profile_data jsonb, verification_status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
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

  IF _password IS NULL OR v_user.password IS NULL THEN
    RETURN;
  END IF;

  IF extensions.crypt(_password, v_user.password) <> v_user.password THEN
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

-- 4. Lock down SECURITY DEFINER function execution
REVOKE ALL ON FUNCTION public.validate_portal_login(text, text, uuid) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_portal_users_anon_writes() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.hash_portal_user_password() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.is_global_admin(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.bootstrap_first_admin(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_global_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_first_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- 5. global_settings: admins only for full read
DROP POLICY IF EXISTS "Authenticated can view all global settings" ON public.global_settings;
CREATE POLICY "Admins can view all global settings"
ON public.global_settings
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- 6. Constrain anonymous portal activity log inserts
DROP POLICY IF EXISTS "Anon can insert portal activity logs" ON public.portal_activity_logs;
CREATE POLICY "Anon can insert portal activity logs"
ON public.portal_activity_logs
FOR INSERT
TO anon
WITH CHECK (
  demo_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.demo_environments d WHERE d.id = demo_id)
  AND (portal_user_id IS NULL OR EXISTS (SELECT 1 FROM public.portal_users p WHERE p.id = portal_user_id))
  AND (use_case_id IS NULL OR EXISTS (SELECT 1 FROM public.global_use_cases g WHERE g.id = use_case_id))
  AND action IN (
    'login', 'registration',
    'verification_started', 'verification_completed', 'verification_failed',
    'use_case_started', 'use_case_completed', 'form_submitted'
  )
  AND (portal_user_email IS NULL OR length(portal_user_email) <= 255)
  AND (demo_name IS NULL OR length(demo_name) <= 255)
  AND (use_case_title IS NULL OR length(use_case_title) <= 255)
  AND (verification_type IS NULL OR length(verification_type) <= 64)
  AND (verification_result IS NULL OR length(verification_result) <= 64)
  AND (details IS NULL OR length(details::text) <= 8000)
);