-- Fix RLS policies on demo_environments table
-- The policies were created as RESTRICTIVE instead of PERMISSIVE
-- Note: policy names have trailing spaces

-- Drop existing restrictive policies (with exact names including trailing spaces)
DROP POLICY IF EXISTS "Anyone can delete demos " ON public.demo_environments;
DROP POLICY IF EXISTS "Anyone can insert demos " ON public.demo_environments;
DROP POLICY IF EXISTS "Anyone can update demos " ON public.demo_environments;
DROP POLICY IF EXISTS "Anyone can view active demos " ON public.demo_environments;

-- Also drop without trailing spaces just in case
DROP POLICY IF EXISTS "Anyone can delete demos" ON public.demo_environments;
DROP POLICY IF EXISTS "Anyone can insert demos" ON public.demo_environments;
DROP POLICY IF EXISTS "Anyone can update demos" ON public.demo_environments;
DROP POLICY IF EXISTS "Anyone can view active demos" ON public.demo_environments;

-- Create proper PERMISSIVE policies
CREATE POLICY "allow_select_active_demos"
  ON public.demo_environments
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "allow_insert_demos"
  ON public.demo_environments
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "allow_update_demos"
  ON public.demo_environments
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "allow_delete_demos"
  ON public.demo_environments
  FOR DELETE
  USING (true);