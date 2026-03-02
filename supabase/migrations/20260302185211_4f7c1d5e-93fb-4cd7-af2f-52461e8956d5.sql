
-- Create demo_use_cases table
CREATE TABLE public.demo_use_cases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  demo_id UUID NOT NULL REFERENCES public.demo_environments(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  icon_name TEXT DEFAULT 'Package',
  display_order INTEGER NOT NULL DEFAULT 0,
  entry_method TEXT NOT NULL DEFAULT 'direct_selection',
  access_code TEXT,
  page_content JSONB DEFAULT '{}'::jsonb,
  form_step_overrides JSONB,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  industry_template TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.demo_use_cases ENABLE ROW LEVEL SECURITY;

-- Public can view use cases for active demos
CREATE POLICY "Public can view enabled use cases"
ON public.demo_use_cases
FOR SELECT
USING (
  is_enabled = true
  AND EXISTS (
    SELECT 1 FROM public.demo_environments
    WHERE id = demo_id AND is_active = true
  )
);

-- Admins can view all
CREATE POLICY "Admins can view all use cases"
ON public.demo_use_cases
FOR SELECT
USING (is_admin(auth.uid()));

-- Admins can insert
CREATE POLICY "Admins can insert use cases"
ON public.demo_use_cases
FOR INSERT
WITH CHECK (is_admin(auth.uid()));

-- Admins can update
CREATE POLICY "Admins can update use cases"
ON public.demo_use_cases
FOR UPDATE
USING (is_admin(auth.uid()));

-- Admins can delete
CREATE POLICY "Admins can delete use cases"
ON public.demo_use_cases
FOR DELETE
USING (is_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_demo_use_cases_updated_at
BEFORE UPDATE ON public.demo_use_cases
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for fast lookup by demo
CREATE INDEX idx_demo_use_cases_demo_id ON public.demo_use_cases(demo_id);
