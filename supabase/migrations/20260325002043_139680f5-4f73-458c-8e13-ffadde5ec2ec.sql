
CREATE TABLE public.demo_header_cta_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demo_id uuid NOT NULL REFERENCES public.demo_environments(id) ON DELETE CASCADE,
  css_selector text NOT NULL,
  use_case_id uuid NOT NULL REFERENCES public.global_use_cases(id) ON DELETE CASCADE,
  element_label text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.demo_header_cta_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view header cta links" ON public.demo_header_cta_links FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can insert header cta links" ON public.demo_header_cta_links FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update header cta links" ON public.demo_header_cta_links FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete header cta links" ON public.demo_header_cta_links FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Public can view cta links for active demos" ON public.demo_header_cta_links FOR SELECT TO anon USING (
  EXISTS (SELECT 1 FROM public.demo_environments WHERE id = demo_header_cta_links.demo_id AND is_active = true)
);

-- Migrate existing single CTA link data
INSERT INTO public.demo_header_cta_links (demo_id, css_selector, use_case_id, display_order)
SELECT id, header_cta_selector, header_cta_use_case_id, 0
FROM public.demo_environments
WHERE header_cta_selector IS NOT NULL AND header_cta_selector != '' AND header_cta_use_case_id IS NOT NULL;
