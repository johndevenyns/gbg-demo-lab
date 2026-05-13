
-- 1. Rename table mdl_providers -> did_providers
ALTER TABLE IF EXISTS public.mdl_providers RENAME TO did_providers;

-- Rename trigger
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_mdl_providers_updated_at') THEN
    ALTER TRIGGER update_mdl_providers_updated_at ON public.did_providers RENAME TO update_did_providers_updated_at;
  END IF;
END $$;

-- Rename policies
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='did_providers' AND policyname='Anyone can view enabled providers') THEN
    -- already named generically, no rename needed
    NULL;
  END IF;
END $$;

-- 2. Update verification_type_configs: 'mdl' -> 'did'
UPDATE public.verification_type_configs
SET type_key = 'did',
    display_name = CASE WHEN display_name ILIKE '%mdl%' OR display_name ILIKE '%mobile driver%' THEN 'Digital ID' ELSE display_name END,
    description = CASE WHEN description ILIKE '%mobile driver%' OR description ILIKE '%mdl%' THEN 'Digital ID verification' ELSE description END
WHERE type_key = 'mdl';

-- Also update default_resource_id mappings if any reference (no-op safe)

-- 3. Update default_verification_type wherever it equals 'mdl'
UPDATE public.global_use_cases SET default_verification_type = 'did' WHERE default_verification_type = 'mdl';
UPDATE public.demo_use_case_links SET verification_type_override = 'did' WHERE verification_type_override = 'mdl';

-- 4. Rename global_settings keys
UPDATE public.global_settings SET key = 'did_launch_html' WHERE key = 'mdl_launch_html';
UPDATE public.global_settings SET key = 'did_redirect_html' WHERE key = 'mdl_redirect_html';

-- 5. Replace 'mdl' with 'did' inside saved jsonb form steps
-- We replace specific JSON token patterns to avoid clobbering unrelated text.
UPDATE public.demo_environments
SET form_steps = REPLACE(REPLACE(REPLACE(REPLACE(form_steps::text,
  '"verificationType":"mdl"', '"verificationType":"did"'),
  '"pathType":"mdl"', '"pathType":"did"'),
  '"typeKey":"mdl"', '"typeKey":"did"'),
  '"verificationPath":"mdl"', '"verificationPath":"did"')::jsonb
WHERE form_steps::text LIKE '%"mdl"%';

UPDATE public.demo_use_case_links
SET form_steps_override = REPLACE(REPLACE(REPLACE(REPLACE(form_steps_override::text,
  '"verificationType":"mdl"', '"verificationType":"did"'),
  '"pathType":"mdl"', '"pathType":"did"'),
  '"typeKey":"mdl"', '"typeKey":"did"'),
  '"verificationPath":"mdl"', '"verificationPath":"did"')::jsonb
WHERE form_steps_override IS NOT NULL AND form_steps_override::text LIKE '%"mdl"%';

UPDATE public.global_use_cases
SET default_form_steps = REPLACE(REPLACE(REPLACE(REPLACE(default_form_steps::text,
  '"verificationType":"mdl"', '"verificationType":"did"'),
  '"pathType":"mdl"', '"pathType":"did"'),
  '"typeKey":"mdl"', '"typeKey":"did"'),
  '"verificationPath":"mdl"', '"verificationPath":"did"')::jsonb
WHERE default_form_steps::text LIKE '%"mdl"%';

UPDATE public.form_templates
SET form_steps = REPLACE(REPLACE(REPLACE(REPLACE(form_steps::text,
  '"verificationType":"mdl"', '"verificationType":"did"'),
  '"pathType":"mdl"', '"pathType":"did"'),
  '"typeKey":"mdl"', '"typeKey":"did"'),
  '"verificationPath":"mdl"', '"verificationPath":"did"')::jsonb
WHERE form_steps::text LIKE '%"mdl"%';
