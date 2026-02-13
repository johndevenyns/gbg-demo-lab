
-- Allow admins to see ALL demos (active + inactive)
CREATE POLICY "admins_can_view_all_demos"
ON public.demo_environments
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));
