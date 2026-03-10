ALTER TABLE public.form_templates ADD COLUMN show_fill_pass boolean NOT NULL DEFAULT false;
ALTER TABLE public.form_templates ADD COLUMN show_fill_fail boolean NOT NULL DEFAULT false;