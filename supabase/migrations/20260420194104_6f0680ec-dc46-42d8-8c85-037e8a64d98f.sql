
-- Force-revoke broad table-level privileges that overshadowed the column grants,
-- then re-grant only the safe columns.
REVOKE ALL ON TABLE public.portal_users FROM anon;

GRANT SELECT (
  id, email, display_name, is_active, is_default, is_super, profile_data,
  registration_code, registration_code_expires_at, verification_status,
  created_at, updated_at, created_by
) ON public.portal_users TO anon;

GRANT INSERT ON public.portal_users TO anon;     -- self-registration policy still gates rows
GRANT UPDATE (verification_status) ON public.portal_users TO anon;
