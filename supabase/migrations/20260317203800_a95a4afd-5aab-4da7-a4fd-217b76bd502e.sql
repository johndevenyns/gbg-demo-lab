
-- Create portal_types table managed by global admins
CREATE TABLE public.portal_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type_key text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  icon_name text DEFAULT 'Monitor',
  is_enabled boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.portal_types ENABLE ROW LEVEL SECURITY;

-- Anyone can view enabled portal types (needed for wizard/preview)
CREATE POLICY "Anyone can view enabled portal types"
  ON public.portal_types FOR SELECT TO public
  USING (is_enabled = true);

-- Admins can view all
CREATE POLICY "Admins can view all portal types"
  ON public.portal_types FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

-- Global admins can manage
CREATE POLICY "Global admins can insert portal types"
  ON public.portal_types FOR INSERT TO authenticated
  WITH CHECK (is_global_admin(auth.uid()));

CREATE POLICY "Global admins can update portal types"
  ON public.portal_types FOR UPDATE TO authenticated
  USING (is_global_admin(auth.uid()));

CREATE POLICY "Global admins can delete portal types"
  ON public.portal_types FOR DELETE TO authenticated
  USING (is_global_admin(auth.uid()));

-- Add portal_type column to demo_environments
ALTER TABLE public.demo_environments
  ADD COLUMN portal_type text DEFAULT 'none';

-- Seed with the existing banking portal type
INSERT INTO public.portal_types (type_key, display_name, description, icon_name, display_order)
VALUES
  ('banking', 'Banking', 'Online banking dashboard with accounts & transactions', 'Landmark', 0);
