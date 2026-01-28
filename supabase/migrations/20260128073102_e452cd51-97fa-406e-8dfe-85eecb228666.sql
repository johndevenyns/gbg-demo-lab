ALTER TABLE public.demo_environments
ADD COLUMN IF NOT EXISTS stored_test_data jsonb NULL;

COMMENT ON COLUMN public.demo_environments.stored_test_data IS 'Stores pass/fail test data and visibility flags for Fill Pass/Fill Fail buttons.';