
ALTER TABLE public.global_use_cases ADD COLUMN portal_type text DEFAULT NULL;
ALTER TABLE public.demo_use_case_links ADD COLUMN portal_type_override text DEFAULT NULL;
