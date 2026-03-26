ALTER TABLE public.demo_use_case_links
  ADD COLUMN show_fill_pass boolean DEFAULT NULL,
  ADD COLUMN show_fill_fail boolean DEFAULT NULL;