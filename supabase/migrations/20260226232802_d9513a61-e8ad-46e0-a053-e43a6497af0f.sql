
-- Remove the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Anyone can read admin resource ids for resolution" ON public.admin_resource_ids;

-- Replace with a policy restricted to authenticated users
CREATE POLICY "Authenticated users can read admin resource ids for resolution"
ON public.admin_resource_ids
FOR SELECT
TO authenticated
USING (true);
