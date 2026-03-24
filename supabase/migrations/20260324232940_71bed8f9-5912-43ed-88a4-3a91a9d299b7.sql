
ALTER TABLE public.portal_users
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'unverified';

COMMENT ON COLUMN public.portal_users.verification_status IS 'Tracks verification state: unverified, verified, failed';
