DROP POLICY IF EXISTS "Anon can insert portal activity logs" ON public.portal_activity_logs;
CREATE POLICY "Anon can insert portal activity logs"
ON public.portal_activity_logs
FOR INSERT
TO anon
WITH CHECK (
  demo_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.demo_environments d WHERE d.id = demo_id)
  AND action IN (
    'login', 'registration',
    'verification_started', 'verification_completed', 'verification_failed',
    'use_case_started', 'use_case_completed', 'form_submitted'
  )
  AND (portal_user_email IS NULL OR length(portal_user_email) <= 255)
  AND (demo_name IS NULL OR length(demo_name) <= 255)
  AND (use_case_title IS NULL OR length(use_case_title) <= 255)
  AND (verification_type IS NULL OR length(verification_type) <= 64)
  AND (verification_result IS NULL OR length(verification_result) <= 64)
  AND (details IS NULL OR length(details::text) <= 8000)
);