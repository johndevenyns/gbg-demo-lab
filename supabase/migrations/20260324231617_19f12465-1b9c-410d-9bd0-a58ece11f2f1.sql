
-- Add missing columns to portal_users to support all demo_users features
ALTER TABLE public.portal_users
  ADD COLUMN IF NOT EXISTS registration_code TEXT,
  ADD COLUMN IF NOT EXISTS registration_code_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_super BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_by UUID;

-- Migrate existing demo_users into portal_users (skip duplicates by email)
INSERT INTO public.portal_users (email, password, profile_data, is_active, is_super, registration_code, registration_code_expires_at, created_by, created_at, updated_at)
SELECT DISTINCT ON (du.email)
  du.email,
  du.password,
  du.profile_data,
  du.is_active,
  du.is_super,
  du.registration_code,
  du.registration_code_expires_at,
  du.created_by,
  du.created_at,
  du.updated_at
FROM public.demo_users du
WHERE NOT EXISTS (SELECT 1 FROM public.portal_users pu WHERE pu.email = du.email)
ORDER BY du.email, du.created_at ASC;

-- Create demo assignments for migrated users
INSERT INTO public.portal_user_demo_assignments (portal_user_id, demo_id)
SELECT pu.id, du.demo_id
FROM public.demo_users du
JOIN public.portal_users pu ON pu.email = du.email
ON CONFLICT (portal_user_id, demo_id) DO NOTHING;

-- For super users, mark them as default (access all demos)
UPDATE public.portal_users SET is_default = true WHERE is_super = true;
