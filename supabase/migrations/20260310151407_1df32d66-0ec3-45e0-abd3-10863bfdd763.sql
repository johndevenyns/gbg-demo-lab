
-- Step 1: Create global_use_cases table
CREATE TABLE public.global_use_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  icon_name text DEFAULT 'Package',
  default_form_steps jsonb DEFAULT '[]'::jsonb,
  default_verification_type text DEFAULT 'docBio',
  default_page_content jsonb DEFAULT '{}'::jsonb,
  display_order integer NOT NULL DEFAULT 0,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Step 2: Create demo_use_case_links table
CREATE TABLE public.demo_use_case_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demo_id uuid NOT NULL REFERENCES public.demo_environments(id) ON DELETE CASCADE,
  use_case_id uuid NOT NULL REFERENCES public.global_use_cases(id) ON DELETE CASCADE,
  is_enabled boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  form_steps_override jsonb,
  verification_type_override text,
  page_content_override jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(demo_id, use_case_id)
);

-- Step 3: Enable RLS
ALTER TABLE public.global_use_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_use_case_links ENABLE ROW LEVEL SECURITY;

-- Step 4: RLS for global_use_cases
CREATE POLICY "Anyone can view enabled global use cases"
  ON public.global_use_cases FOR SELECT TO public
  USING (is_enabled = true);

CREATE POLICY "Admins can view all global use cases"
  ON public.global_use_cases FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Global admins can insert global use cases"
  ON public.global_use_cases FOR INSERT TO authenticated
  WITH CHECK (is_global_admin(auth.uid()));

CREATE POLICY "Global admins can update global use cases"
  ON public.global_use_cases FOR UPDATE TO authenticated
  USING (is_global_admin(auth.uid()));

CREATE POLICY "Global admins can delete global use cases"
  ON public.global_use_cases FOR DELETE TO authenticated
  USING (is_global_admin(auth.uid()));

-- Step 5: RLS for demo_use_case_links
CREATE POLICY "Public can view enabled links for active demos"
  ON public.demo_use_case_links FOR SELECT TO public
  USING (
    is_enabled = true AND
    EXISTS (
      SELECT 1 FROM demo_environments
      WHERE demo_environments.id = demo_use_case_links.demo_id
        AND demo_environments.is_active = true
    )
  );

CREATE POLICY "Admins can view all links"
  ON public.demo_use_case_links FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert links"
  ON public.demo_use_case_links FOR INSERT TO authenticated
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update links"
  ON public.demo_use_case_links FOR UPDATE TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete links"
  ON public.demo_use_case_links FOR DELETE TO authenticated
  USING (is_admin(auth.uid()));

-- Step 6: Drop old demo_use_cases table
DROP TABLE IF EXISTS public.demo_use_cases CASCADE;

-- Step 7: Seed the two initial global use cases
INSERT INTO public.global_use_cases (title, description, icon_name, display_order, default_verification_type, default_page_content)
VALUES
  (
    'Customer Onboarding',
    'New customer identity verification during account opening or registration.',
    'UserPlus',
    0,
    'docBio',
    '{"heroTitle": "Welcome! Let''s get you set up.", "heroSubtitle": "Complete your identity verification to open your account.", "ctaLabel": "Verify My Identity", "ctaDescription": "This process takes about 2 minutes and requires a valid government-issued ID."}'::jsonb
  ),
  (
    'Skip the Counter',
    'Expedite in-person service by completing identity verification ahead of time.',
    'FastForward',
    1,
    'docBio',
    '{"heroTitle": "Skip the Wait", "heroSubtitle": "Verify your identity now and breeze through when you arrive.", "ctaLabel": "Start Verification", "ctaDescription": "Pre-verify online to save time at the counter."}'::jsonb
  );
