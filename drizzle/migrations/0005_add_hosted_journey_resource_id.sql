ALTER TABLE public.demo_environments
ADD COLUMN resource_id_hosted_journey TEXT;

COMMENT ON COLUMN public.demo_environments.resource_id_hosted_journey IS
'Demo-level GBG GO hosted journey Resource ID override; falls back to admin and global verification settings.';