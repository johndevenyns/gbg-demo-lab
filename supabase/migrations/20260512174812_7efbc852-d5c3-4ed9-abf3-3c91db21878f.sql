DROP POLICY IF EXISTS "Public can view active portal user fields" ON public.portal_users;

GRANT SELECT ON public.portal_users_public TO anon, authenticated;

DROP POLICY IF EXISTS "Anon can insert portal users for registration" ON public.portal_users;
CREATE POLICY "Anon can insert portal users for registration"
ON public.portal_users
FOR INSERT
TO anon
WITH CHECK (
  COALESCE(is_super, false) = false
  AND COALESCE(is_default, false) = false
  AND COALESCE(is_active, true) = true
);

DROP POLICY IF EXISTS "Anon can update verification status only" ON public.portal_users;
CREATE POLICY "Anon can update verification status only"
ON public.portal_users
FOR UPDATE
TO anon
USING (is_active = true)
WITH CHECK (
  is_active = true
  AND COALESCE(is_super, false) = false
  AND COALESCE(is_default, false) = false
);

CREATE OR REPLACE FUNCTION public.guard_portal_users_anon_writes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'anon' THEN
    IF TG_OP = 'UPDATE' THEN
      IF NEW.password IS DISTINCT FROM OLD.password
        OR NEW.email IS DISTINCT FROM OLD.email
        OR NEW.registration_code IS DISTINCT FROM OLD.registration_code
        OR NEW.registration_code_expires_at IS DISTINCT FROM OLD.registration_code_expires_at
        OR COALESCE(NEW.is_super, false) IS DISTINCT FROM COALESCE(OLD.is_super, false)
        OR COALESCE(NEW.is_default, false) IS DISTINCT FROM COALESCE(OLD.is_default, false)
      THEN
        RAISE EXCEPTION 'Anonymous users cannot modify protected portal_user columns';
      END IF;
    ELSIF TG_OP = 'INSERT' THEN
      IF COALESCE(NEW.is_super, false) OR COALESCE(NEW.is_default, false) THEN
        RAISE EXCEPTION 'Anonymous users cannot create privileged portal users';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_portal_users_anon_writes ON public.portal_users;
CREATE TRIGGER guard_portal_users_anon_writes
BEFORE INSERT OR UPDATE ON public.portal_users
FOR EACH ROW EXECUTE FUNCTION public.guard_portal_users_anon_writes();

DROP POLICY IF EXISTS "Anyone can view invitation templates" ON public.invitation_templates;
CREATE POLICY "Authenticated users can view invitation templates"
ON public.invitation_templates
FOR SELECT
TO authenticated
USING (true);