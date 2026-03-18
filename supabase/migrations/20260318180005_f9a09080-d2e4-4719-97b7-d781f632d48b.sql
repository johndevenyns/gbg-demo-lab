ALTER TABLE public.global_use_cases DROP CONSTRAINT IF EXISTS global_use_cases_industry_id_fkey;
ALTER TABLE public.global_use_cases DROP COLUMN IF EXISTS industry_id;