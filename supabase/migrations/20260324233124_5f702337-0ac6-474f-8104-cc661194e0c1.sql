
-- Allow anonymous users to insert portal users (for demo registration flows)
CREATE POLICY "Anon can insert portal users for registration"
ON public.portal_users
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow anonymous users to update verification_status and profile_data
CREATE POLICY "Anon can update portal users for verification"
ON public.portal_users
FOR UPDATE
TO anon
USING (is_active = true)
WITH CHECK (is_active = true);

-- Allow anonymous users to insert demo assignments
CREATE POLICY "Anon can insert demo assignments"
ON public.portal_user_demo_assignments
FOR INSERT
TO anon
WITH CHECK (true);
