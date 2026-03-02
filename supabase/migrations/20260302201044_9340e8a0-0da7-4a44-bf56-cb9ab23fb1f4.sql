
-- Add is_default column to demo_use_cases
ALTER TABLE public.demo_use_cases ADD COLUMN is_default boolean NOT NULL DEFAULT false;

-- Ensure only one default per demo using a partial unique index
CREATE UNIQUE INDEX idx_demo_use_cases_one_default 
  ON public.demo_use_cases (demo_id) 
  WHERE is_default = true;
