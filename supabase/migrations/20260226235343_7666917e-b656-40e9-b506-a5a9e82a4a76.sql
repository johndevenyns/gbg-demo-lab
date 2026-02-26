
-- Helper functions
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'global_admin')
  )
$$;

CREATE OR REPLACE FUNCTION public.is_global_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'global_admin'
  )
$$;

-- Update bootstrap to assign global_admin
CREATE OR REPLACE FUNCTION public.bootstrap_first_admin(target_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role IN ('admin', 'global_admin')) THEN
    RAISE EXCEPTION 'Admin users already exist. Use the admin interface to add more admins.';
  END IF;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, 'global_admin');
  RETURN true;
END;
$function$;

-- verification_type_configs: global_admin only for writes
DROP POLICY IF EXISTS "Admins can manage verification types" ON public.verification_type_configs;
CREATE POLICY "Global admins can manage verification types"
ON public.verification_type_configs FOR ALL TO authenticated
USING (is_global_admin(auth.uid()))
WITH CHECK (is_global_admin(auth.uid()));

-- mdl_providers: global_admin only for writes
DROP POLICY IF EXISTS "Admins can manage providers" ON public.mdl_providers;
CREATE POLICY "Global admins can manage providers"
ON public.mdl_providers FOR ALL TO authenticated
USING (is_global_admin(auth.uid()))
WITH CHECK (is_global_admin(auth.uid()));

-- global_field_configs: global_admin only for writes
DROP POLICY IF EXISTS "Admins can delete field configs" ON public.global_field_configs;
DROP POLICY IF EXISTS "Admins can insert field configs" ON public.global_field_configs;
DROP POLICY IF EXISTS "Admins can update field configs" ON public.global_field_configs;

CREATE POLICY "Global admins can insert field configs"
ON public.global_field_configs FOR INSERT TO authenticated
WITH CHECK (is_global_admin(auth.uid()));

CREATE POLICY "Global admins can update field configs"
ON public.global_field_configs FOR UPDATE TO authenticated
USING (is_global_admin(auth.uid()));

CREATE POLICY "Global admins can delete field configs"
ON public.global_field_configs FOR DELETE TO authenticated
USING (is_global_admin(auth.uid()));

-- form_templates: global_admin writes, keep public SELECT
DROP POLICY IF EXISTS "Anyone can create templates" ON public.form_templates;
DROP POLICY IF EXISTS "Anyone can update templates" ON public.form_templates;
DROP POLICY IF EXISTS "Anyone can delete templates" ON public.form_templates;

CREATE POLICY "Global admins can create templates"
ON public.form_templates FOR INSERT TO authenticated
WITH CHECK (is_global_admin(auth.uid()));

CREATE POLICY "Global admins can update templates"
ON public.form_templates FOR UPDATE TO authenticated
USING (is_global_admin(auth.uid()));

CREATE POLICY "Global admins can delete templates"
ON public.form_templates FOR DELETE TO authenticated
USING (is_global_admin(auth.uid()));

-- user_roles: global_admin only
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;

CREATE POLICY "Global admins can view all roles"
ON public.user_roles FOR SELECT TO authenticated
USING (is_global_admin(auth.uid()));

CREATE POLICY "Global admins can insert roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (is_global_admin(auth.uid()));

CREATE POLICY "Global admins can delete roles"
ON public.user_roles FOR DELETE TO authenticated
USING (is_global_admin(auth.uid()));

-- admin_resource_ids: any admin can manage own
DROP POLICY IF EXISTS "Admins can delete own resource ids" ON public.admin_resource_ids;
DROP POLICY IF EXISTS "Admins can insert own resource ids" ON public.admin_resource_ids;
DROP POLICY IF EXISTS "Admins can update own resource ids" ON public.admin_resource_ids;
DROP POLICY IF EXISTS "Admins can view all admin resource ids" ON public.admin_resource_ids;
DROP POLICY IF EXISTS "Authenticated users can read admin resource ids for resolution" ON public.admin_resource_ids;

CREATE POLICY "Admins can read all resource ids"
ON public.admin_resource_ids FOR SELECT TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert own resource ids"
ON public.admin_resource_ids FOR INSERT TO authenticated
WITH CHECK (auth.uid() = admin_user_id AND is_admin(auth.uid()));

CREATE POLICY "Admins can update own resource ids"
ON public.admin_resource_ids FOR UPDATE TO authenticated
USING (auth.uid() = admin_user_id AND is_admin(auth.uid()));

CREATE POLICY "Admins can delete own resource ids"
ON public.admin_resource_ids FOR DELETE TO authenticated
USING (auth.uid() = admin_user_id AND is_admin(auth.uid()));

-- demo_environments: any admin can manage, public can view active
DROP POLICY IF EXISTS "admins_can_view_all_demos" ON public.demo_environments;
DROP POLICY IF EXISTS "allow_delete_demos" ON public.demo_environments;
DROP POLICY IF EXISTS "allow_insert_demos" ON public.demo_environments;
DROP POLICY IF EXISTS "allow_update_demos" ON public.demo_environments;

CREATE POLICY "Admins can view all demos"
ON public.demo_environments FOR SELECT TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert demos"
ON public.demo_environments FOR INSERT TO authenticated
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update demos"
ON public.demo_environments FOR UPDATE TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete demos"
ON public.demo_environments FOR DELETE TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "Public can view active demos"
ON public.demo_environments FOR SELECT
USING (is_active = true);

-- test_user_profiles: any admin can manage
DROP POLICY IF EXISTS "Anyone can delete test profiles" ON public.test_user_profiles;
DROP POLICY IF EXISTS "Anyone can insert test profiles" ON public.test_user_profiles;
DROP POLICY IF EXISTS "Anyone can update test profiles" ON public.test_user_profiles;
DROP POLICY IF EXISTS "Anyone can view test profiles" ON public.test_user_profiles;

CREATE POLICY "Admins can view test profiles"
ON public.test_user_profiles FOR SELECT TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert test profiles"
ON public.test_user_profiles FOR INSERT TO authenticated
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update test profiles"
ON public.test_user_profiles FOR UPDATE TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete test profiles"
ON public.test_user_profiles FOR DELETE TO authenticated
USING (is_admin(auth.uid()));
