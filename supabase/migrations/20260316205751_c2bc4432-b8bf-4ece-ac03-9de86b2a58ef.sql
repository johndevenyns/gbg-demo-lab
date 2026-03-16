
-- Create industries table (top-level entity)
CREATE TABLE public.industries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  icon_name text DEFAULT 'Building2',
  portal_type text DEFAULT 'none',
  display_order integer NOT NULL DEFAULT 0,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.industries ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can view enabled industries" ON public.industries FOR SELECT TO public USING (is_enabled = true);
CREATE POLICY "Admins can view all industries" ON public.industries FOR SELECT TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Global admins can insert industries" ON public.industries FOR INSERT TO authenticated WITH CHECK (is_global_admin(auth.uid()));
CREATE POLICY "Global admins can update industries" ON public.industries FOR UPDATE TO authenticated USING (is_global_admin(auth.uid()));
CREATE POLICY "Global admins can delete industries" ON public.industries FOR DELETE TO authenticated USING (is_global_admin(auth.uid()));

-- Add industry_id to global_use_cases
ALTER TABLE public.global_use_cases ADD COLUMN industry_id uuid REFERENCES public.industries(id) ON DELETE SET NULL;

-- Add industry_id to demo_environments
ALTER TABLE public.demo_environments ADD COLUMN industry_id uuid REFERENCES public.industries(id) ON DELETE SET NULL;

-- Seed default industries based on existing PORTAL_TYPE_OPTIONS
INSERT INTO public.industries (title, description, icon_name, portal_type, display_order) VALUES
  ('Banking', 'Online banking, account management, and financial services', 'Landmark', 'banking', 0),
  ('Rental Car', 'Car rental management and vehicle services', 'Car', 'rental_car', 1),
  ('Retail', 'Retail account and loyalty program management', 'ShoppingBag', 'retail', 2),
  ('Insurance', 'Insurance policy management and claims', 'Shield', 'insurance', 3),
  ('Healthcare', 'Patient portal and health services', 'Heart', 'healthcare', 4);
