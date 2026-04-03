
-- Allow all admins to manage invitation_templates
DROP POLICY IF EXISTS "Global admins can insert invitation templates" ON public.invitation_templates;
DROP POLICY IF EXISTS "Global admins can update invitation templates" ON public.invitation_templates;
DROP POLICY IF EXISTS "Global admins can delete invitation templates" ON public.invitation_templates;

CREATE POLICY "Admins can insert invitation templates"
ON public.invitation_templates FOR INSERT TO authenticated
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update invitation templates"
ON public.invitation_templates FOR UPDATE TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete invitation templates"
ON public.invitation_templates FOR DELETE TO authenticated
USING (is_admin(auth.uid()));

-- Allow all admins to manage global_settings (used for registration codes)
DROP POLICY IF EXISTS "Global admins can insert global settings" ON public.global_settings;
DROP POLICY IF EXISTS "Global admins can update global settings" ON public.global_settings;
DROP POLICY IF EXISTS "Global admins can delete global settings" ON public.global_settings;

CREATE POLICY "Admins can insert global settings"
ON public.global_settings FOR INSERT TO authenticated
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update global settings"
ON public.global_settings FOR UPDATE TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete global settings"
ON public.global_settings FOR DELETE TO authenticated
USING (is_admin(auth.uid()));
