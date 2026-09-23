DROP POLICY "Authenticated users can view invitation templates" ON public.invitation_templates;
CREATE POLICY "Admins can view invitation templates"
ON public.invitation_templates
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));