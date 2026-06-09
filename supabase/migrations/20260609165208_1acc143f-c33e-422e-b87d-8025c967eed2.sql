REVOKE SELECT (stored_test_data, created_by_email) ON public.demo_environments FROM anon;
DROP POLICY IF EXISTS "allow_select_active_demos" ON public.demo_environments;

DROP POLICY IF EXISTS "Public can read demo users for login" ON public.demo_users;

DROP POLICY IF EXISTS "Anyone can view global settings" ON public.global_settings;
CREATE POLICY "Public can view safe global settings"
ON public.global_settings
FOR SELECT
TO anon, authenticated
USING (key = 'default_landing_heading');
CREATE POLICY "Authenticated can view all global settings"
ON public.global_settings
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Public can view assignments" ON public.portal_user_demo_assignments;

DROP POLICY IF EXISTS "Anon can insert portal users for registration" ON public.portal_users;
DROP POLICY IF EXISTS "Anon can update verification status only" ON public.portal_users;