ALTER TABLE public.global_use_cases
  ADD COLUMN show_fill_pass boolean NOT NULL DEFAULT false,
  ADD COLUMN show_fill_fail boolean NOT NULL DEFAULT false;