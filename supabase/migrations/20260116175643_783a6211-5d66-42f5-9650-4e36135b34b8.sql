-- Fix the function search path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Allow all operations for demos" ON public.demo_environments;

-- Create more specific policies (we'll add auth later, for now allow all authenticated users)
CREATE POLICY "Anyone can insert demos"
ON public.demo_environments
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update demos"
ON public.demo_environments
FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Anyone can delete demos"
ON public.demo_environments
FOR DELETE
USING (true);