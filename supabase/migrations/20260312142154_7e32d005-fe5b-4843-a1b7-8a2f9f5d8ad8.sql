
UPDATE public.global_use_cases 
SET default_page_content = jsonb_set(
  COALESCE(default_page_content, '{}'::jsonb),
  '{tabLabel}',
  '"Sign In"'
)
WHERE title = 'Log into Account';

UPDATE public.global_use_cases 
SET default_page_content = jsonb_set(
  COALESCE(default_page_content, '{}'::jsonb),
  '{tabLabel}',
  '"Code"'
)
WHERE title = 'Skip the Counter';

UPDATE public.global_use_cases 
SET default_page_content = jsonb_set(
  COALESCE(default_page_content, '{}'::jsonb),
  '{tabLabel}',
  '"Join"'
)
WHERE title = 'Customer Onboarding';
